/**
 * Bank Rate Simulator impact preview (docs/dashboard.md's variable-rate
 * correction, "## Correct implementation" + "## Dashboard display"). Reuses
 * `variableProjection.v1` and `residualDetection.v1` directly — this module
 * never computes a residual or an amortization schedule itself, only
 * projects `ConventionalLoan` + a proposed rate change into their inputs
 * and reshapes the outputs for display. Nothing here is persisted; Phase 4's
 * publish flow re-runs the same sequence and persists the outcome as a
 * `calculation_run`.
 *
 * Three servicing policies (docs/dashboard.md "## Alternative servicing
 * policies"): `unchanged` (default), `recalculated`, and `unknownTreatment`
 * — the last one deliberately refuses to project a final treatment rather
 * than silently assuming one.
 */
import {
  demoSourced,
  brandId,
  type ConventionalLoan,
  type LocalDate,
  type Money,
  type Rate,
  type RatePeriod,
} from '@eltizamati/domain'
import {
  computeVariableProjection,
  computeResidualDetection,
  type InstallmentPolicy,
  type ScheduleEntry,
  type VariableProjectionResult,
} from '@eltizamati/finance-engine'

export type ServicingPolicy = 'unchanged' | 'recalculated' | 'unknownTreatment'

export interface ImpactPreviewInputs {
  readonly loan: ConventionalLoan
  readonly newAnnualRate: Rate
  readonly effectiveDate: LocalDate
  readonly servicingPolicy: ServicingPolicy
  readonly asOf: LocalDate
}

export interface ImpactPreviewDisplay {
  readonly kind: 'available'
  readonly currentAnnualRate: Rate
  readonly newAnnualRate: Rate
  readonly effectiveDate: LocalDate
  readonly installment: Money
  readonly installmentPolicy: ServicingPolicy
  readonly previousInterestPortion: Money
  readonly newInterestPortion: Money
  readonly previousPrincipalPortion: Money
  readonly newPrincipalPortion: Money
  readonly contractualMaturityDate: LocalDate
  readonly projectedResidualAtMaturity: Money
  readonly hasResidualRisk: boolean
  readonly estimatedEquivalentAdditionalInstallments: number | undefined
  readonly assumptions: readonly string[]
  readonly negativeAmortizationPeriods: readonly number[]
}

export interface ImpactPreviewUnavailable {
  readonly kind: 'unavailable'
  readonly reason: string
}

export type ImpactPreviewOutcome = ImpactPreviewDisplay | ImpactPreviewUnavailable

function toInstallmentPolicy(policy: 'unchanged' | 'recalculated'): InstallmentPolicy {
  return policy === 'unchanged' ? { kind: 'unchanged' } : { kind: 'recalculated' }
}

/**
 * First schedule entry whose period the rate change actually shows up in.
 * `entry.date` is the period's CLOSE date (= the next period's start) — a
 * period closing exactly on `date` started before it and still reflects the
 * old rate, so this must be strictly after `date`, not at-or-after it.
 */
function firstEntryAffectedBy(
  schedule: readonly ScheduleEntry[],
  date: LocalDate,
): ScheduleEntry | undefined {
  return schedule.find((entry) => entry.date > date) ?? schedule[schedule.length - 1]
}

export function computeImpactPreview(inputs: ImpactPreviewInputs): ImpactPreviewOutcome {
  const { loan, newAnnualRate, effectiveDate, servicingPolicy, asOf } = inputs
  const { loanDetails } = loan

  if (servicingPolicy === 'unknownTreatment') {
    return {
      kind: 'unavailable',
      reason:
        'Contract servicing policy is unknown — the rate change would be recorded, but the final treatment is not calculated.',
    }
  }

  const activeRatePeriods = loanDetails.ratePeriods.filter(
    (period) => period.supersededBy === undefined && period.effectiveFrom < effectiveDate,
  )
  if (activeRatePeriods.length === 0) {
    return {
      kind: 'unavailable',
      reason: 'Impact unavailable because the required contract inputs are missing.',
    }
  }

  const currentRatePeriod = [...activeRatePeriods].sort((a, b) =>
    a.effectiveFrom < b.effectiveFrom ? 1 : -1,
  )[0] as RatePeriod

  // The proposed rate period is never persisted here — this is a preview.
  // A real campaign publish (Phase 4) appends the genuine row.
  const proposedRatePeriod: RatePeriod = {
    id: brandId<'ratePeriod'>('preview-only'),
    obligationId: loan.id,
    annualRate: newAnnualRate,
    effectiveFrom: effectiveDate,
    provenance: demoSourced(undefined, 'preview', asOf, asOf).provenance,
    createdAt: asOf,
  }

  const policy = toInstallmentPolicy(servicingPolicy)

  // Always walks from the ORIGINAL principal at the loan's own start date —
  // never from today's reported outstanding balance, which is a separate,
  // independently-sourced figure this formula doesn't take as input (mirrors
  // apps/mobile/src/services/insight-evaluation-service.ts#evaluateForLoan,
  // the proven reference for this exact call).
  const before: VariableProjectionResult = computeVariableProjection(
    loanDetails.originalPrincipal.value,
    activeRatePeriods,
    loanDetails.termMonths.value,
    loanDetails.startDate,
    loanDetails.installment.value,
    policy,
    asOf,
  )
  const after: VariableProjectionResult = computeVariableProjection(
    loanDetails.originalPrincipal.value,
    [...activeRatePeriods, proposedRatePeriod],
    loanDetails.termMonths.value,
    loanDetails.startDate,
    loanDetails.installment.value,
    policy,
    asOf,
  )

  const beforeEntry = firstEntryAffectedBy(before.schedule, effectiveDate)
  const afterEntry = firstEntryAffectedBy(after.schedule, effectiveDate)
  if (beforeEntry === undefined || afterEntry === undefined) {
    return {
      kind: 'unavailable',
      reason: 'Impact unavailable because the required contract inputs are missing.',
    }
  }

  const residual = computeResidualDetection(
    after.projectedResidualAtMaturity,
    loanDetails.originalPrincipal.value,
    loanDetails.installment.value,
    {
      rateIncreasedWithUnchangedInstallment:
        servicingPolicy === 'unchanged' &&
        newAnnualRate.toDecimal().greaterThan(currentRatePeriod.annualRate.toDecimal()),
      contractualBalloon: loanDetails.contractualBalloon?.value,
    },
    asOf,
  )

  return {
    kind: 'available',
    currentAnnualRate: currentRatePeriod.annualRate,
    newAnnualRate,
    effectiveDate,
    installment: loanDetails.installment.value,
    installmentPolicy: servicingPolicy,
    previousInterestPortion: beforeEntry.cost,
    newInterestPortion: afterEntry.cost,
    previousPrincipalPortion: beforeEntry.principal,
    newPrincipalPortion: afterEntry.principal,
    contractualMaturityDate: loanDetails.maturityDate,
    projectedResidualAtMaturity: after.projectedResidualAtMaturity,
    hasResidualRisk: residual.hasResidualRisk,
    estimatedEquivalentAdditionalInstallments: residual.monthsOfExtraPayments,
    assumptions: [
      'CONV-2/CONV-3/CONV-4: monthly compounding, actual/actual period accrual, mid-period effective dates deferred to the next boundary.',
      servicingPolicy === 'unchanged'
        ? 'Installment policy: unchanged — the monthly installment stays the same; a projected residual may remain at the original maturity date.'
        : 'Installment policy: recalculated — the monthly installment is re-leveled to keep the original maturity date.',
    ],
    negativeAmortizationPeriods: after.negativeAmortizationPeriods,
  }
}
