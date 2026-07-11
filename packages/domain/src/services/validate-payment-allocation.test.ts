/**
 * INV-2: principal + cost = amount within CONV-5 tolerance.
 */
import { describe, it, expect } from 'vitest'
import { validatePaymentAllocation } from './validate-payment-allocation.js'
import { Money } from '../value-objects/money.js'
import { brandId, toLocalDate } from '../value-objects/id.js'
import type { Payment } from '../entities/payment.js'

function basePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: brandId<'payment'>('pay-1'),
    obligationId: brandId<'obligation'>('obl-1'),
    userId: brandId<'user'>('user-1'),
    date: toLocalDate('2026-06-01'),
    amount: Money.of('221.4286'),
    provenance: { source: 'demo', observedAt: '2026-06-01', recordedAt: '2026-06-01' },
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('validatePaymentAllocation', () => {
  it('INV-2: passes when there is no allocation to validate', () => {
    const result = validatePaymentAllocation(basePayment())
    expect(result.ok).toBe(true)
  })

  it('INV-2: accepts an exact principal + cost = amount split', () => {
    const payment = basePayment({
      allocation: {
        principal: Money.of('180'),
        cost: Money.of('41.4286'),
        allocationSource: 'estimated',
      },
    })
    expect(validatePaymentAllocation(payment).ok).toBe(true)
  })

  it('INV-2: rejects a split that does not sum to the payment amount', () => {
    const payment = basePayment({
      allocation: {
        principal: Money.of('180'),
        cost: Money.of('50'),
        allocationSource: 'estimated',
      },
    })
    const result = validatePaymentAllocation(payment)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.safeMetadata?.['reason']).toBe('INV-2')
  })

  it('INV-2: accepts a split within the CONV-5 rounding tolerance', () => {
    const payment = basePayment({
      allocation: {
        principal: Money.of('180'),
        cost: Money.of('41.433'),
        allocationSource: 'official',
      },
    })
    expect(validatePaymentAllocation(payment).ok).toBe(true)
  })
})
