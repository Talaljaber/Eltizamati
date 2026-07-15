/**
 * Publishes a Bank Rate Simulator campaign (docs/dashboard.md §8 + the
 * variable-rate correction's "## Correct implementation"). Orchestrates,
 * in order:
 *
 *   1. Revalidate every target user is allowlisted (the one check the DB
 *      RPC cannot perform itself — see 20260716000001's own comment).
 *   2. Call `demo_publish_rate_campaign` (one transaction: campaign row +
 *      appended rate_periods rows + eligible target rows + activity rows).
 *   3. Record excluded targets (non-atomic, no side effects to protect).
 *   4. For each published loan: resolve `variableProjection.v1` +
 *      `residualDetection.v1` from the finance-engine registry (never a
 *      hand-rolled call — same registry path `CalculationService` uses),
 *      persist each as a `calculation_run`, and raise any resulting
 *      insights via the pure rule evaluators.
 *   5. Queue (or suppress, per the recipient allowlist) a rate-change
 *      email for each published loan's owner, if the campaign enabled
 *      notifications — including the projected residual step 4 computed,
 *      never a copy of `contractualBalloon`.
 *
 * A failure in step 4/5 for one loan does not roll back step 2 — the rate
 * history is already correctly and permanently appended by that point;
 * this mirrors how CalculationService/InsightEvaluationService are their
 * own separate writes after a base record is already committed in mobile.
 */
import {
  brandId,
  hashCanonicalJson,
  toCanonicalJsonValue,
  type CalculationRun,
  type Confidence,
  type ConventionalLoan,
  type Insight,
  type LocalDate,
  type Money,
  type Rate,
} from '@eltizamati/domain'
import {
  evaluateRateIncreased,
  evaluateResidualRisk,
  resolveFormula,
} from '@eltizamati/finance-engine'
import { isUserAllowlisted } from './allowlist'
import { listAllowlistedObligations } from './repositories/obligation-repository'
import { evaluateRateCampaignEligibility, type EligibleLoan } from './rate-campaign-eligibility'
import type { ServicingPolicy } from './impact-preview-service'
import { publishRateCampaign, recordExcludedTargets } from './repositories/demo-campaign-repository'
import { persistCalculationRun } from './repositories/calculation-run-repository'
import { raiseInsight } from './repositories/insight-repository'
import { recordActivity } from './repositories/demo-activity-repository'
import { sendRateChangeEmail } from './email/gateway'
import { generateUuid } from './ids'
import { formatRate } from '@/format/money'

export interface PublishCampaignRequest {
  readonly campaignName: string
  readonly institutionName: string
  readonly reason: string | undefined
  readonly sourceNote: string | undefined
  readonly newAnnualRate: Rate
  readonly effectiveDate: LocalDate
  readonly servicingPolicy: ServicingPolicy
  readonly emailNotificationEnabled: boolean
  readonly recipientEmailByUserId: ReadonlyMap<string, string>
  readonly asOf: LocalDate
}

export interface PublishCampaignSummary {
  readonly campaignId: string
  readonly eligibleCount: number
  readonly excludedCount: number
  readonly calculationsPersisted: number
  readonly insightsRaised: number
  readonly emailsQueued: number
}

interface CalculationOutcomeSummary {
  readonly calculationCount: number
  readonly insightCount: number
  readonly projectedResidualAtMaturity: Money | undefined
}

export async function publishCampaign(
  request: PublishCampaignRequest,
): Promise<{ ok: true; value: PublishCampaignSummary } | { ok: false; reason: string }> {
  const obligationsResult = await listAllowlistedObligations()
  if (!obligationsResult.ok) {
    return { ok: false, reason: 'Could not load allowlisted obligations.' }
  }

  const eligibility = evaluateRateCampaignEligibility(
    obligationsResult.value,
    request.institutionName,
  )

  // Defense in depth (docs/dashboard.md §8 step 1): every eligible loan
  // already came from an allowlisted query, but this is the explicit
  // revalidation the spec calls for before any write happens.
  const revalidatedEligible = eligibility.eligible.filter((target) =>
    isUserAllowlisted(target.obligation.userId),
  )
  if (revalidatedEligible.length === 0) {
    return { ok: false, reason: 'No eligible, allowlisted loans to target.' }
  }

  const campaignId = generateUuid()

  const publishResult = await publishRateCampaign({
    campaignId,
    campaignName: request.campaignName,
    institutionName: request.institutionName,
    reason: request.reason,
    sourceNote: request.sourceNote,
    oldAnnualRateDecimal: undefined,
    newAnnualRateDecimal: request.newAnnualRate.toStorageString(),
    effectiveDate: request.effectiveDate,
    installmentPolicy: request.servicingPolicy,
    emailNotificationEnabled: request.emailNotificationEnabled,
    targetObligationIds: revalidatedEligible.map((t) => t.obligation.id),
  })

  if (!publishResult.ok) {
    await recordActivity(
      'operation_failed',
      `Campaign publish failed (code: ${publishResult.error.code})`,
    )
    return { ok: false, reason: 'Publishing the campaign failed. See the activity log.' }
  }

  await recordExcludedTargets(
    campaignId,
    eligibility.excluded.map((x) => ({
      obligationId: x.obligationId,
      userId: obligationsResult.value.find((o) => o.id === x.obligationId)?.userId ?? '',
      reason: x.reason,
    })),
  )

  let calculationsPersisted = 0
  let insightsRaised = 0
  let emailsQueued = 0

  for (const target of revalidatedEligible) {
    const persisted = await runAndPersistCalculations(target, request)

    calculationsPersisted += persisted.calculationCount
    insightsRaised += persisted.insightCount

    if (request.emailNotificationEnabled) {
      const recipient = request.recipientEmailByUserId.get(target.obligation.userId)
      if (recipient !== undefined) {
        const result = await sendRateChangeEmail({
          campaignId,
          userId: target.obligation.userId,
          recipientEmail: recipient,
          locale: 'en',
          idempotencyKey: `${campaignId}:${target.obligation.id}`,
          params: {
            obligationNickname: target.obligation.nickname,
            oldRatePercent: formatRate(target.currentRate).replace('%', ''),
            newRatePercent: formatRate(request.newAnnualRate).replace('%', ''),
            effectiveDate: request.effectiveDate,
            projectedResidualAmount: persisted.projectedResidualAtMaturity
              ?.round()
              .toStorageString(),
            currency: target.obligation.currency,
          },
        })
        if (result.status === 'queued' || result.status === 'sent') emailsQueued++
        await recordActivity(
          result.status === 'suppressed' ? 'email_suppressed' : 'email_queued',
          `Rate-change email ${result.status} for an eligible loan`,
          campaignId,
        )
      }
    }
  }

  return {
    ok: true,
    value: {
      campaignId,
      eligibleCount: revalidatedEligible.length,
      excludedCount: eligibility.excluded.length,
      calculationsPersisted,
      insightsRaised,
      emailsQueued,
    },
  }
}

async function runAndPersistCalculations(
  target: EligibleLoan,
  request: PublishCampaignRequest,
): Promise<CalculationOutcomeSummary> {
  const empty: CalculationOutcomeSummary = {
    calculationCount: 0,
    insightCount: 0,
    projectedResidualAtMaturity: undefined,
  }

  if (request.servicingPolicy === 'unknownTreatment') {
    await recordActivity(
      'calculation_evaluated',
      'Servicing policy is unknown — calculation skipped by design',
    )
    return empty
  }

  const loan: ConventionalLoan = target.obligation
  const projectionRegistryResult = resolveFormula('variableProjection', 1)
  if (!projectionRegistryResult.ok) return empty

  const installmentPolicy =
    request.servicingPolicy === 'recalculated'
      ? ({ kind: 'recalculated' } as const)
      : ({ kind: 'unchanged' } as const)

  const projectionInputs = {
    principal: loan.loanDetails.originalPrincipal.value,
    ratePeriods: loan.loanDetails.ratePeriods,
    termMonths: loan.loanDetails.termMonths.value,
    startDate: loan.loanDetails.startDate,
    installment: loan.loanDetails.installment.value,
    installmentPolicy,
    asOf: request.asOf,
  }
  const projectionOutcome = projectionRegistryResult.value.execute(projectionInputs)
  if (projectionOutcome.kind !== 'ok') return empty

  let calculationCount = 0
  const projectionRun = await buildAndPersistRun(
    loan,
    'variableProjection',
    1,
    projectionInputs,
    projectionOutcome.value,
    projectionOutcome.confidence,
    request.asOf,
  )
  if (projectionRun !== undefined) calculationCount++

  let insightCount = 0
  const residualRegistryResult = resolveFormula('residualDetection', 1)
  if (residualRegistryResult.ok) {
    const residualInputs = {
      projectedResidualAtMaturity: projectionOutcome.value.projectedResidualAtMaturity,
      originalPrincipal: loan.loanDetails.originalPrincipal.value,
      currentInstallment: loan.loanDetails.installment.value,
      evidence: { rateIncreasedWithUnchangedInstallment: request.servicingPolicy === 'unchanged' },
      asOf: request.asOf,
    }
    const residualOutcome = residualRegistryResult.value.execute(residualInputs)
    if (residualOutcome.kind === 'ok') {
      const residualRun = await buildAndPersistRun(
        loan,
        'residualDetection',
        1,
        residualInputs,
        residualOutcome.value,
        residualOutcome.confidence,
        request.asOf,
      )
      if (residualRun !== undefined) {
        calculationCount++
        const candidates = [
          ...evaluateRateIncreased(loan.id, loan.loanDetails.ratePeriods),
          ...evaluateResidualRisk(loan.id, residualOutcome.value),
        ]
        for (const candidate of candidates) {
          const insight: Insight = {
            id: brandId<'insight'>(generateUuid()),
            userId: loan.userId,
            ruleId: candidate.ruleId,
            obligationId: brandId<'obligation'>(candidate.obligationId),
            severity: candidate.severity,
            titleKey: candidate.titleKey,
            bodyKey: candidate.bodyKey,
            ...(candidate.params !== undefined ? { params: candidate.params } : {}),
            triggerHash: candidate.triggerHash,
            createdAt: `${request.asOf}T00:00:00.000Z`,
          }
          const raised = await raiseInsight(insight)
          if (raised.ok) insightCount++
        }
      }
    }
  }

  await recordActivity('calculation_evaluated', 'Calculations re-evaluated for a published loan')
  if (insightCount > 0) {
    await recordActivity('insight_generated', `${insightCount} insight(s) generated`)
  }

  return {
    calculationCount,
    insightCount,
    projectedResidualAtMaturity: projectionOutcome.value.projectedResidualAtMaturity,
  }
}

/**
 * Canonicalizes BOTH the inputs and the result value before persisting —
 * mirrors CalculationService#runCalculation exactly. Money/Rate/Percentage
 * store their value in private JS fields JSON.stringify can't see; a raw
 * cast here would silently persist an empty object in place of the actual
 * figures (the same bug class Phase 6's own STOP-SHIP audit found and
 * fixed for this exact code path in apps/mobile).
 */
async function buildAndPersistRun(
  loan: ConventionalLoan,
  formulaId: string,
  formulaVersion: number,
  inputs: unknown,
  resultValue: unknown,
  confidence: Confidence,
  asOf: LocalDate,
): Promise<CalculationRun | undefined> {
  const inputsSnapshotResult = toCanonicalJsonValue(inputs)
  if (!inputsSnapshotResult.ok) return undefined
  const resultSnapshotResult = toCanonicalJsonValue(resultValue)
  if (!resultSnapshotResult.ok) return undefined

  const inputsSnapshot = inputsSnapshotResult.value
  const inputsHash = hashCanonicalJson(inputsSnapshot)

  const run: CalculationRun = {
    id: brandId<'calculationRun'>(generateUuid()),
    userId: loan.userId,
    obligationId: loan.id,
    formulaId,
    formulaVersion,
    asOf,
    inputsSnapshot,
    inputsHash,
    outcome: { kind: 'result', confidence, resultSnapshot: resultSnapshotResult.value },
    assumptions: [],
    calculatedAt: new Date().toISOString(),
  }

  const persisted = await persistCalculationRun(run)
  return persisted.ok ? persisted.value : undefined
}
