/**
 * Confidence value object — domain-model.md §2, financial-calculation-spec.md §7.
 *
 * Models the confidence of a *successful* calculation result only. Refusal is
 * a distinct outcome (`CalculationOutcome` in entities/calculation-run.ts) —
 * Confidence is never overloaded with a "refused" value. See
 * PHASE-02-DECISION-LOG.md §2 for the mapping to finance-engine's
 * `CalculationConfidence` (which keeps a `REFUSED` result state at the engine
 * layer; that engine type is intentionally left unchanged by this phase).
 */

export type Confidence = 'official' | 'high' | 'medium' | 'low'

/** Higher rank = more confident. Used to implement "confidence never upgrades through composition". */
const CONFIDENCE_RANK: Record<Confidence, number> = {
  official: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function confidenceRank(confidence: Confidence): number {
  return CONFIDENCE_RANK[confidence]
}

/** Returns the weaker (lower-ranked) of two confidence levels — composition never upgrades. */
export function weakestConfidence(a: Confidence, b: Confidence): Confidence {
  return confidenceRank(a) <= confidenceRank(b) ? a : b
}

export function isAtLeastConfidence(candidate: Confidence, minimum: Confidence): boolean {
  return confidenceRank(candidate) >= confidenceRank(minimum)
}
