import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type CreditCard,
  type Insight,
  type Obligation,
} from '@eltizamati/domain'
import { computeOverviewStats } from './overview-service'

const TODAY = toLocalDate('2026-07-16')

function baseFields(id: string, nickname: string) {
  return {
    id: brandId<'obligation'>(id),
    userId: brandId<'user'>('user-1'),
    nickname,
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

function makeLoan(overrides: {
  id: string
  nickname: string
  rateType: 'fixed' | 'variable'
  outstandingBalance?: number
  maturityDate: string
  closed?: boolean
}): ConventionalLoan {
  return {
    ...baseFields(overrides.id, overrides.nickname),
    ...(overrides.closed === true ? { closedDate: toLocalDate('2026-06-01') } : {}),
    kind: 'conventionalLoan',
    loanDetails: {
      originalPrincipal: userEntered(Money.of('20000', 'JOD'), '2026-01-01T00:00:00Z'),
      outstandingBalance:
        overrides.outstandingBalance !== undefined
          ? userEntered(
              Money.of(String(overrides.outstandingBalance), 'JOD'),
              '2026-01-01T00:00:00Z',
            )
          : undefined,
      installment: userEntered(Money.of('350', 'JOD'), '2026-01-01T00:00:00Z'),
      rateType: overrides.rateType,
      ratePeriods: [],
      termMonths: userEntered(60, '2026-01-01T00:00:00Z'),
      startDate: toLocalDate('2020-01-01'),
      maturityDate: toLocalDate(overrides.maturityDate),
      paymentFrequency: 'monthly',
    },
  }
}

function makeCard(overrides: {
  id: string
  nickname: string
  creditLimit: number
  currentBalance: number
}): CreditCard {
  return {
    ...baseFields(overrides.id, overrides.nickname),
    kind: 'creditCard',
    cardDetails: {
      creditLimit: userEntered(
        Money.of(String(overrides.creditLimit), 'JOD'),
        '2026-01-01T00:00:00Z',
      ),
      currentBalance: userEntered(
        Money.of(String(overrides.currentBalance), 'JOD'),
        '2026-01-01T00:00:00Z',
      ),
    },
  }
}

describe('computeOverviewStats', () => {
  it('sums fixed and variable exposure separately and excludes closed obligations', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({
        id: 'loan-1',
        nickname: 'Fixed loan',
        rateType: 'fixed',
        outstandingBalance: 10000,
        maturityDate: '2030-01-01',
      }),
      makeLoan({
        id: 'loan-2',
        nickname: 'Variable loan',
        rateType: 'variable',
        outstandingBalance: 5000,
        maturityDate: '2030-01-01',
      }),
      makeLoan({
        id: 'loan-closed',
        nickname: 'Closed loan',
        rateType: 'fixed',
        outstandingBalance: 999,
        maturityDate: '2030-01-01',
        closed: true,
      }),
    ]

    const stats = computeOverviewStats(1, obligations, [], TODAY)

    expect(stats.activeObligations).toBe(2)
    expect(stats.fixedRateExposure.amount.toStorageString()).toBe('10000')
    expect(stats.fixedRateExposure.loanCount).toBe(1)
    expect(stats.variableRateExposure.amount.toStorageString()).toBe('5000')
    expect(stats.variableRateExposure.loanCount).toBe(1)
  })

  it('never treats a missing balance as zero — excludes it and counts it as incomplete', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({
        id: 'loan-1',
        nickname: 'No balance known',
        rateType: 'variable',
        maturityDate: '2030-01-01',
      }),
    ]

    const stats = computeOverviewStats(1, obligations, [], TODAY)

    expect(stats.totalOutstanding.amount.toStorageString()).toBe('0')
    expect(stats.totalOutstanding.excludedCount).toBe(1)
    expect(stats.incompleteDataCount).toBe(1)
  })

  it('flags maturities within the 90-day horizon and excludes ones further out', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({
        id: 'loan-soon',
        nickname: 'Maturing soon',
        rateType: 'fixed',
        outstandingBalance: 100,
        maturityDate: '2026-08-01', // 16 days out
      }),
      makeLoan({
        id: 'loan-far',
        nickname: 'Maturing later',
        rateType: 'fixed',
        outstandingBalance: 100,
        maturityDate: '2028-01-01',
      }),
    ]

    const stats = computeOverviewStats(1, obligations, [], TODAY)

    expect(stats.upcomingMaturities).toHaveLength(1)
    expect(stats.upcomingMaturities[0]?.obligationId).toBe('loan-soon')
  })

  it('flags a card over 70% utilization and not one under', () => {
    const obligations: readonly Obligation[] = [
      makeCard({ id: 'card-high', nickname: 'High util', creditLimit: 1000, currentBalance: 800 }),
      makeCard({ id: 'card-low', nickname: 'Low util', creditLimit: 1000, currentBalance: 200 }),
    ]

    const stats = computeOverviewStats(1, obligations, [], TODAY)

    expect(stats.highUtilizationCards).toHaveLength(1)
    expect(stats.highUtilizationCards[0]?.obligationId).toBe('card-high')
    expect(stats.highUtilizationCards[0]?.utilizationPercent).toBe(80)
  })

  it('counts unread RESIDUAL_RISK insights only', () => {
    const insights: readonly Insight[] = [
      {
        id: brandId('insight-1'),
        userId: brandId('user-1'),
        ruleId: 'RESIDUAL_RISK',
        severity: 'urgent',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'hash-1',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: brandId('insight-2'),
        userId: brandId('user-1'),
        ruleId: 'RESIDUAL_RISK',
        severity: 'urgent',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'hash-2',
        readAt: '2026-01-02T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: brandId('insight-3'),
        userId: brandId('user-1'),
        ruleId: 'RATE_INCREASED',
        severity: 'attention',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'hash-3',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]

    const stats = computeOverviewStats(1, [], insights, TODAY)

    expect(stats.activeResidualRiskInsights).toBe(1)
  })
})
