import { brandId, Money, Rate, toLocalDate, type RatePeriod } from '@eltizamati/domain'
import { describe, expect, it } from 'vitest'
import { addedCostFromRepricing } from './added-cost-from-repricing.js'

const originalPeriod: RatePeriod = {
  id: brandId<'ratePeriod'>('rate-1'),
  obligationId: brandId<'obligation'>('loan-1'),
  annualRate: Rate.fromPercent('7.5'),
  effectiveFrom: toLocalDate('2025-01-01'),
  provenance: {
    source: 'demo',
    observedAt: '2025-01-01T00:00:00.000Z',
    recordedAt: '2025-01-01T00:00:00.000Z',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
}

const repricedPeriod: RatePeriod = {
  ...originalPeriod,
  id: brandId<'ratePeriod'>('rate-2'),
  annualRate: Rate.fromPercent('9.25'),
  effectiveFrom: toLocalDate('2026-03-01'),
}

const baseInputs = {
  principal: Money.of('20000', 'JOD'),
  termMonths: 84,
  startDate: toLocalDate('2025-01-01'),
  installment: Money.of('310', 'JOD'),
  asOf: toLocalDate('2026-07-01'),
}

describe('addedCostFromRepricing.v1', () => {
  it('reports a positive added cost when the rate increased', () => {
    const outcome = addedCostFromRepricing({
      ...baseInputs,
      ratePeriods: [originalPeriod, repricedPeriod],
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind !== 'ok') return
    expect(outcome.value.hasReprice).toBe(true)
    expect(outcome.value.addedTotalCost.isPositive()).toBe(true)
    expect(
      outcome.value.actualTotalCost.equals(
        outcome.value.hypotheticalTotalCost.add(outcome.value.addedTotalCost),
      ),
    ).toBe(true)
  })

  it('reports zero added cost with no rate change on file', () => {
    const outcome = addedCostFromRepricing({
      ...baseInputs,
      ratePeriods: [originalPeriod],
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind !== 'ok') return
    expect(outcome.value.hasReprice).toBe(false)
    expect(outcome.value.addedTotalCost.isZero()).toBe(true)
  })

  it('reports a negative added cost (savings) when the rate decreased', () => {
    const decreasedPeriod: RatePeriod = {
      ...repricedPeriod,
      annualRate: Rate.fromPercent('5'),
    }
    const outcome = addedCostFromRepricing({
      ...baseInputs,
      ratePeriods: [originalPeriod, decreasedPeriod],
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind !== 'ok') return
    expect(outcome.value.addedTotalCost.isNegative()).toBe(true)
  })

  it('never mutates the caller-supplied rate history', () => {
    const ratePeriods = [originalPeriod, repricedPeriod]
    const before = JSON.stringify(ratePeriods)
    addedCostFromRepricing({ ...baseInputs, ratePeriods })
    expect(JSON.stringify(ratePeriods)).toBe(before)
  })

  it('refuses when required fields are missing', () => {
    expect(
      addedCostFromRepricing({ asOf: toLocalDate('2026-07-01') }),
    ).toMatchObject({
      kind: 'refused',
      missing: expect.arrayContaining([{ field: 'principal' }]),
    })
  })
})
