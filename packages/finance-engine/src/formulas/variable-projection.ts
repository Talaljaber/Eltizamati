/**
 * variableProjection.v1 — schedule across rate periods
 * (financial-calculation-spec.md §4.2, BR-CALC-011, CONV-2..4).
 *
 * Walks the loan period-by-period, switching to the active rate at each
 * period's start per CONV-4 ("applied from the first schedule period whose
 * start ≥ effectiveFrom" — a mid-period effective date takes effect at the
 * next period boundary, never retroactively or early).
 *
 * Installment behavior is policy-driven:
 *  - `recalculated`: the bank re-levels the payment at each rate boundary to
 *    keep the original maturity — the schedule always closes to exactly zero
 *    by construction (same BR-CALC-008 final-period absorption as
 *    amortization.v1, applied once, at the loan's final period).
 *  - `unchanged`: the installment never moves. A rate increase can produce
 *    negative amortization (BR-CALC-011 — flagged, never hidden) and a
 *    non-zero `projectedResidualAtMaturity`; a rate decrease can close the
 *    loan early (before `termMonths`).
 *  - `explicit`: known installment per period range (statements/user).
 */
import type { Rate } from '@eltizamati/domain'
import {
  Money,
  DomainInvariantError,
  addMonthsToLocalDate,
  validateRatePeriods,
  isAtOrBeforeLocalDate,
  type LocalDate,
  type RatePeriod,
} from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import type { ScheduleEntry, ScheduleTotals } from '../types.js'
import { totalsFor } from './amortization.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface ExplicitInstallmentEntry {
  readonly fromPeriod: number
  readonly installment: Money
}

export type InstallmentPolicy =
  | { readonly kind: 'recalculated' }
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'explicit'; readonly entries: readonly ExplicitInstallmentEntry[] }

export interface VariableProjectionInputs {
  readonly principal?: Money
  /** Non-superseded rate history, any order — sorted and validated internally. */
  readonly ratePeriods?: readonly RatePeriod[]
  readonly termMonths?: number
  readonly startDate?: LocalDate
  /** The currently known/contracted installment — the period-1 baseline for every policy. */
  readonly installment?: Money
  readonly installmentPolicy?: InstallmentPolicy
  readonly asOf: LocalDate
}

export interface VariableProjectionResult {
  readonly asOf: LocalDate
  readonly schedule: readonly ScheduleEntry[]
  readonly totals: ScheduleTotals
  readonly projectedResidualAtMaturity: Money
  /** Set when the loan pays off before `termMonths` (e.g. a rate decrease under `unchanged`). */
  readonly payoffPeriod?: number
  /** BR-CALC-011: periods where principal paid was negative — never hidden. */
  readonly negativeAmortizationPeriods: readonly number[]
  /** Balance at/nearest-before `asOf` — the full principal if `asOf` precedes the loan's start. */
  readonly outstandingAsOf: Money
  /** CONV-4: true when a rate period's effectiveFrom falls mid-period (deferred to the next boundary). */
  readonly hasMidPeriodEffectiveDate: boolean
}

export function variableProjection(
  inputs: VariableProjectionInputs,
): EngineOutcome<VariableProjectionResult> {
  const missing: FieldRef[] = []
  if (inputs.principal === undefined) missing.push({ field: 'principal' })
  if (inputs.ratePeriods === undefined || inputs.ratePeriods.length === 0) {
    missing.push({ field: 'ratePeriods' })
  }
  if (inputs.termMonths === undefined) missing.push({ field: 'termMonths' })
  if (inputs.startDate === undefined) missing.push({ field: 'startDate' })
  if (inputs.installment === undefined) missing.push({ field: 'installment' })
  if (inputs.installmentPolicy === undefined) missing.push({ field: 'installmentPolicy' })
  if (missing.length > 0) return refused(missing)

  const ratePeriods = inputs.ratePeriods as readonly RatePeriod[]
  const validation = validateRatePeriods(ratePeriods)
  if (!validation.ok) {
    return refused([{ field: 'ratePeriods', reason: 'gapsOrOverlaps' }])
  }

  const result = computeVariableProjection(
    inputs.principal as Money,
    ratePeriods,
    inputs.termMonths as number,
    inputs.startDate as LocalDate,
    inputs.installment as Money,
    inputs.installmentPolicy as InstallmentPolicy,
    inputs.asOf,
  )

  const assumptions: string[] = [...FORMULA_ASSUMPTIONS.variableProjection]
  if (result.hasMidPeriodEffectiveDate) {
    assumptions.push(
      'CONV-4: a rate change effective date fell mid-period — applied at the next period boundary',
    )
  }

  return engineOk(result, 'high', assumptions)
}

export function computeVariableProjection(
  principal: Money,
  ratePeriods: readonly RatePeriod[],
  termMonths: number,
  startDate: LocalDate,
  installment: Money,
  policy: InstallmentPolicy,
  asOf: LocalDate,
  /**
   * Optional extra principal reduction applied within the same period it
   * lands in (`extraPaymentScenario.v1`'s injection point — CONV note:
   * "assumes your bank applies extra payments to principal immediately").
   * Interest for the period still accrues on the pre-extra-payment opening
   * balance; only the effective installment (and hence principal/closure)
   * is augmented.
   */
  extraPaymentFor?: (period: number) => Money,
): VariableProjectionResult {
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new DomainInvariantError(
      'validation',
      `variableProjection: termMonths must be a positive integer, got ${String(termMonths)}`,
    )
  }

  const active = [...ratePeriods]
    .filter((p) => p.supersededBy === undefined)
    .sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
    )

  const periodStartDates: LocalDate[] = []
  for (let p = 1; p <= termMonths; p++) {
    periodStartDates.push(addMonthsToLocalDate(startDate, p - 1))
  }

  const hasMidPeriodEffectiveDate = active.some(
    (rp) => !periodStartDates.includes(rp.effectiveFrom),
  )

  function activeRateFor(periodIndex: number): Rate {
    const periodStart = periodStartDates[periodIndex - 1] as LocalDate
    let candidate: RatePeriod | undefined
    for (const rp of active) {
      if (isAtOrBeforeLocalDate(rp.effectiveFrom, periodStart)) {
        candidate = rp
      }
    }
    // active[0] always qualifies once its effectiveFrom is ≤ startDate's own
    // period start (BR-OBL-002: history must cover the loan's own start).
    return (candidate ?? (active[0] as RatePeriod)).annualRate
  }

  const currency = principal.currency
  const schedule: ScheduleEntry[] = []
  const negativeAmortizationPeriods: number[] = []
  let balance = principal
  let payoffPeriod: number | undefined

  for (let period = 1; period <= termMonths; period++) {
    const rate = activeRateFor(period)
    const i = rate.periodicRate(12)
    const isFinalPeriod = period === termMonths

    const baseInstallment = installmentFor(policy, period, installment)
    const extra = extraPaymentFor?.(period) ?? Money.zero(currency)
    const scheduledInstallment = extra.isZero() ? baseInstallment : baseInstallment.add(extra)
    const cost = balance.multiplyBy(i.toString()).round()
    const payoffAmount = balance.add(cost)

    const closesThisPeriod =
      scheduledInstallment.isGreaterThan(payoffAmount) || scheduledInstallment.equals(payoffAmount)

    if (closesThisPeriod) {
      const date = addMonthsToLocalDate(startDate, period)
      schedule.push({
        period,
        date,
        openingBalance: balance,
        payment: payoffAmount,
        principal: balance,
        cost,
        closingBalance: Money.zero(currency),
      })
      payoffPeriod = period
      balance = Money.zero(currency)
      break
    }

    // BR-CALC-008 final-period absorption — only for `recalculated`, which
    // by design fully amortizes; `unchanged`/`explicit` leave a genuine
    // residual and must never be forced to close.
    if (isFinalPeriod && policy.kind === 'recalculated') {
      const date = addMonthsToLocalDate(startDate, period)
      schedule.push({
        period,
        date,
        openingBalance: balance,
        payment: payoffAmount,
        principal: balance,
        cost,
        closingBalance: Money.zero(currency),
      })
      balance = Money.zero(currency)
      break
    }

    const principalPaid = scheduledInstallment.subtract(cost)
    if (principalPaid.isNegative()) negativeAmortizationPeriods.push(period)
    const closingBalance = balance.subtract(principalPaid)
    const date = addMonthsToLocalDate(startDate, period)

    schedule.push({
      period,
      date,
      openingBalance: balance,
      payment: scheduledInstallment,
      principal: principalPaid,
      cost,
      closingBalance,
    })

    balance = closingBalance

    // `recalculated`: re-level at the NEXT period if its active rate differs.
    if (policy.kind === 'recalculated' && period < termMonths) {
      const nextRate = activeRateFor(period + 1)
      if (!nextRate.equals(rate)) {
        const remainingPeriods = termMonths - period
        installment = levelPaymentFor(balance, nextRate, remainingPeriods)
      }
    }
  }

  const totals = totalsFor(schedule, currency)
  const lastEntry = schedule[schedule.length - 1]
  const projectedResidualAtMaturity =
    payoffPeriod !== undefined ? Money.zero(currency) : (lastEntry as ScheduleEntry).closingBalance

  const outstandingAsOf = computeOutstandingAsOf(schedule, principal, asOf)

  return {
    asOf,
    schedule,
    totals,
    projectedResidualAtMaturity,
    ...(payoffPeriod !== undefined ? { payoffPeriod } : {}),
    negativeAmortizationPeriods,
    outstandingAsOf,
    hasMidPeriodEffectiveDate,
  }
}

function installmentFor(policy: InstallmentPolicy, period: number, baseline: Money): Money {
  if (policy.kind === 'unchanged' || policy.kind === 'recalculated') return baseline
  let best: ExplicitInstallmentEntry | undefined
  for (const entry of policy.entries) {
    if (entry.fromPeriod <= period && (best === undefined || entry.fromPeriod > best.fromPeriod)) {
      best = entry
    }
  }
  return best?.installment ?? baseline
}

function levelPaymentFor(balance: Money, rate: Rate, remainingPeriods: number): Money {
  const i = rate.periodicRate(12)
  if (i.isZero()) return balance.divideBy(remainingPeriods).round()
  const onePlusI = i.plus(1)
  const factor = onePlusI.pow(-remainingPeriods)
  const denominator = factor.negated().plus(1)
  const paymentDecimal = balance.toDecimal().times(i).dividedBy(denominator)
  return Money.of(paymentDecimal.toFixed(), balance.currency).round()
}

function computeOutstandingAsOf(
  schedule: readonly ScheduleEntry[],
  principal: Money,
  asOf: LocalDate,
): Money {
  let result: Money | undefined
  for (const entry of schedule) {
    if (isAtOrBeforeLocalDate(entry.date, asOf)) {
      result = entry.closingBalance
    }
  }
  // If no entry's date is ≤ asOf, asOf precedes the loan's first period —
  // nothing has amortized yet, so the outstanding balance is the principal.
  // `schedule` always has ≥ 1 entry (every termMonths ≥ 1 walk produces one
  // before any early-payoff break), so this always resolves one way or the
  // other — there is no third case.
  return result ?? principal
}
