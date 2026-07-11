/**
 * Payment — domain-model.md §3.5. Validate allocation consistency with
 * `validatePaymentAllocation` (services/validate-payment-allocation.ts).
 */
import type { Id, LocalDate } from '../value-objects/id.js'
import type { Money } from '../value-objects/money.js'
import type { Provenance } from '../value-objects/provenance.js'

export interface PaymentAllocation {
  readonly principal: Money
  readonly cost: Money
  /** 'official' when the lender/statement reported the split; 'estimated' when derived (BR-CALC-010). */
  readonly allocationSource: 'official' | 'estimated'
}

export interface Payment {
  readonly id: Id<'payment'>
  readonly obligationId: Id<'obligation'>
  readonly userId: Id<'user'>
  readonly date: LocalDate
  readonly amount: Money
  readonly allocation?: PaymentAllocation
  readonly provenance: Provenance
  /** Optional reference to the rate period this payment falls within. */
  readonly periodRef?: Id<'ratePeriod'>
  readonly createdAt: string
}
