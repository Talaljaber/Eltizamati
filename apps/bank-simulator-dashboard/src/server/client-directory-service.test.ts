import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type Insight,
  type Obligation,
  type UserProfile,
} from '@eltizamati/domain'
import { buildClientDirectoryRows, filterClientDirectoryRows } from './client-directory-service'

const TODAY = toLocalDate('2026-07-16')

function makeProfile(
  overrides: Omit<Partial<UserProfile>, 'userId'> & { userId: string },
): UserProfile {
  return {
    locale: 'en',
    dataMode: 'personal',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
    userId: brandId<'user'>(overrides.userId),
  }
}

function makeLoan(overrides: {
  id: string
  userId: string
  rateType: 'fixed' | 'variable'
  outstandingBalance?: number
  institution?: string
  closed?: boolean
}): ConventionalLoan {
  return {
    id: brandId(overrides.id),
    userId: brandId<'user'>(overrides.userId),
    nickname: 'Loan',
    institution: { name: overrides.institution ?? 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    ...(overrides.closed === true ? { closedDate: toLocalDate('2026-06-01') } : {}),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
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
      maturityDate: toLocalDate('2030-01-01'),
      paymentFrequency: 'monthly',
    },
  }
}

describe('buildClientDirectoryRows', () => {
  it('masks the client name and aggregates per-client figures', () => {
    const profiles = [
      makeProfile({ userId: 'user-1', fullName: 'Talal Jaber', primaryBank: 'Test Bank' }),
    ]
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'loan-1', userId: 'user-1', rateType: 'variable', outstandingBalance: 5000 }),
    ]

    const rows = buildClientDirectoryRows(profiles, obligations, [], TODAY)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.maskedName).toBe('Talal J.')
    expect(rows[0]?.obligationCount).toBe(1)
    expect(rows[0]?.hasVariableRateExposure).toBe(true)
    expect(rows[0]?.totalKnownMonthlyCommitment).toBe('350')
    expect(rows[0]?.dataCompleteness).toBe('complete')
  })

  it('marks a client incomplete when an active loan is missing its balance', () => {
    const profiles = [makeProfile({ userId: 'user-1' })]
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'loan-1', userId: 'user-1', rateType: 'fixed' }),
    ]

    const rows = buildClientDirectoryRows(profiles, obligations, [], TODAY)

    expect(rows[0]?.dataCompleteness).toBe('incomplete')
  })

  it('only counts unread insights scoped to the client’s own obligations', () => {
    const profiles = [makeProfile({ userId: 'user-1' })]
    const obligations: readonly Obligation[] = [
      makeLoan({ id: 'loan-1', userId: 'user-1', rateType: 'fixed', outstandingBalance: 100 }),
    ]
    const insights: readonly Insight[] = [
      {
        id: brandId('insight-1'),
        userId: brandId<'user'>('user-1'),
        obligationId: brandId('loan-1'),
        ruleId: 'RATE_INCREASED',
        severity: 'attention',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'h1',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: brandId('insight-2'),
        userId: brandId<'user'>('user-1'),
        obligationId: brandId('some-other-obligation'),
        ruleId: 'RATE_INCREASED',
        severity: 'attention',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'h2',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: brandId('insight-3'),
        userId: brandId<'user'>('user-1'),
        obligationId: brandId('loan-1'),
        ruleId: 'RATE_INCREASED',
        severity: 'attention',
        titleKey: 'x',
        bodyKey: 'y',
        triggerHash: 'h3',
        readAt: '2026-02-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]

    const rows = buildClientDirectoryRows(profiles, obligations, insights, TODAY)

    expect(rows[0]?.activeInsightCount).toBe(1)
  })
})

describe('filterClientDirectoryRows', () => {
  const profiles = [
    makeProfile({ userId: 'user-1', locale: 'en', primaryBank: 'Bank A' }),
    makeProfile({ userId: 'user-2', locale: 'ar', primaryBank: 'Bank B' }),
  ]
  const obligations: readonly Obligation[] = [
    makeLoan({
      id: 'loan-1',
      userId: 'user-1',
      rateType: 'variable',
      outstandingBalance: 1000,
      institution: 'Bank A',
    }),
    makeLoan({
      id: 'loan-2',
      userId: 'user-2',
      rateType: 'fixed',
      outstandingBalance: 1000,
      institution: 'Bank B',
      closed: true,
    }),
  ]
  const rows = buildClientDirectoryRows(profiles, obligations, [], TODAY)

  it('filters by locale', () => {
    expect(filterClientDirectoryRows(rows, { locale: 'ar' })).toHaveLength(1)
  })

  it('filters by rate exposure', () => {
    expect(
      filterClientDirectoryRows(rows, { rateExposure: 'variable' }).map((r) => r.userId),
    ).toEqual(['user-1'])
  })

  it('filters by obligation state', () => {
    expect(
      filterClientDirectoryRows(rows, { obligationState: 'closed' }).map((r) => r.userId),
    ).toEqual(['user-2'])
  })

  it('filters by institution', () => {
    expect(filterClientDirectoryRows(rows, { institution: 'Bank A' }).map((r) => r.userId)).toEqual(
      ['user-1'],
    )
  })
})
