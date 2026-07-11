/**
 * Structural tests for the Obligation union — provenance preservation,
 * mode-neutral ownership, institution shape, and fee representation
 * (PHASE-02-DECISION-LOG.md §3–4, §8–9).
 */
import { describe, it, expect } from 'vitest'
import { isConventionalLoan, isCreditCard, isMurabaha } from './obligation.js'
import type { ConventionalLoan, CreditCard } from './obligation.js'
import { brandId, toLocalDate } from '../value-objects/id.js'
import { Money } from '../value-objects/money.js'
import { Percentage } from '../value-objects/percentage.js'

const iso = '2026-01-01T00:00:00.000Z'

function sourced<T>(value: T) {
  return {
    value,
    provenance: { source: 'demo' as const, observedAt: '2026-01-01', recordedAt: '2026-01-01' },
  }
}

describe('Obligation', () => {
  it('carries a mode-neutral userId (Id<user>), not a raw string or auth.uid()', () => {
    const loan: ConventionalLoan = {
      id: brandId('obl-1'),
      userId: brandId('demo-local-user'),
      kind: 'conventionalLoan',
      nickname: 'Housing loan',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: toLocalDate('2024-01-15'),
      provenance: { source: 'demo', observedAt: '2024-01-15', recordedAt: '2024-01-15' },
      createdAt: iso,
      updatedAt: iso,
      loanDetails: {
        originalPrincipal: sourced(Money.of('20000')),
        installment: sourced(Money.of('307')),
        rateType: 'fixed',
        ratePeriods: [],
        termMonths: sourced(84),
        startDate: toLocalDate('2024-01-15'),
        maturityDate: toLocalDate('2031-01-15'),
        paymentFrequency: 'monthly',
      },
    }
    expect(loan.userId).toBe('demo-local-user')
    expect(isConventionalLoan(loan)).toBe(true)
    expect(isMurabaha(loan)).toBe(false)
  })

  it('preserves record-level provenance and structured institution', () => {
    const card: CreditCard = {
      id: brandId('obl-2'),
      userId: brandId('user-1'),
      kind: 'creditCard',
      nickname: 'Visa',
      institution: { name: 'Test Bank', id: 'bank-42' },
      currency: 'JOD',
      openedDate: toLocalDate('2024-01-15'),
      provenance: { source: 'userEntered', observedAt: '2024-01-15', recordedAt: '2024-01-16' },
      createdAt: iso,
      updatedAt: iso,
      cardDetails: {
        creditLimit: sourced(Money.of('3000')),
        currentBalance: sourced(Money.of('2350')),
        minimumPaymentRule: { type: 'percent', value: Percentage.of('3'), floor: Money.of('10') },
        fees: [{ type: 'annual', amount: sourced(Money.of('50')), description: 'Annual card fee' }],
      },
    }
    expect(card.institution).toEqual({ name: 'Test Bank', id: 'bank-42' })
    expect(card.provenance.source).toBe('userEntered')
    expect(isCreditCard(card)).toBe(true)
    expect(card.cardDetails.minimumPaymentRule?.type).toBe('percent')
    expect(card.cardDetails.fees?.[0]?.type).toBe('annual')
  })

  it('represents an unknown minimum-payment rule distinctly (never coerced to a numeric variant)', () => {
    const rule: CreditCard['cardDetails']['minimumPaymentRule'] = { type: 'unknown' }
    expect(rule?.type).toBe('unknown')
    expect('value' in (rule as object)).toBe(false)
  })
})
