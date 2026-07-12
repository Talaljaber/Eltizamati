/**
 * extraPaymentScenario.v1 — payoff/cost impact of extra payments
 * (financial-calculation-spec.md §4.4, FR-SIM-001, INV-3).
 *
 * Runs the same period-by-period walk as `variableProjection.v1` twice —
 * once as the base case, once with the requested extra payments folded in
 * (`computeVariableProjection`'s `extraPaymentFor` injection point) — and
 * reports the deltas. INV-3: under identical assumptions, more payment
 * never lengthens payoff or increases total cost; this formula's own output
 * is exactly what that invariant is tested against.
 */
import { Money, DomainInvariantError, type LocalDate, type RatePeriod } from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import type { ScheduleEntry } from '../types.js'
import { computeVariableProjection, type InstallmentPolicy } from './variable-projection.js'
import { FORMULA_REGISTRY } from '../registry/formula-registry.js'

export interface OneTimeExtraPayment {
  readonly amount: Money
  readonly period: number
}

export interface ExtraPaymentScenarioInputs {
  readonly principal?: Money
  readonly ratePeriods?: readonly RatePeriod[]
  readonly termMonths?: number
  readonly startDate?: LocalDate
  readonly installment?: Money
  readonly installmentPolicy?: InstallmentPolicy
  readonly extraMonthly?: Money
  readonly oneTime?: OneTimeExtraPayment
  /** First period the extra payments apply from (default: 1). */
  readonly scenarioStartPeriod?: number
  readonly asOf: LocalDate
}

export interface ExtraPaymentScenarioResult {
  readonly asOf: LocalDate
  readonly baseSchedule: readonly ScheduleEntry[]
  readonly scenarioSchedule: readonly ScheduleEntry[]
  readonly basePayoffPeriod: number
  readonly scenarioPayoffPeriod: number
  /** INV-3: always ≥ 0. */
  readonly monthsSaved: number
  /** INV-3: always ≥ 0 (Money — never negative under this invariant). */
  readonly costSaved: Money
  readonly baseResidualAtMaturity: Money
  readonly scenarioResidualAtMaturity: Money
}

export function extraPaymentScenario(
  inputs: ExtraPaymentScenarioInputs,
): EngineOutcome<ExtraPaymentScenarioResult> {
  const missing: FieldRef[] = []
  if (inputs.principal === undefined) missing.push({ field: 'principal' })
  if (inputs.ratePeriods === undefined || inputs.ratePeriods.length === 0) {
    missing.push({ field: 'ratePeriods' })
  }
  if (inputs.termMonths === undefined) missing.push({ field: 'termMonths' })
  if (inputs.startDate === undefined) missing.push({ field: 'startDate' })
  if (inputs.installment === undefined) missing.push({ field: 'installment' })
  if (inputs.installmentPolicy === undefined) missing.push({ field: 'installmentPolicy' })
  if (inputs.extraMonthly === undefined && inputs.oneTime === undefined) {
    missing.push({
      field: 'extraMonthly|oneTime',
      reason: 'at least one extra payment is required',
    })
  }
  if (missing.length > 0) return refused(missing)

  const result = computeExtraPaymentScenario(
    inputs.principal as Money,
    inputs.ratePeriods as readonly RatePeriod[],
    inputs.termMonths as number,
    inputs.startDate as LocalDate,
    inputs.installment as Money,
    inputs.installmentPolicy as InstallmentPolicy,
    inputs.asOf,
    inputs.extraMonthly,
    inputs.oneTime,
    inputs.scenarioStartPeriod ?? 1,
  )

  const assumptions = [
    ...FORMULA_REGISTRY.extraPaymentScenario.assumptions,
    'assumes your bank applies extra payments to principal immediately — confirm with your lender',
  ]

  return engineOk(result, 'high', assumptions)
}

export function computeExtraPaymentScenario(
  principal: Money,
  ratePeriods: readonly RatePeriod[],
  termMonths: number,
  startDate: LocalDate,
  installment: Money,
  policy: InstallmentPolicy,
  asOf: LocalDate,
  extraMonthly: Money | undefined,
  oneTime: OneTimeExtraPayment | undefined,
  scenarioStartPeriod: number,
): ExtraPaymentScenarioResult {
  if (extraMonthly === undefined && oneTime === undefined) {
    throw new DomainInvariantError(
      'validation',
      'extraPaymentScenario: at least one of extraMonthly or oneTime is required',
    )
  }

  const currency = principal.currency

  const base = computeVariableProjection(
    principal,
    ratePeriods,
    termMonths,
    startDate,
    installment,
    policy,
    asOf,
  )

  function extraPaymentFor(period: number): Money {
    let amount = Money.zero(currency)
    if (extraMonthly !== undefined && period >= scenarioStartPeriod) {
      amount = amount.add(extraMonthly)
    }
    if (oneTime !== undefined && period === oneTime.period) {
      amount = amount.add(oneTime.amount)
    }
    return amount
  }

  const scenario = computeVariableProjection(
    principal,
    ratePeriods,
    termMonths,
    startDate,
    installment,
    policy,
    asOf,
    extraPaymentFor,
  )

  const basePayoffPeriod = base.payoffPeriod ?? base.schedule.length
  const scenarioPayoffPeriod = scenario.payoffPeriod ?? scenario.schedule.length
  const monthsSaved = Math.max(0, basePayoffPeriod - scenarioPayoffPeriod)

  const costSavedRaw = base.totals.totalCost.subtract(scenario.totals.totalCost)
  const costSaved = costSavedRaw.isNegative() ? Money.zero(currency) : costSavedRaw

  return {
    asOf,
    baseSchedule: base.schedule,
    scenarioSchedule: scenario.schedule,
    basePayoffPeriod,
    scenarioPayoffPeriod,
    monthsSaved,
    costSaved,
    baseResidualAtMaturity: base.projectedResidualAtMaturity,
    scenarioResidualAtMaturity: scenario.projectedResidualAtMaturity,
  }
}
