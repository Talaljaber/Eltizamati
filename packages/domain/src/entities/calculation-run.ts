/**
 * CalculationRun — the persisted, reproducible record of one finance-engine
 * invocation (domain-model.md §3.5, FR-CALC-005). See
 * PHASE-02-DECISION-LOG.md §6–7 for the full boundary rationale:
 *
 *   - `formulaId`/`formulaVersion` are opaque references to the finance-engine
 *     registry — domain cannot import finance-engine types (ADR-0007: the
 *     dependency runs finance-engine → domain, never reverse).
 *   - `inputsSnapshot`/`resultSnapshot` are opaque canonical JSON (see
 *     services/canonical-json.ts) — concrete per-formula shapes (including
 *     `ScheduleEntry`, a pure finance-engine output type) are Phase 6 work,
 *     defined inside `packages/finance-engine`, never in domain.
 *   - `outcome` splits "successful result with Confidence" from "refused with
 *     missing fields" (§4.2) — Confidence is never overloaded with refusal.
 */
import type { Id, LocalDate } from '../value-objects/id.js'
import type { Confidence } from '../value-objects/confidence.js'
import type { CanonicalJsonValue } from '../services/canonical-json.js'

export interface CalculationOutcomeResult {
  readonly kind: 'result'
  readonly confidence: Confidence
  readonly resultSnapshot: CanonicalJsonValue
}

export interface CalculationOutcomeRefused {
  readonly kind: 'refused'
  /** Field references the engine could not resolve (BR-CALC-016). */
  readonly missingFields: readonly string[]
  /** A partial, honestly-limited view, if the engine could produce one. */
  readonly partialSnapshot?: CanonicalJsonValue
}

export type CalculationOutcome = CalculationOutcomeResult | CalculationOutcomeRefused

export interface CalculationRun {
  readonly id: Id<'calculationRun'>
  readonly userId: Id<'user'>
  /** Nullable for aggregate calculations spanning multiple obligations. */
  readonly obligationId?: Id<'obligation'>
  readonly formulaId: string
  readonly formulaVersion: number
  readonly asOf: LocalDate
  readonly inputsSnapshot: CanonicalJsonValue
  /** `hashCanonicalJson(inputsSnapshot)` — reproducibility check (INV-5). */
  readonly inputsHash: string
  readonly outcome: CalculationOutcome
  readonly assumptions: readonly string[]
  readonly calculatedAt: string
}
