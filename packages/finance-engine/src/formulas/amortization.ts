/**
 * amortization.v1 — level-payment schedule for fixed-rate loans
 * (financial-calculation-spec.md §4.1, BR-CALC-002..008).
 *
 * BR-CALC-008 (final-period rounding absorption): the constant installment is
 * rounded once (HALF_UP 3dp) and used for every period except the last; the
 * final period's principal is forced to equal the exact remaining balance so
 * the schedule always closes to precisely zero, and the final payment
 * absorbs whatever rounding drift accumulated across periods 1..n-1.
 */
import Decimal from 'decimal.js'
import type { Rate } from '@eltizamati/domain'
import {
  Money,
  DomainInvariantError,
  addMonthsToLocalDate,
  type LocalDate,
} from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import type { ScheduleEntry, ScheduleTotals, DataConsistencyNotice } from '../types.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface AmortizationInputs {
  readonly principal?: Money
  readonly annualRate?: Rate
  readonly termMonths?: number
  readonly startDate?: LocalDate
  /** Known actual installment (e.g. from a statement) — triggers BR-CALC-017 consistency check. */
  readonly installmentOverride?: Money
  readonly asOf: LocalDate
}

export interface AmortizationResult {
  readonly asOf: LocalDate
  readonly schedule: readonly ScheduleEntry[]
  readonly totals: ScheduleTotals
  /** M computed from principal/rate/term, HALF_UP 3dp. */
  readonly computedInstallment: Money
  /** The installment actually used to build the schedule (override, if given). */
  readonly usedInstallment: Money
  readonly consistencyNotice?: DataConsistencyNotice
}

/** BR-CALC-017: >2% deviation between override and computed level payment. */
const CONSISTENCY_DEVIATION_THRESHOLD_PERCENT = '2'

export function amortization(inputs: AmortizationInputs): EngineOutcome<AmortizationResult> {
  const missing: FieldRef[] = []
  if (inputs.principal === undefined) missing.push({ field: 'principal' })
  if (inputs.annualRate === undefined) missing.push({ field: 'annualRate' })
  if (inputs.termMonths === undefined) missing.push({ field: 'termMonths' })
  if (inputs.startDate === undefined) missing.push({ field: 'startDate' })
  if (missing.length > 0) return refused(missing)

  const result = computeAmortizationSchedule(
    inputs.principal as Money,
    inputs.annualRate as Rate,
    inputs.termMonths as number,
    inputs.startDate as LocalDate,
    inputs.asOf,
    inputs.installmentOverride,
  )

  return engineOk(result, 'high', FORMULA_ASSUMPTIONS.amortization)
}

/**
 * Pure closed-form schedule builder. Callers needing BR-CALC-016 refusal
 * semantics should go through `amortization()` instead — this assumes every
 * required input is already present.
 */
export function computeAmortizationSchedule(
  principal: Money,
  annualRate: Rate,
  termMonths: number,
  startDate: LocalDate,
  asOf: LocalDate,
  installmentOverride?: Money,
): AmortizationResult {
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new DomainInvariantError(
      'validation',
      `amortization: termMonths must be a positive integer, got ${String(termMonths)}`,
    )
  }

  const currency = principal.currency
  const i = annualRate.periodicRate(12) // CONV-2, full precision

  const computedInstallment = i.isZero()
    ? principal.divideBy(termMonths).round()
    : levelPayment(principal, i, termMonths).round()

  const usedInstallment = installmentOverride ?? computedInstallment
  const consistencyNotice = buildConsistencyNotice(computedInstallment, installmentOverride)

  const schedule: ScheduleEntry[] = []
  let balance = principal

  for (let period = 1; period <= termMonths; period++) {
    const date = addMonthsToLocalDate(startDate, period)
    const cost = balance.multiplyBy(i.toString()).round()
    const isFinalPeriod = period === termMonths
    const payoffAmount = balance.add(cost)

    // BR-CALC-008's absorption is meant for the loan's OWN final period —
    // but with a long enough term and a small enough installment, per-period
    // 3dp rounding drift can exhaust the balance earlier than period n. Any
    // period whose level payment would meet or exceed the full payoff
    // amount closes the loan then, rather than letting the schedule run
    // past zero into a negative balance that a later "final period" would
    // then force even further negative.
    const closesThisPeriod =
      isFinalPeriod ||
      usedInstallment.isGreaterThan(payoffAmount) ||
      usedInstallment.equals(payoffAmount)

    const principalPaid = closesThisPeriod ? balance : usedInstallment.subtract(cost)
    const payment = closesThisPeriod ? payoffAmount : usedInstallment
    const closingBalance = closesThisPeriod ? Money.zero(currency) : balance.subtract(principalPaid)

    schedule.push({
      period,
      date,
      openingBalance: balance,
      payment,
      principal: principalPaid,
      cost,
      closingBalance,
    })

    balance = closingBalance
    if (closesThisPeriod) break
  }

  const totals = totalsFor(schedule, currency)

  return {
    asOf,
    schedule,
    totals,
    computedInstallment,
    usedInstallment,
    ...(consistencyNotice !== undefined ? { consistencyNotice } : {}),
  }
}

/** M = P·i / (1 − (1+i)^−n), full precision (BR-CALC-003: round only at the boundary). */
function levelPayment(principal: Money, i: Decimal, n: number): Money {
  const onePlusI = i.plus(1)
  const factor = onePlusI.pow(-n)
  const denominator = new Decimal(1).minus(factor)
  const paymentDecimal = principal.toDecimal().times(i).dividedBy(denominator)
  return Money.of(paymentDecimal.toFixed(), principal.currency)
}

function buildConsistencyNotice(
  computed: Money,
  override: Money | undefined,
): DataConsistencyNotice | undefined {
  if (override === undefined || computed.isZero()) return undefined
  const diff = override.subtract(computed).abs()
  const deviationPercent = diff.toDecimal().dividedBy(computed.toDecimal()).times(100)
  if (deviationPercent.lessThanOrEqualTo(CONSISTENCY_DEVIATION_THRESHOLD_PERCENT)) return undefined
  return {
    kind: 'dataConsistencyNotice',
    deviationPercent: deviationPercent.toFixed(4),
    thresholdPercent: CONSISTENCY_DEVIATION_THRESHOLD_PERCENT,
  }
}

export function totalsFor(schedule: readonly ScheduleEntry[], currency: string): ScheduleTotals {
  let totalPaid = Money.zero(currency)
  let totalCost = Money.zero(currency)
  let totalPrincipal = Money.zero(currency)
  for (const entry of schedule) {
    totalPaid = totalPaid.add(entry.payment)
    totalCost = totalCost.add(entry.cost)
    totalPrincipal = totalPrincipal.add(entry.principal)
  }
  return { totalPaid, totalCost, totalPrincipal }
}
