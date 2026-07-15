import { describe, expect, it } from 'vitest'
import {
  brandId,
  demoSourced,
  Money,
  Rate,
  toLocalDate,
  userEntered,
  type ConventionalLoan,
  type RatePeriod,
} from '@eltizamati/domain'
import { computeImpactPreview } from './impact-preview-service'

function ratePeriod(
  id: string,
  obligationId: string,
  annualRate: string,
  effectiveFrom: string,
): RatePeriod {
  return {
    id: brandId(id),
    obligationId: brandId(obligationId),
    annualRate: Rate.fromDecimal(annualRate),
    effectiveFrom: toLocalDate(effectiveFrom),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

function makeLoan(overrides: {
  outstandingBalance?: number
  ratePeriods?: readonly RatePeriod[]
  contractualBalloon?: number
}): ConventionalLoan {
  return {
    id: brandId('loan-1'),
    userId: brandId('user-1'),
    nickname: 'Demo loan',
    institution: { name: 'Test Bank' },
    currency: 'JOD',
    openedDate: toLocalDate('2020-01-01'),
    provenance: demoSourced(undefined, 'v1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
      .provenance,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    kind: 'conventionalLoan',
    loanDetails: {
      originalPrincipal: userEntered(Money.of('20000', 'JOD'), '2020-01-01T00:00:00Z'),
      outstandingBalance:
        overrides.outstandingBalance !== undefined
          ? userEntered(
              Money.of(String(overrides.outstandingBalance), 'JOD'),
              '2026-07-01T00:00:00Z',
            )
          : undefined,
      installment: userEntered(Money.of('306.87', 'JOD'), '2020-01-01T00:00:00Z'),
      rateType: 'variable',
      ratePeriods: overrides.ratePeriods ?? [ratePeriod('rp-1', 'loan-1', '0.075', '2020-01-01')],
      termMonths: userEntered(84, '2020-01-01T00:00:00Z'),
      startDate: toLocalDate('2020-01-01'),
      maturityDate: toLocalDate('2027-01-01'),
      paymentFrequency: 'monthly',
      contractualBalloon:
        overrides.contractualBalloon !== undefined
          ? userEntered(
              Money.of(String(overrides.contractualBalloon), 'JOD'),
              '2020-01-01T00:00:00Z',
            )
          : undefined,
    },
  }
}

const ASOF = toLocalDate('2026-07-16')

describe('computeImpactPreview', () => {
  it('refuses to project when the servicing policy is unknown', () => {
    const loan = makeLoan({ outstandingBalance: 8000 })
    const outcome = computeImpactPreview({
      loan,
      newAnnualRate: Rate.fromDecimal('0.0925'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'unknownTreatment',
      asOf: ASOF,
    })
    expect(outcome.kind).toBe('unavailable')
  })

  it('reports unavailable when there is no active (non-superseded) rate period', () => {
    const loan = makeLoan({
      ratePeriods: [
        {
          ...ratePeriod('rp-1', 'loan-1', '0.075', '2020-01-01'),
          supersededBy: brandId('rp-2'),
        },
      ],
    })
    const outcome = computeImpactPreview({
      loan,
      newAnnualRate: Rate.fromDecimal('0.0925'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'unchanged',
      asOf: ASOF,
    })
    expect(outcome.kind).toBe('unavailable')
  })

  it('shows an unchanged installment with a larger interest share and a possible residual after a rate increase', () => {
    const loan = makeLoan({ outstandingBalance: 8000 })
    const outcome = computeImpactPreview({
      loan,
      newAnnualRate: Rate.fromDecimal('0.0925'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'unchanged',
      asOf: ASOF,
    })

    expect(outcome.kind).toBe('available')
    if (outcome.kind !== 'available') return

    expect(outcome.installmentPolicy).toBe('unchanged')
    expect(outcome.installment.toStorageString()).toBe('306.87')
    // A higher rate under an unchanged installment must increase the interest
    // portion of the affected period relative to the pre-change baseline.
    expect(outcome.newInterestPortion.isGreaterThan(outcome.previousInterestPortion)).toBe(true)
    expect(outcome.newPrincipalPortion.isGreaterThan(outcome.previousPrincipalPortion)).toBe(false)
  })

  it('re-levels the installment under the recalculated policy instead of leaving a residual', () => {
    const loan = makeLoan({ outstandingBalance: 8000 })
    const outcome = computeImpactPreview({
      loan,
      newAnnualRate: Rate.fromDecimal('0.0925'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'recalculated',
      asOf: ASOF,
    })

    expect(outcome.kind).toBe('available')
    if (outcome.kind !== 'available') return
    expect(outcome.projectedResidualAtMaturity.toStorageString()).toBe('0')
  })

  it('never copies the projected residual into contractualBalloon and reports the contractual figure separately', () => {
    const loan = makeLoan({ outstandingBalance: 8000, contractualBalloon: 500 })
    const outcome = computeImpactPreview({
      loan,
      newAnnualRate: Rate.fromDecimal('0.0925'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'unchanged',
      asOf: ASOF,
    })

    expect(outcome.kind).toBe('available')
    if (outcome.kind !== 'available') return
    // The contractual balloon (500) is a fixed contract fact, entirely
    // independent from whatever the engine projects as a residual.
    expect(loan.loanDetails.contractualBalloon?.value.toStorageString()).toBe('500')
    expect(outcome.projectedResidualAtMaturity.toStorageString()).not.toBe('500')
  })
})
