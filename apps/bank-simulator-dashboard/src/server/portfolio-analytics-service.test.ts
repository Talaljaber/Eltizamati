import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  Rate,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type Insight,
  type Obligation,
  type RatePeriod,
} from '@eltizamati/domain'
import { computePortfolioAnalytics } from './portfolio-analytics-service'
import type { EmailOutboxRow } from './repositories/demo-email-outbox-repository'

function ratePeriod(overrides: {
  id: string
  obligationId: string
  annualRate: string
  effectiveFrom: string
}): RatePeriod {
  return {
    id: brandId(overrides.id),
    obligationId: brandId(overrides.obligationId),
    annualRate: Rate.fromDecimal(overrides.annualRate),
    effectiveFrom: toLocalDate(overrides.effectiveFrom),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function makeLoan(overrides: {
  id: string
  rateType: 'fixed' | 'variable' | 'mixed' | 'unknown'
  outstandingBalance?: number
  ratePeriods?: readonly RatePeriod[]
  maturityDate?: string
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
      outstandingBalance:
        overrides.outstandingBalance !== undefined
          ? userEntered(
              Money.of(String(overrides.outstandingBalance), 'JOD'),
              '2026-01-01T00:00:00Z',
            )
          : undefined,
      installment: userEntered(Money.of('350', 'JOD'), '2026-01-01T00:00:00Z'),
      rateType: overrides.rateType,
      ratePeriods: overrides.ratePeriods ?? [],
      termMonths: userEntered(60, '2026-01-01T00:00:00Z'),
      startDate: toLocalDate('2020-01-01'),
      maturityDate: toLocalDate(overrides.maturityDate ?? '2030-01-01'),
      paymentFrequency: 'monthly',
    },
  }
}

function makeInsight(id: string, severity: Insight['severity'], readAt?: string): Insight {
  return {
    id: brandId(id),
    userId: brandId('user-1'),
    ruleId: 'RESIDUAL_RISK',
    severity,
    titleKey: 'insight.title',
    bodyKey: 'insight.body',
    triggerHash: `hash-${id}`,
    createdAt: '2026-01-01T00:00:00Z',
    ...(readAt !== undefined ? { readAt } : {}),
  }
}

describe('computePortfolioAnalytics', () => {
  it('buckets active obligations by product type and totals known balances', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'l1', rateType: 'fixed', outstandingBalance: 1000 }),
      makeLoan({ id: 'l2', rateType: 'variable', outstandingBalance: 2000 }),
    ]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    const conventional = analytics.byKind.find((b) => b.label === 'Conventional loan')
    expect(conventional?.count).toBe(2)
    expect(conventional?.amount.toStorageString()).toBe('3000')
  })

  it('excludes closed obligations from every distribution', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'closed', rateType: 'variable', outstandingBalance: 5000, closed: true }),
    ]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    expect(analytics.byKind).toHaveLength(0)
  })

  it('counts obligations with no known balance separately rather than as zero', () => {
    const obligations: readonly Obligation[] = [makeLoan({ id: 'no-balance', rateType: 'fixed' })]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    const unknown = analytics.balanceBuckets.find((b) => b.label === 'Balance unknown')
    expect(unknown?.count).toBe(1)
  })

  it('splits fixed vs variable rate exposure by outstanding balance', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'fixed', rateType: 'fixed', outstandingBalance: 1000 }),
      makeLoan({ id: 'variable', rateType: 'variable', outstandingBalance: 2000 }),
    ]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    const fixed = analytics.rateTypeDistribution.find((b) => b.label === 'Fixed')
    const variable = analytics.rateTypeDistribution.find((b) => b.label === 'Variable')
    expect(fixed?.amount.toStorageString()).toBe('1000')
    expect(variable?.amount.toStorageString()).toBe('2000')
  })

  it('groups conventional loans by maturity quarter', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'l1', rateType: 'fixed', maturityDate: '2027-02-15' }),
      makeLoan({ id: 'l2', rateType: 'fixed', maturityDate: '2027-05-01' }),
    ]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    expect(analytics.maturityTimeline).toEqual([
      { label: '2027 Q1', count: 1 },
      { label: '2027 Q2', count: 1 },
    ])
  })

  it('buckets the latest active rate per loan', () => {
    const obligations: readonly Obligation[] = [
      makeLoan({
        id: 'l1',
        rateType: 'variable',
        ratePeriods: [
          ratePeriod({ id: 'rp1', obligationId: 'l1', annualRate: '0.06', effectiveFrom: '2020-01-01' }),
        ],
      }),
    ]

    const analytics = computePortfolioAnalytics(obligations, [], [])

    const bucket = analytics.rateBuckets.find((b) => b.label === '5–7%')
    expect(bucket?.count).toBe(1)
  })

  it('counts only unread insights by severity', () => {
    const insights: readonly Insight[] = [
      makeInsight('i1', 'urgent'),
      makeInsight('i2', 'urgent', '2026-02-01T00:00:00Z'),
      makeInsight('i3', 'attention'),
    ]

    const analytics = computePortfolioAnalytics([], insights, [])

    const urgent = analytics.insightSeverityDistribution.find((b) => b.label === 'urgent')
    expect(urgent?.count).toBe(1)
  })

  it('tallies notification delivery status from the outbox', () => {
    const outbox: readonly EmailOutboxRow[] = [
      {
        id: 'o1',
        campaignId: null,
        userId: 'user-1',
        locale: 'en',
        recipientMasked: 't***@example.com',
        templateId: 'rate-change-en',
        status: 'sent',
        attemptCount: 1,
        idempotencyKey: 'k1',
        createdAt: '2026-01-01T00:00:00Z',
        sentAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'o2',
        campaignId: null,
        userId: 'user-1',
        locale: 'en',
        recipientMasked: 't***@example.com',
        templateId: 'rate-change-en',
        status: 'suppressed',
        attemptCount: 0,
        idempotencyKey: 'k2',
        createdAt: '2026-01-01T00:00:00Z',
        sentAt: null,
      },
    ]

    const analytics = computePortfolioAnalytics([], [], outbox)

    expect(analytics.deliveryStatusDistribution).toEqual(
      expect.arrayContaining([
        { label: 'sent', count: 1 },
        { label: 'suppressed', count: 1 },
      ]),
    )
  })
})
