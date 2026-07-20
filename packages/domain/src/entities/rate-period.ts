/**
 * RatePeriod — append-only rate history entry (domain-model.md §3.5, BR-OBL-002, BR-RATE-001).
 *
 * Rate history is append-only: a correction creates a new period with
 * `supersededBy` pointing from the old period to its replacement — the old
 * period's fields are never mutated. Validate a full history with
 * `validateRatePeriods` (services/validate-rate-periods.ts).
 */
import type { Id, LocalDate } from '../value-objects/id.js'
import type { Rate } from '../value-objects/money.js'
import type { Provenance } from '../value-objects/provenance.js'

export interface RatePeriod {
  readonly id: Id<'ratePeriod'>
  readonly obligationId: Id<'obligation'>
  readonly annualRate: Rate
  /** CBJ benchmark component, when this period was published via the benchmark+margin flow. */
  readonly benchmarkRate?: Rate
  /** Bank's contractual margin component, when this period was published via the benchmark+margin flow. */
  readonly margin?: Rate
  readonly effectiveFrom: LocalDate
  /** Set only when this period has been superseded by a correction — append-only (BR-RATE-001). */
  readonly supersededBy?: Id<'ratePeriod'>
  readonly provenance: Provenance
  readonly createdAt: string
}
