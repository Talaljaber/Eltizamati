/**
 * BR-OBL-002: rate periods are contiguous, non-overlapping, ordered.
 */
import { describe, it, expect } from 'vitest'
import { validateRatePeriods } from './validate-rate-periods.js'
import { brandId, toLocalDate } from '../value-objects/id.js'
import { Rate } from '../value-objects/money.js'
import type { RatePeriod } from '../entities/rate-period.js'

const obligationId = brandId<'obligation'>('obl-1')

function period(
  effectiveFrom: string,
  rate: string,
  overrides: Partial<RatePeriod> = {},
): RatePeriod {
  return {
    id: brandId<'ratePeriod'>(`rp-${effectiveFrom}`),
    obligationId,
    annualRate: Rate.fromPercent(rate),
    effectiveFrom: toLocalDate(effectiveFrom),
    provenance: { source: 'demo', observedAt: effectiveFrom, recordedAt: effectiveFrom },
    createdAt: `${effectiveFrom}T00:00:00.000Z`,
    ...overrides,
  }
}

describe('validateRatePeriods', () => {
  it('BR-OBL-002: accepts a single valid period', () => {
    const result = validateRatePeriods([period('2024-01-15', '7.5')])
    expect(result.ok).toBe(true)
  })

  it('BR-OBL-002: accepts ordered, non-overlapping periods', () => {
    const result = validateRatePeriods([period('2024-01-15', '7.5'), period('2025-03-15', '9.25')])
    expect(result.ok).toBe(true)
  })

  it('BR-OBL-002: rejects an empty history', () => {
    const result = validateRatePeriods([])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.safeMetadata?.['reason']).toBe('empty')
  })

  it('BR-OBL-002: rejects two active periods sharing the same effective date', () => {
    const result = validateRatePeriods([period('2024-01-15', '7.5'), period('2024-01-15', '9.25')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.safeMetadata?.['reason']).toBe('duplicateEffectiveFrom')
  })

  it('BR-RATE-001: excludes superseded periods from the ordering check (append-only correction)', () => {
    const superseding = period('2024-01-15', '9.25')
    const superseded = period('2024-01-15', '7.5', { supersededBy: superseding.id })
    const result = validateRatePeriods([superseded, superseding])
    expect(result.ok).toBe(true)
  })

  it('is order-independent (accepts periods passed out of chronological order)', () => {
    const result = validateRatePeriods([period('2025-03-15', '9.25'), period('2024-01-15', '7.5')])
    expect(result.ok).toBe(true)
  })
})
