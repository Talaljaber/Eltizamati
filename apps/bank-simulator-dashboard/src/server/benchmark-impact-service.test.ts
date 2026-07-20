import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type CreditCard,
  type Obligation,
} from '@eltizamati/domain'
import { computeBenchmarkImpact } from './benchmark-impact-service'

function makeLoan(overrides: {
  id: string
  rateType: 'fixed' | 'variable' | 'mixed' | 'unknown'
  closed?: boolean
}): ConventionalLoan {
  return {
    id: brandId(overrides.id),
    userId: brandId('user-1'),
    nickname: 'Loan',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    ...(overrides.closed === true ? { closedDate: toLocalDate('2026-06-01') } : {}),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    kind: 'conventionalLoan',
    connectionType: 'official',
    loanDetails: {
      originalPrincipal: userEntered(Money.of('20000', 'JOD'), '2026-01-01T00:00:00Z'),
      outstandingBalance: userEntered(Money.of('15000', 'JOD'), '2026-01-01T00:00:00Z'),
      installment: userEntered(Money.of('350', 'JOD'), '2026-01-01T00:00:00Z'),
      rateType: overrides.rateType,
      ratePeriods: [],
      termMonths: userEntered(60, '2026-01-01T00:00:00Z'),
      startDate: toLocalDate('2020-01-01'),
      maturityDate: toLocalDate('2030-01-01'),
      paymentFrequency: 'monthly',
    },
  }
}

function makeCard(id: string): CreditCard {
  return {
    id: brandId(id),
    userId: brandId('user-1'),
    nickname: 'Card',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    kind: 'creditCard',
    connectionType: 'official',
    cardDetails: {
      creditLimit: userEntered(Money.of('4000', 'JOD'), '2026-01-01T00:00:00Z'),
      currentBalance: userEntered(Money.of('1000', 'JOD'), '2026-01-01T00:00:00Z'),
    },
  }
}

describe('computeBenchmarkImpact', () => {
  it('flags only open, variable-rate conventional loans as potentially affected', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'variable-open', rateType: 'variable' }),
      makeLoan({ id: 'fixed-open', rateType: 'fixed' }),
      makeLoan({ id: 'variable-closed', rateType: 'variable', closed: true }),
      makeCard('card-1'),
    ]

    const impact = computeBenchmarkImpact(obligations)

    expect(impact.potentiallyAffected.map((l) => l.obligationId)).toEqual(['variable-open'])
  })

  it('never claims contract impact is calculable and counts every affected loan as missing benchmark info', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'v1', rateType: 'variable' }),
      makeLoan({ id: 'v2', rateType: 'variable' }),
    ]

    const impact = computeBenchmarkImpact(obligations)

    expect(impact.contractImpactCalculable).toBe(false)
    expect(impact.missingBenchmarkInfoCount).toBe(2)
    expect(impact.contractImpactMessage).toMatch(/cannot be calculated/i)
  })

  it('returns an empty result for no obligations', () => {
    const impact = computeBenchmarkImpact([])
    expect(impact.potentiallyAffected).toHaveLength(0)
    expect(impact.missingBenchmarkInfoCount).toBe(0)
  })
})
