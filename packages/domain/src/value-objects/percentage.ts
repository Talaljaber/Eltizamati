/**
 * Percentage value object — decimal-safe general percentage values.
 *
 * Distinct from `Rate` (see money.ts): `Rate` represents an *annual financial
 * rate* used in interest/profit calculations. `Percentage` represents a
 * general percentage value with no annualization semantics — minimum-payment
 * percentages, credit-utilization ratios, progress ratios (domain-model.md §2).
 *
 * Formatting (e.g. "%" suffix, locale digits) is a `core/formatting` concern —
 * this VO never formats for display (AI_AGENT_RULES §5).
 *
 * DOC-ISSUE: no upper bound for a general Percentage is specified anywhere in
 * the doc set — utilization can legitimately exceed 100% (over-limit balance).
 * A generous sanity cap rejects obvious data-entry corruption without
 * foreclosing real over-limit values. See PHASE-02-DECISION-LOG.md §1.
 */
import Decimal from 'decimal.js'
import { DomainInvariantError } from '../errors/app-error.js'

/** Sanity upper bound — see the DOC-ISSUE above. Not a business threshold. */
const SANITY_MAX_PERCENT = 1000

export class Percentage {
  readonly #value: Decimal

  private constructor(value: Decimal) {
    this.#value = value
  }

  /**
   * From a decimal string or safe-integer number, e.g. `Percentage.of('3.5')` for 3.5%.
   * Rejects unsafe floating-point `number` input (mirrors `Money.of`/`Rate`).
   */
  static of(value: string | number): Percentage {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new DomainInvariantError(
        'validation',
        `Percentage.of: unsafe floating-point number ${String(value)} — use a decimal string`,
      )
    }
    const d = new Decimal(String(value))
    if (d.isNegative()) {
      throw new DomainInvariantError(
        'validation',
        `Percentage.of: must be non-negative: ${String(value)}`,
      )
    }
    if (d.greaterThan(SANITY_MAX_PERCENT)) {
      throw new DomainInvariantError(
        'validation',
        `Percentage.of: exceeds sanity bound of ${SANITY_MAX_PERCENT}: ${String(value)}`,
      )
    }
    return new Percentage(d)
  }

  static zero(): Percentage {
    return new Percentage(new Decimal(0))
  }

  /** As a fraction (e.g. 3.5% → 0.035) — for multiplying against a `Money`/`Decimal` base. */
  toDecimalFraction(): Decimal {
    return this.#value.dividedBy(100)
  }

  /** Canonical decimal-string storage form. Never use for display. */
  toStorageString(): string {
    return this.#value.toFixed()
  }

  isZero(): boolean {
    return this.#value.isZero()
  }

  equals(other: Percentage): boolean {
    return this.#value.equals(other.#value)
  }

  isGreaterThan(other: Percentage): boolean {
    return this.#value.greaterThan(other.#value)
  }

  isLessThan(other: Percentage): boolean {
    return this.#value.lessThan(other.#value)
  }

  toString(): string {
    return `${this.#value.toFixed()}%`
  }
}
