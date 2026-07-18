import {
  addMonthsToLocalDate,
  brandId,
  Money,
  type LocalDate,
  type Rate,
  type RatePeriod,
} from '@eltizamati/domain'
import { engineOk, refused, type EngineOutcome, type FieldRef } from '../refusal.js'
import { variableProjection, type VariableProjectionResult } from './variable-projection.js'
import { FORMULA_ASSUMPTIONS } from '../registry/formula-assumptions.js'

export interface RateChangeScenarioInputs {
  readonly principal?: Money
  readonly ratePeriods?: readonly RatePeriod[]
  readonly termMonths?: number
  readonly startDate?: LocalDate
  readonly installment?: Money
  readonly hypotheticalAnnualRate?: Rate
  readonly hypotheticalEffectiveDate?: LocalDate
  readonly asOf: LocalDate
}

export interface RateChangeScenarioProjection {
  readonly projectedTotalStillPayable: Money
  readonly projectedResidualAtMaturity: Money
  readonly payoffPeriod?: number
  readonly nextAffectedPayment?: { readonly cost: Money; readonly principal: Money }
  readonly negativeAmortizationPeriods: readonly number[]
}

export interface RateChangeScenarioResult {
  readonly currentRate: Rate
  readonly hypotheticalRate: Rate
  readonly effectiveDate: LocalDate
  readonly installment: Money
  readonly baseline: RateChangeScenarioProjection
  readonly hypothetical: RateChangeScenarioProjection
}

function projectionSummary(
  projection: VariableProjectionResult,
  asOf: LocalDate,
  effectiveDate: LocalDate | undefined,
): RateChangeScenarioProjection {
  let futurePayments = Money.zero(projection.projectedResidualAtMaturity.currency)
  for (const entry of projection.schedule) {
    if (entry.date > asOf) futurePayments = futurePayments.add(entry.payment)
  }
  const affected =
    effectiveDate === undefined
      ? undefined
      : projection.schedule.find((x) => x.date > effectiveDate && x.date > asOf)
  return {
    projectedTotalStillPayable: futurePayments.add(projection.projectedResidualAtMaturity),
    projectedResidualAtMaturity: projection.projectedResidualAtMaturity,
    ...(projection.payoffPeriod === undefined ? {} : { payoffPeriod: projection.payoffPeriod }),
    ...(affected === undefined
      ? {}
      : { nextAffectedPayment: { cost: affected.cost, principal: affected.principal } }),
    negativeAmortizationPeriods: projection.negativeAmortizationPeriods,
  }
}

/** Pure, non-persistent comparison for the mobile “what if the rate changes?” flow. */
export function rateChangeScenario(
  inputs: RateChangeScenarioInputs,
): EngineOutcome<RateChangeScenarioResult> {
  const missing: FieldRef[] = []
  if (inputs.principal === undefined) missing.push({ field: 'principal' })
  if (inputs.ratePeriods === undefined || inputs.ratePeriods.length === 0)
    missing.push({ field: 'ratePeriods' })
  if (inputs.termMonths === undefined) missing.push({ field: 'termMonths' })
  if (inputs.startDate === undefined) missing.push({ field: 'startDate' })
  if (inputs.installment === undefined) missing.push({ field: 'installment' })
  if (inputs.hypotheticalAnnualRate === undefined) missing.push({ field: 'hypotheticalAnnualRate' })
  if (inputs.hypotheticalEffectiveDate === undefined)
    missing.push({ field: 'hypotheticalEffectiveDate' })
  if (missing.length > 0) return refused(missing)

  const principal = inputs.principal as Money
  const ratePeriods = inputs.ratePeriods as readonly RatePeriod[]
  const termMonths = inputs.termMonths as number
  const startDate = inputs.startDate as LocalDate
  const installment = inputs.installment as Money
  const effectiveDate = inputs.hypotheticalEffectiveDate as LocalDate
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    return refused([{ field: 'termMonths', reason: 'notPositiveInteger' }])
  }
  const obligationId = ratePeriods[0]?.obligationId
  if (
    obligationId === undefined ||
    ratePeriods.some((period) => period.obligationId !== obligationId)
  ) {
    return refused([{ field: 'ratePeriods', reason: 'mixedObligations' }])
  }
  const maturityDate = addMonthsToLocalDate(startDate, termMonths)
  if (effectiveDate < startDate || effectiveDate > maturityDate) {
    return refused([{ field: 'hypotheticalEffectiveDate', reason: 'outsideLoanTerm' }])
  }
  if (
    ratePeriods.some(
      (period) => period.supersededBy === undefined && period.effectiveFrom === effectiveDate,
    )
  ) {
    return refused([{ field: 'hypotheticalEffectiveDate', reason: 'duplicateEffectiveFrom' }])
  }

  const baselineOutcome = variableProjection({
    principal,
    ratePeriods,
    termMonths,
    startDate,
    installment,
    installmentPolicy: { kind: 'unchanged' },
    asOf: inputs.asOf,
  })
  if (baselineOutcome.kind === 'refused') return baselineOutcome
  const baseline = baselineOutcome.value
  const currentRate = [...ratePeriods]
    .filter((period) => period.supersededBy === undefined && period.effectiveFrom <= inputs.asOf)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))
    .at(-1)?.annualRate
  if (currentRate === undefined) return refused([{ field: 'ratePeriods', reason: 'noActiveRate' }])

  const hypotheticalPeriod: RatePeriod = {
    id: brandId<'ratePeriod'>('what-if-rate-period'),
    obligationId,
    annualRate: inputs.hypotheticalAnnualRate as Rate,
    effectiveFrom: effectiveDate,
    provenance: {
      source: 'estimate',
      providerId: 'rate-what-if',
      observedAt: `${inputs.asOf}T00:00:00.000Z`,
      recordedAt: `${inputs.asOf}T00:00:00.000Z`,
    },
    createdAt: `${inputs.asOf}T00:00:00.000Z`,
  }
  const hypotheticalOutcome = variableProjection({
    principal,
    ratePeriods: [...ratePeriods, hypotheticalPeriod],
    termMonths,
    startDate,
    installment,
    installmentPolicy: { kind: 'unchanged' },
    asOf: inputs.asOf,
  })
  if (hypotheticalOutcome.kind === 'refused') return hypotheticalOutcome
  const hypothetical = hypotheticalOutcome.value

  return engineOk(
    {
      currentRate,
      hypotheticalRate: inputs.hypotheticalAnnualRate as Rate,
      effectiveDate,
      installment,
      baseline: projectionSummary(baseline, inputs.asOf, undefined),
      hypothetical: projectionSummary(hypothetical, inputs.asOf, effectiveDate),
    },
    'high',
    FORMULA_ASSUMPTIONS.rateChangeScenario,
  )
}
