/**
 * Card fee — a contractual fee line item (definition), not a charged-occurrence
 * history. See PHASE-02-DECISION-LOG.md §3 for why the MVP models only this
 * minimal read-only shape: financial-calculation-spec.md CONV-8 and
 * FR-OBL-005 both describe fees as display line items, never a payment/charge
 * history. If a future phase needs actual-charge history, that is a new
 * entity — never a retrofit of this type.
 */
import type { Money } from './money.js'
import type { Sourced } from './provenance.js'

export type CardFeeType = 'annual' | 'late' | 'cashAdvance' | 'other'

export interface CardFee {
  readonly type: CardFeeType
  readonly amount: Sourced<Money>
  readonly description?: string
}
