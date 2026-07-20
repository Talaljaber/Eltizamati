import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  Rate,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type CreditCard,
  type MurabahaFinancing,
  type Obligation,
  type RatePeriod,
} from '@eltizamati/domain'
import { evaluateRateCampaignEligibility } from './rate-campaign-eligibility'

function ratePeriod(overrides: {
  id: string
  obligationId: string
  annualRate: string
  effectiveFrom: string
  supersededBy?: string
}): RatePeriod {
  return {
    id: brandId(overrides.id),
    obligationId: brandId(overrides.obligationId),
    annualRate: Rate.fromDecimal(overrides.annualRate),
    effectiveFrom: toLocalDate(overrides.effectiveFrom),
    ...(overrides.supersededBy !== undefined
      ? { supersededBy: brandId(overrides.supersededBy) }
      : {}),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function makeLoan(overrides: {
  id: string
  rateType: 'fixed' | 'variable' | 'mixed' | 'unknown'
  institution: string
  outstandingBalance?: number
  ratePeriods?: readonly RatePeriod[]
  closed?: boolean
}): ConventionalLoan {
  return {
    id: brandId(overrides.id),
    userId: brandId('user-1'),
    nickname: 'Loan',
    institution: { name: overrides.institution },
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
      maturityDate: toLocalDate('2030-01-01'),
      paymentFrequency: 'monthly',
    },
  }
}

function makeMurabaha(id: string, institution: string): MurabahaFinancing {
  return {
    id: brandId(id),
    userId: brandId('user-1'),
    nickname: 'Murabaha',
    institution: { name: institution },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    kind: 'murabaha',
    connectionType: 'official',
    murabahaDetails: {
      totalSalePrice: userEntered(Money.of('18600', 'JOD'), '2026-01-01T00:00:00Z'),
      assetCost: userEntered(Money.of('15000', 'JOD'), '2026-01-01T00:00:00Z'),
      disclosedProfit: userEntered(Money.of('3600', 'JOD'), '2026-01-01T00:00:00Z'),
      installment: userEntered(Money.of('310', 'JOD'), '2026-01-01T00:00:00Z'),
      termMonths: userEntered(60, '2026-01-01T00:00:00Z'),
      startDate: toLocalDate('2020-01-01'),
    },
  }
}

function makeCard(id: string, institution: string): CreditCard {
  return {
    id: brandId(id),
    userId: brandId('user-1'),
    nickname: 'Card',
    institution: { name: institution },
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

const INSTITUTION = 'Test Bank'

describe('evaluateRateCampaignEligibility', () => {
  it('includes a variable-rate loan with known balance and current rate at the target institution', () => {
    const loan = makeLoan({
      id: 'loan-1',
      rateType: 'variable',
      institution: INSTITUTION,
      outstandingBalance: 15000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-1',
          obligationId: 'loan-1',
          annualRate: '0.075',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })

    const result = evaluateRateCampaignEligibility([loan], INSTITUTION)

    expect(result.eligible).toHaveLength(1)
    expect(result.eligible[0]?.obligation.id).toBe('loan-1')
    expect(result.excluded).toHaveLength(0)
  })

  it('excludes Murabaha, credit cards, fixed-rate loans, and institution mismatches with distinct reasons', () => {
    const fixedLoan = makeLoan({
      id: 'loan-fixed',
      rateType: 'fixed',
      institution: INSTITUTION,
      outstandingBalance: 1000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-2',
          obligationId: 'loan-fixed',
          annualRate: '0.06',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })
    const otherBankLoan = makeLoan({
      id: 'loan-other-bank',
      rateType: 'variable',
      institution: 'Other Bank',
      outstandingBalance: 1000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-3',
          obligationId: 'loan-other-bank',
          annualRate: '0.06',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })
    const obligations: readonly Obligation[] = [
      fixedLoan,
      otherBankLoan,
      makeMurabaha('murabaha-1', INSTITUTION),
      makeCard('card-1', INSTITUTION),
    ]

    const result = evaluateRateCampaignEligibility(obligations, INSTITUTION)

    expect(result.eligible).toHaveLength(0)
    const reasons = Object.fromEntries(result.excluded.map((x) => [x.obligationId, x.reason]))
    expect(reasons['loan-fixed']).toBe('fixedRate')
    expect(reasons['loan-other-bank']).toBe('institutionMismatch')
    expect(reasons['murabaha-1']).toBe('notConventionalLoan')
    expect(reasons['card-1']).toBe('notConventionalLoan')
  })

  it('excludes a variable loan missing balance or missing current rate', () => {
    const missingBalance = makeLoan({
      id: 'loan-no-balance',
      rateType: 'variable',
      institution: INSTITUTION,
      ratePeriods: [
        ratePeriod({
          id: 'rp-4',
          obligationId: 'loan-no-balance',
          annualRate: '0.06',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })
    const missingRate = makeLoan({
      id: 'loan-no-rate',
      rateType: 'variable',
      institution: INSTITUTION,
      outstandingBalance: 1000,
      ratePeriods: [],
    })

    const result = evaluateRateCampaignEligibility([missingBalance, missingRate], INSTITUTION)

    expect(result.eligible).toHaveLength(0)
    const reasons = Object.fromEntries(result.excluded.map((x) => [x.obligationId, x.reason]))
    expect(reasons['loan-no-balance']).toBe('missingBalance')
    expect(reasons['loan-no-rate']).toBe('missingCurrentRate')
  })

  it('picks the latest non-corrected period effective by the campaign date', () => {
    const loan = makeLoan({
      id: 'loan-1',
      rateType: 'variable',
      institution: INSTITUTION,
      outstandingBalance: 1000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-old',
          obligationId: 'loan-1',
          annualRate: '0.075',
          effectiveFrom: '2020-01-01',
        }),
        ratePeriod({
          id: 'rp-new',
          obligationId: 'loan-1',
          annualRate: '0.0925',
          effectiveFrom: '2025-01-01',
        }),
      ],
    })

    const result = evaluateRateCampaignEligibility([loan], INSTITUTION, toLocalDate('2026-01-01'))

    expect(result.eligible[0]?.currentRate.toStorageString()).toBe('0.0925')
  })

  it('does not treat a future published period as the current rate', () => {
    const loan = makeLoan({
      id: 'loan-1',
      rateType: 'variable',
      institution: INSTITUTION,
      outstandingBalance: 1000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-current',
          obligationId: 'loan-1',
          annualRate: '0.075',
          effectiveFrom: '2026-01-01',
        }),
        ratePeriod({
          id: 'rp-future',
          obligationId: 'loan-1',
          annualRate: '0.11',
          effectiveFrom: '2027-01-01',
        }),
      ],
    })

    const result = evaluateRateCampaignEligibility([loan], INSTITUTION, toLocalDate('2026-07-01'))

    expect(result.eligible[0]?.currentRate.toStorageString()).toBe('0.075')
  })

  it('institution=undefined includes eligible loans from every institution ("apply to all banks")', () => {
    const bankA = makeLoan({
      id: 'loan-bank-a',
      rateType: 'variable',
      institution: 'Bank A',
      outstandingBalance: 1000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-a',
          obligationId: 'loan-bank-a',
          annualRate: '0.06',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })
    const bankB = makeLoan({
      id: 'loan-bank-b',
      rateType: 'variable',
      institution: 'Bank B',
      outstandingBalance: 2000,
      ratePeriods: [
        ratePeriod({
          id: 'rp-b',
          obligationId: 'loan-bank-b',
          annualRate: '0.07',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })
    const fixedAtBankA = makeLoan({
      id: 'loan-fixed-a',
      rateType: 'fixed',
      institution: 'Bank A',
      outstandingBalance: 500,
      ratePeriods: [
        ratePeriod({
          id: 'rp-fixed-a',
          obligationId: 'loan-fixed-a',
          annualRate: '0.05',
          effectiveFrom: '2020-01-01',
        }),
      ],
    })

    const result = evaluateRateCampaignEligibility([bankA, bankB, fixedAtBankA], undefined)

    expect(result.eligible.map((e) => e.obligation.id).sort()).toEqual([
      'loan-bank-a',
      'loan-bank-b',
    ])
    expect(result.excluded.some((x) => x.reason === 'institutionMismatch')).toBe(false)
    expect(result.excluded.find((x) => x.obligationId === 'loan-fixed-a')?.reason).toBe('fixedRate')
  })
})
