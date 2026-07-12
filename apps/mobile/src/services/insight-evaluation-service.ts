import type {
  Id,
  LocalDate,
  ConventionalLoan,
  Insight,
  InsightRepository,
  Result,
  AppError,
} from '@eltizamati/domain'
import { err, brandId, isErr } from '@eltizamati/domain'
import {
  computeVariableProjection,
  computeResidualDetection,
  evaluateRateIncreased,
  evaluateInstallmentUnchangedAfterIncrease,
  evaluateResidualRisk,
  type InsightCandidate,
} from '@eltizamati/finance-engine'
import type { CalculationService } from './calculation-service.js'

/** Same Hermes/RN-safe fallback used by calculation-service.ts's generateId(). */
function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `insight-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * InsightEvaluationService — runs the variableProjection.v1 /
 * residualDetection.v1 formulas for a conventional loan and raises any new
 * RATE_INCREASED / INSTALLMENT_UNCHANGED_AFTER_INCREASE / RESIDUAL_RISK
 * insights the pure rule evaluators (`@eltizamati/finance-engine`'s
 * `insights/rules.ts`) produce, deduping against what's already in the
 * `InsightRepository` by `(ruleId, obligationId, triggerHash)` — `raise()`
 * itself only dedups by `id` (Map.set), so rule-level dedup is this
 * service's responsibility (Phase 7 scope item).
 */
export class InsightEvaluationService {
  constructor(
    private readonly insightRepo: InsightRepository,
    private readonly calcService: CalculationService,
  ) {}

  async evaluateForLoan(
    userId: Id<'user'>,
    obligation: ConventionalLoan,
    asOf: LocalDate,
  ): Promise<Result<readonly Insight[], AppError>> {
    const loanDetails = obligation.loanDetails

    // ConventionalLoanDetails stores a single current `installment` value —
    // there is no per-period installment history / explicit
    // InstallmentPolicy field on the domain model (Phase 7 scope). The only
    // policy consistent with that shape is `unchanged`: the installment the
    // loan record carries is treated as constant across the whole
    // projection. Because that is the *only* policy this service ever runs
    // under, `installmentUnchangedSinceLastIncrease` (the evidence
    // `evaluateInstallmentUnchangedAfterIncrease` needs) is structurally
    // true here by construction — it is not an independent observation.
    // A future phase that models installment recalculation history should
    // derive this from that history instead of hardcoding it.
    const installmentPolicy = { kind: 'unchanged' as const }
    const installmentUnchangedSinceLastIncrease = installmentPolicy.kind === 'unchanged'

    const variableProjectionInputs = {
      principal: loanDetails.originalPrincipal.value,
      ratePeriods: loanDetails.ratePeriods,
      termMonths: loanDetails.termMonths.value,
      startDate: loanDetails.startDate,
      installment: loanDetails.installment.value,
      installmentPolicy,
      asOf,
    }

    // Persist the run for audit/dedup purposes via CalculationService (which
    // canonicalizes the result into CanonicalJsonValue for storage). We
    // additionally call the pure `computeVariableProjection` formula
    // directly below to get the typed `VariableProjectionResult` this
    // method needs to feed into `residualDetection` — re-parsing
    // `CanonicalJsonValue` back into typed `Money` would mean re-deriving
    // Money from a JSON string, which is unnecessary indirection when the
    // pure function is right here and deterministic on the same inputs.
    const projectionRunResult = await this.calcService.runCalculation(
      userId,
      obligation.id,
      'variableProjection',
      1,
      variableProjectionInputs,
      asOf,
    )
    if (isErr(projectionRunResult)) return err(projectionRunResult.error)

    if (projectionRunResult.value.outcome.kind === 'refused') {
      // Cannot compute residual detection meaningfully without a real
      // projection — return the current insight list as-is rather than
      // fabricating data or failing the whole method.
      return this.insightRepo.list(userId)
    }

    const projection = computeVariableProjection(
      loanDetails.originalPrincipal.value,
      loanDetails.ratePeriods,
      loanDetails.termMonths.value,
      loanDetails.startDate,
      loanDetails.installment.value,
      installmentPolicy,
      asOf,
    )

    const residualDetectionInputs = {
      projectedResidualAtMaturity: projection.projectedResidualAtMaturity,
      originalPrincipal: loanDetails.originalPrincipal.value,
      currentInstallment: loanDetails.installment.value,
      evidence: {
        rateIncreasedWithUnchangedInstallment: installmentUnchangedSinceLastIncrease,
      },
      asOf,
    }

    const detectionRunResult = await this.calcService.runCalculation(
      userId,
      obligation.id,
      'residualDetection',
      1,
      residualDetectionInputs,
      asOf,
    )
    if (isErr(detectionRunResult)) return err(detectionRunResult.error)

    if (detectionRunResult.value.outcome.kind === 'refused') {
      return this.insightRepo.list(userId)
    }

    const detection = computeResidualDetection(
      projection.projectedResidualAtMaturity,
      loanDetails.originalPrincipal.value,
      loanDetails.installment.value,
      { rateIncreasedWithUnchangedInstallment: installmentUnchangedSinceLastIncrease },
      asOf,
    )

    const candidates: InsightCandidate[] = [
      ...evaluateRateIncreased(obligation.id, loanDetails.ratePeriods),
      ...evaluateInstallmentUnchangedAfterIncrease(
        obligation.id,
        loanDetails.ratePeriods,
        installmentUnchangedSinceLastIncrease,
      ),
      ...evaluateResidualRisk(obligation.id, detection),
    ]

    const existingResult = await this.insightRepo.list(userId)
    if (isErr(existingResult)) return err(existingResult.error)

    const existingKeys = new Set(
      existingResult.value.map((i) => `${i.ruleId}|${i.obligationId ?? ''}|${i.triggerHash}`),
    )

    const createdAt = `${asOf}T00:00:00.000Z`

    for (const candidate of candidates) {
      const key = `${candidate.ruleId}|${candidate.obligationId}|${candidate.triggerHash}`
      if (existingKeys.has(key)) continue

      const insight: Insight = {
        id: brandId<'insight'>(generateId()),
        userId,
        ruleId: candidate.ruleId,
        obligationId: brandId<'obligation'>(candidate.obligationId),
        severity: candidate.severity,
        titleKey: candidate.titleKey,
        bodyKey: candidate.bodyKey,
        ...(candidate.params !== undefined ? { params: candidate.params } : {}),
        triggerHash: candidate.triggerHash,
        createdAt,
      }

      const raiseResult = await this.insightRepo.raise(insight)
      if (isErr(raiseResult)) return err(raiseResult.error)
      existingKeys.add(key)
    }

    return this.insightRepo.list(userId)
  }
}
