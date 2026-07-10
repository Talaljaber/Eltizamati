/**
 * Obligation status derivation — BR-STAT-001.
 *
 * The ONLY place status is derived. Any attempt to derive ObligationStatus
 * elsewhere is a review-blocking defect (AI_AGENT_RULES §10, BR-STAT-001).
 *
 * Status is computed, never stored — it is derived from the current data
 * snapshot including rate history, payments, and engine outputs.
 *
 * For M0 this is a placeholder stub. M1 will implement the full derivation
 * once the domain core (rate history, payment records) is in place.
 */

import type { ObligationStatus } from '../entities/obligation.js'
import type { Obligation } from '../entities/obligation.js'

/**
 * Inputs to status derivation.
 * M0: minimal shape — will be extended in M1 with rate periods, payments, etc.
 */
export interface StatusDerivationInputs {
  readonly obligation: Obligation
  // M1: add rateHistory, payments, latestCalculationRun
  // M3: add insightSeverity
}

/**
 * Derive the current ObligationStatus from domain data.
 *
 * M0 placeholder — returns a safe default.
 * MUST be extended in M1 per BR-STAT-001 rules before any status is displayed.
 *
 * @see docs/03-domain/domain-model.md §4 for the full derivation logic
 */
export function deriveObligationStatus(_inputs: StatusDerivationInputs): ObligationStatus {
  // M0: stub — will implement full BR-STAT-001 derivation in M1
  // DOC-ISSUE: full derivation algorithm not yet fully specified in domain-model.md §4;
  //            this is intentionally a placeholder for M0.
  return 'dataIncomplete'
}
