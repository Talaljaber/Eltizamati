/**
 * Money value object — decimal-safe monetary arithmetic for JOD (3 dp) and other currencies.
 *
 * Rules (AI_AGENT_RULES §5, NFR-MNT-003):
 *   - Never store or compute with JavaScript `number` for monetary values.
 *   - All arithmetic goes through this VO.
 *   - Rounding only at spec-defined boundaries (BR-CALC-003/004).
 *   - Formatting via core/formatting — NEVER toFixed() here.
 *
 * @module packages/domain/src/value-objects/money
 */
import Decimal from 'decimal.js'
import { DomainInvariantError } from '../errors/app-error.js'

// ─── Currency configuration ─────────────────────────────────────────────────

/** Supported currencies with their decimal places */
const CURRENCY_DECIMAL_PLACES: Record<string, number> = {
  JOD: 3, // ISO 4217: Jordanian Dinar, 3 decimal places (fils)
}

const DEFAULT_DECIMAL_PLACES = 2

function decimalPlacesFor(currency: string): number {
  return CURRENCY_DECIMAL_PLACES[currency] ?? DEFAULT_DECIMAL_PLACES
}

// ─── Money VO ──────────────────────────────────────────────────────────────

/**
 * Immutable monetary value object.
 * Currency is a plain ISO 4217 string — keep it simple, we only support JOD in MVP.
 */
export class Money {
  readonly #value: Decimal
  readonly currency: string

  private constructor(value: Decimal, currency: string) {
    this.#value = value
    this.currency = currency
  }

  /**
   * Primary constructor — from a canonical decimal string, or a safe-integer number
   * (e.g. `0` for a zero amount). Non-integer `number` input is rejected: JS floats
   * already lose precision before they reach this constructor (NFR-MNT-003) — always
   * pass a decimal string for fractional amounts.
   */
  static of(value: string | number, currency = 'JOD'): Money {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new DomainInvariantError(
        'validation',
        `Money.of: unsafe floating-point number ${String(value)} — use a decimal string`,
      )
    }
    return new Money(new Decimal(String(value)), currency)
  }

  /** Zero for a given currency. */
  static zero(currency = 'JOD'): Money {
    return new Money(new Decimal(0), currency)
  }

  // ─── Arithmetic ──────────────────────────────────────────────────────────

  /** @throws if currencies differ */
  add(other: Money): Money {
    this.#assertSameCurrency(other)
    return new Money(this.#value.plus(other.#value), this.currency)
  }

  /** @throws if currencies differ */
  subtract(other: Money): Money {
    this.#assertSameCurrency(other)
    return new Money(this.#value.minus(other.#value), this.currency)
  }

  /** Multiply by a scalar (e.g. interest rate × periods) */
  multiplyBy(scalar: string | number): Money {
    return new Money(this.#value.times(new Decimal(String(scalar))), this.currency)
  }

  /** Divide by a scalar. @throws on division by zero. */
  divideBy(scalar: string | number): Money {
    const s = new Decimal(String(scalar))
    if (s.isZero()) throw new DomainInvariantError('validation', 'Money.divideBy: division by zero')
    return new Money(this.#value.dividedBy(s), this.currency)
  }

  /** Negate (used for credits/reversals) */
  negate(): Money {
    return new Money(this.#value.negated(), this.currency)
  }

  /** Absolute value */
  abs(): Money {
    return new Money(this.#value.abs(), this.currency)
  }

  // ─── Rounding (call only at spec-defined boundaries) ─────────────────────

  /**
   * Round to the canonical decimal places for this currency.
   * JOD → 3 dp, HALF_UP per ASM-009.
   */
  round(): Money {
    const dp = decimalPlacesFor(this.currency)
    return new Money(this.#value.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP), this.currency)
  }

  /**
   * Round to whole units (for estimates displayed per BR-CALC-014).
   * Only call for estimate display — not for stored values.
   */
  roundToWhole(): Money {
    return new Money(this.#value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP), this.currency)
  }

  // ─── Comparisons ─────────────────────────────────────────────────────────

  isZero(): boolean {
    return this.#value.isZero()
  }

  isPositive(): boolean {
    return this.#value.isPositive() && !this.#value.isZero()
  }

  isNegative(): boolean {
    return this.#value.isNegative()
  }

  /** @throws if currencies differ */
  isGreaterThan(other: Money): boolean {
    this.#assertSameCurrency(other)
    return this.#value.greaterThan(other.#value)
  }

  /** @throws if currencies differ */
  isLessThan(other: Money): boolean {
    this.#assertSameCurrency(other)
    return this.#value.lessThan(other.#value)
  }

  /** @throws if currencies differ */
  equals(other: Money): boolean {
    this.#assertSameCurrency(other)
    return this.#value.equals(other.#value)
  }

  // ─── Serialisation (for storage as TEXT decimal string) ──────────────────

  /**
   * Returns the canonical decimal string for storage.
   * Never use for display — route through core/formatting.
   */
  toStorageString(): string {
    return this.#value.toFixed()
  }

  /**
   * Returns the Decimal value for engine computations.
   * Only finance-engine and domain services may call this.
   */
  toDecimal(): Decimal {
    return this.#value
  }

  toString(): string {
    return `${this.#value.toFixed()} ${this.currency}`
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  #assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainInvariantError(
        'validation',
        `Money: currency mismatch — ${this.currency} vs ${other.currency}`,
      )
    }
  }
}

// ─── Rate VO ───────────────────────────────────────────────────────────────

/**
 * Interest/profit rate value object.
 * Stored as an annual rate in decimal form (e.g. 0.0925 for 9.25%).
 * Display is percent (×100) — handled by formatters.
 */
export class Rate {
  readonly #value: Decimal

  private constructor(value: Decimal) {
    this.#value = value
  }

  /**
   * From a percentage string/number: e.g. Rate.fromPercent('9.25') → 0.0925 internal
   * Validated to [0, 100].
   */
  static fromPercent(percent: string | number): Rate {
    const d = new Decimal(String(percent))
    if (d.isNegative() || d.greaterThan(100)) {
      throw new DomainInvariantError(
        'validation',
        `Rate.fromPercent: out of range [0, 100]: ${String(percent)}`,
      )
    }
    return new Rate(d.dividedBy(100))
  }

  /** From a decimal form (e.g. 0.0925). Validated to [0, 1]. */
  static fromDecimal(value: string | number): Rate {
    const d = new Decimal(String(value))
    if (d.isNegative() || d.greaterThan(1)) {
      throw new DomainInvariantError(
        'validation',
        `Rate.fromDecimal: out of range [0, 1]: ${String(value)}`,
      )
    }
    return new Rate(d)
  }

  /** Periodic rate = annual / periods. Commonly annual / 12 for monthly. */
  periodicRate(periodsPerYear: number): Decimal {
    return this.#value.dividedBy(periodsPerYear)
  }

  /** As a percentage (for display, not computation). 2 dp per design-system §4. */
  toPercent(): Decimal {
    return this.#value.times(100)
  }

  /** Internal decimal form (for engine calculations). */
  toDecimal(): Decimal {
    return this.#value
  }

  /** Storage string — full precision decimal. */
  toStorageString(): string {
    return this.#value.toFixed()
  }

  equals(other: Rate): boolean {
    return this.#value.equals(other.#value)
  }

  toString(): string {
    return `${this.#value.times(100).toFixed(6)}%`
  }
}
