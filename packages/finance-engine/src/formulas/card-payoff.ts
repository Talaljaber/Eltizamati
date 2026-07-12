/**
 * cardPayoff.v1 — credit card payoff simulator (financial-calculation-spec.md
 * §4.6, FR-SIM-004).
 *
 * Monthly close: `charge_t = balance_{t-1} · APR/12` (ASM-011 — a daily-
 * accrual caveat is emitted as an assumption note since this model is
 * simpler than real daily accrual); payment is applied after the charge;
 * stops at balance ≤ 0 or `t = 600` (the 50-year cap — "effectively never"
 * pays off). `neverPaysOff` fires immediately when the first payment doesn't
 * even cover the first period's charge (FR-SIM-004's warning state) — the
 * minimum-only path is always computed as the baseline every other strategy
 * is compared against.
 */
import type { Rate } from '@eltizamati/domain'
import {
  Money,
  DomainInvariantError,
  resolveMinimumPaymentDue,
  type LocalDate,
  type MinimumPaymentRule,
} from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

const MAX_PERIODS = 600 // 50-year cap (financial-calculation-spec.md §4.6)

export interface CardPayoffInputs {
  readonly balance?: Money
  readonly annualRate?: Rate
  readonly minimumPaymentRule?: MinimumPaymentRule
  /** Optional fixed monthly payment path, compared against the minimum-only baseline. */
  readonly fixedPaymentAmount?: Money
  readonly asOf: LocalDate
}

export interface CardPayoffPath {
  readonly months: number
  readonly totalPaid: Money
  readonly totalCharges: Money
  readonly neverPaysOff: boolean
  readonly firstPeriodCharge: Money
}

export interface CardPayoffResult {
  readonly asOf: LocalDate
  readonly minimumOnly: CardPayoffPath
  readonly fixedPayment?: CardPayoffPath
}

export function cardPayoff(inputs: CardPayoffInputs): EngineOutcome<CardPayoffResult> {
  const missing: FieldRef[] = []
  if (inputs.balance === undefined) missing.push({ field: 'balance' })
  if (inputs.annualRate === undefined) missing.push({ field: 'annualRate' })
  if (inputs.minimumPaymentRule === undefined) {
    missing.push({ field: 'minimumPaymentRule' })
  } else if (inputs.minimumPaymentRule.type === 'unknown') {
    // BR-CALC-016 in spirit: `unknown` must never be silently treated as zero.
    missing.push({ field: 'minimumPaymentRule', reason: 'unknown' })
  }
  if (missing.length > 0) return refused(missing)

  const result = computeCardPayoff(
    inputs.balance as Money,
    inputs.annualRate as Rate,
    inputs.minimumPaymentRule as MinimumPaymentRule,
    inputs.asOf,
    inputs.fixedPaymentAmount,
  )

  return engineOk(result, 'high', [
    ...FORMULA_ASSUMPTIONS.cardPayoff,
    'minimum payment recomputed each period from the opening balance (statement-balance convention)',
  ])
}

export function computeCardPayoff(
  balance: Money,
  annualRate: Rate,
  minimumPaymentRule: MinimumPaymentRule,
  asOf: LocalDate,
  fixedPaymentAmount?: Money,
): CardPayoffResult {
  if (minimumPaymentRule.type === 'unknown') {
    throw new DomainInvariantError(
      'validation',
      'cardPayoff: minimumPaymentRule must be known — never invented (BR-CALC-016)',
    )
  }

  const minimumOnly = simulate(balance, annualRate, (b) => {
    const resolution = resolveMinimumPaymentDue(minimumPaymentRule, b)
    return resolution.kind === 'known' ? resolution.amount : Money.zero(b.currency)
  })

  const fixedPayment =
    fixedPaymentAmount !== undefined
      ? simulate(balance, annualRate, () => fixedPaymentAmount)
      : undefined

  return {
    asOf,
    minimumOnly,
    ...(fixedPayment !== undefined ? { fixedPayment } : {}),
  }
}

function simulate(
  startingBalance: Money,
  annualRate: Rate,
  paymentFor: (openingBalance: Money) => Money,
): CardPayoffPath {
  const currency = startingBalance.currency
  const i = annualRate.periodicRate(12)
  let balance = startingBalance
  let totalPaid = Money.zero(currency)
  let totalCharges = Money.zero(currency)
  let firstPeriodCharge: Money | undefined
  let payoffMonth: number | undefined

  for (let t = 1; t <= MAX_PERIODS; t++) {
    const charge = balance.multiplyBy(i.toString()).round()
    firstPeriodCharge ??= charge

    const payment = paymentFor(balance)

    if (t === 1 && !payment.isGreaterThan(charge)) {
      // First payment doesn't even cover the first charge — never pays off.
      return {
        months: MAX_PERIODS,
        totalPaid: Money.zero(currency),
        totalCharges: charge,
        neverPaysOff: true,
        firstPeriodCharge: charge,
      }
    }

    const owedAfterCharge = balance.add(charge)
    totalCharges = totalCharges.add(charge)

    if (!payment.isLessThan(owedAfterCharge)) {
      totalPaid = totalPaid.add(owedAfterCharge)
      payoffMonth = t
      balance = Money.zero(currency)
      break
    }

    totalPaid = totalPaid.add(payment)
    balance = owedAfterCharge.subtract(payment)
  }

  return {
    months: payoffMonth ?? MAX_PERIODS,
    totalPaid,
    totalCharges,
    neverPaysOff: payoffMonth === undefined,
    firstPeriodCharge: firstPeriodCharge as Money,
  }
}
