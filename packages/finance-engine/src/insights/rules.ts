/**
 * Insight-rule primitives (Phase 6 scope item 8) — pure rule evaluation for
 * RATE_INCREASED / INSTALLMENT_UNCHANGED_AFTER_INCREASE / RESIDUAL_RISK.
 * These produce the *data* an `Insight` needs (ruleId, severity, i18n keys,
 * params, dedup `triggerHash`) — constructing the actual domain `Insight`
 * entity (id, createdAt) and persisting it is an application-service
 * concern (`CalculationService`), not the engine's. The rendering UI is
 * Phase 7's.
 *
 * `triggerHash` combines (ruleId, obligationId, triggerHash) per
 * `Insight`'s own dedup contract (domain-model.md §3.5) — computed via the
 * same canonical-JSON SHA-256 the rest of the engine uses for reproducible
 * hashing (INV-5's mechanism, reused here for dedup stability).
 */
import { hashCanonicalJson, type RatePeriod, type InsightSeverity } from '@eltizamati/domain'
import type { ResidualDetectionResult } from '../formulas/residual-detection.js'

export interface InsightCandidate {
  readonly ruleId: string
  readonly obligationId: string
  readonly severity: InsightSeverity
  readonly titleKey: string
  readonly bodyKey: string
  readonly params?: Readonly<Record<string, string | number>>
  readonly triggerHash: string
}

function sortActiveRatePeriods(ratePeriods: readonly RatePeriod[]): readonly RatePeriod[] {
  return [...ratePeriods]
    .filter((p) => p.supersededBy === undefined)
    .sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
    )
}

/** RATE_INCREASED — fires once per rate-history boundary where the rate rose. */
export function evaluateRateIncreased(
  obligationId: string,
  ratePeriods: readonly RatePeriod[],
): readonly InsightCandidate[] {
  const active = sortActiveRatePeriods(ratePeriods)
  const candidates: InsightCandidate[] = []

  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1] as RatePeriod
    const curr = active[i] as RatePeriod
    if (curr.annualRate.toDecimal().greaterThan(prev.annualRate.toDecimal())) {
      candidates.push({
        ruleId: 'RATE_INCREASED',
        obligationId,
        severity: 'attention',
        titleKey: 'insights.rateIncreased.title',
        bodyKey: 'insights.rateIncreased.body',
        params: {
          fromRate: prev.annualRate.toPercent().toFixed(2),
          toRate: curr.annualRate.toPercent().toFixed(2),
        },
        triggerHash: hashCanonicalJson({
          rule: 'RATE_INCREASED',
          obligationId,
          effectiveFrom: curr.effectiveFrom,
          rate: curr.annualRate.toStorageString(),
        }),
      })
    }
  }

  return candidates
}

/**
 * INSTALLMENT_UNCHANGED_AFTER_INCREASE — fires when a rate increase occurred
 * AND the installment genuinely stayed the same across it. Whether the
 * installment stayed the same is caller-supplied evidence (from the
 * `variableProjection.v1` policy actually used) — this rule never infers it
 * from rate data alone.
 */
export function evaluateInstallmentUnchangedAfterIncrease(
  obligationId: string,
  ratePeriods: readonly RatePeriod[],
  installmentUnchangedSinceLastIncrease: boolean,
): readonly InsightCandidate[] {
  if (!installmentUnchangedSinceLastIncrease) return []
  const rateIncreases = evaluateRateIncreased(obligationId, ratePeriods)
  if (rateIncreases.length === 0) return []

  const mostRecent = rateIncreases[rateIncreases.length - 1] as InsightCandidate
  return [
    {
      ruleId: 'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
      obligationId,
      severity: 'attention',
      titleKey: 'insights.installmentUnchanged.title',
      bodyKey: 'insights.installmentUnchanged.body',
      triggerHash: hashCanonicalJson({
        rule: 'INSTALLMENT_UNCHANGED_AFTER_INCREASE',
        obligationId,
        basis: mostRecent.triggerHash,
      }),
    },
  ]
}

const HIGH_UTILIZATION_THRESHOLD_PERCENT = 70

/** HIGH_CARD_UTILIZATION — fires when a card's balance/limit ratio exceeds 70% (FR-INS-001). */
export function evaluateHighCardUtilization(
  obligationId: string,
  utilizationPercent: number,
): readonly InsightCandidate[] {
  if (utilizationPercent <= HIGH_UTILIZATION_THRESHOLD_PERCENT) return []
  const roundedPercent = Math.round(utilizationPercent)
  return [
    {
      ruleId: 'HIGH_CARD_UTILIZATION',
      obligationId,
      severity: 'attention',
      titleKey: 'insights.highUtilization.title',
      bodyKey: 'insights.highUtilization.body',
      params: { percent: roundedPercent },
      triggerHash: hashCanonicalJson({
        rule: 'HIGH_CARD_UTILIZATION',
        obligationId,
        percent: roundedPercent,
      }),
    },
  ]
}

/** RESIDUAL_RISK — fires whenever residualDetection.v1 flags risk for this obligation. */
export function evaluateResidualRisk(
  obligationId: string,
  detection: Pick<ResidualDetectionResult, 'hasResidualRisk' | 'residual' | 'asOf'>,
): readonly InsightCandidate[] {
  if (!detection.hasResidualRisk) return []
  return [
    {
      ruleId: 'RESIDUAL_RISK',
      obligationId,
      severity: 'urgent',
      titleKey: 'insights.residualRisk.title',
      bodyKey: 'insights.residualRisk.body',
      params: { residual: detection.residual.toStorageString() },
      triggerHash: hashCanonicalJson({
        rule: 'RESIDUAL_RISK',
        obligationId,
        asOf: detection.asOf,
        residual: detection.residual.toStorageString(),
      }),
    },
  ]
}
