import {
  brandId,
  Money,
  Rate,
  toCanonicalJsonValue,
  toLocalDate,
  type RatePeriod,
} from '@eltizamati/domain'
import { snapshotRecord } from '@/services/calculation-snapshot'
import {
  applicableRatePeriods,
  projectedRemainingPayable,
  rateHistoryFingerprint,
  totalContractualPayable,
} from './projection-display'

function period(id: string, rate: string, effectiveFrom: string): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(id),
    obligationId: brandId<'obligation'>('loan-1'),
    annualRate: Rate.fromPercent(rate),
    effectiveFrom: toLocalDate(effectiveFrom),
    provenance: {
      source: 'demo',
      observedAt: '2026-01-01T00:00:00Z',
      recordedAt: '2026-01-01T00:00:00Z',
    },
    createdAt: '2026-01-01T00:00:00Z',
  }
}

describe('projection display helpers', () => {
  it('changes the calculation fingerprint when a published rate is appended', () => {
    const first = period('rate-1', '7.5', '2025-01-01')
    const second = period('rate-2', '9.25', '2026-01-01')

    expect(rateHistoryFingerprint([first, second])).not.toBe(rateHistoryFingerprint([first]))
  })

  it('selects the nearest non-corrected rate effective on or before asOf', () => {
    const old = period('rate-old', '7.5', '2025-01-01')
    const current = period('rate-current', '9.25', '2026-01-01')
    const future = period('rate-future', '11', '2027-01-01')

    expect(applicableRatePeriods([future, old, current], toLocalDate('2026-07-01'))).toEqual([
      current,
      old,
    ])
  })

  it('totals only remaining payments and residual, never creates a balloon row', () => {
    const canonical = toCanonicalJsonValue({
      schedule: [
        { date: '2026-06-01', payment: Money.of('300', 'JOD') },
        { date: '2026-08-01', payment: Money.of('300', 'JOD') },
        { date: '2026-09-01', payment: Money.of('300', 'JOD') },
      ],
      projectedResidualAtMaturity: Money.of('50', 'JOD'),
    })
    expect(canonical.ok).toBe(true)
    if (!canonical.ok) return

    const total = projectedRemainingPayable(
      snapshotRecord(canonical.value),
      'JOD',
      toLocalDate('2026-07-01'),
    )
    expect(total?.toStorageString()).toBe('650')
  })

  it('totals every schedule entry regardless of asOf, unlike projectedRemainingPayable', () => {
    const canonical = toCanonicalJsonValue({
      schedule: [
        { date: '2026-06-01', payment: Money.of('300', 'JOD') },
        { date: '2026-08-01', payment: Money.of('300', 'JOD') },
        { date: '2026-09-01', payment: Money.of('300', 'JOD') },
      ],
      projectedResidualAtMaturity: Money.of('50', 'JOD'),
    })
    expect(canonical.ok).toBe(true)
    if (!canonical.ok) return

    const total = totalContractualPayable(snapshotRecord(canonical.value), 'JOD')
    expect(total?.toStorageString()).toBe('950')
  })
})
