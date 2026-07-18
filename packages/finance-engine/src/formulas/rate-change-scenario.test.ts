import { brandId, Money, Rate, toLocalDate, type RatePeriod } from '@eltizamati/domain'
import { describe, expect, it } from 'vitest'
import { rateChangeScenario } from './rate-change-scenario.js'

const period: RatePeriod = {
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

describe('rateChangeScenario.v1', () => {
  const inputs = {
    principal: Money.of('12000', 'JOD'),
    ratePeriods: [period],
    termMonths: 48,
    startDate: toLocalDate('2025-01-01'),
    installment: Money.of('300', 'JOD'),
    hypotheticalAnnualRate: Rate.fromPercent('10'),
    hypotheticalEffectiveDate: toLocalDate('2026-01-01'),
    asOf: toLocalDate('2025-12-01'),
  }

  it('compares a rate change without mutating authoritative history', () => {
    const outcome = rateChangeScenario(inputs)
    expect(outcome.kind).toBe('ok')
    if (outcome.kind !== 'ok') return
    expect(inputs.ratePeriods).toEqual([period])
    expect(outcome.value.installment.toStorageString()).toBe('300')
    expect(
      outcome.value.hypothetical.projectedTotalStillPayable.isGreaterThan(
        outcome.value.baseline.projectedTotalStillPayable,
      ),
    ).toBe(true)
  })

  it('refuses a duplicate effective date', () => {
    const outcome = rateChangeScenario({
      ...inputs,
      hypotheticalEffectiveDate: toLocalDate('2025-01-01'),
    })
    expect(outcome).toMatchObject({
      kind: 'refused',
      missing: [{ field: 'hypotheticalEffectiveDate', reason: 'duplicateEffectiveFrom' }],
    })
  })

  it('uses the rate effective as-of, not a later published rate, as current', () => {
    const futurePeriod: RatePeriod = {
      ...period,
      id: brandId<'ratePeriod'>('rate-future'),
      annualRate: Rate.fromPercent('9'),
      effectiveFrom: toLocalDate('2026-06-01'),
    }
    const outcome = rateChangeScenario({
      ...inputs,
      ratePeriods: [period, futurePeriod],
      hypotheticalEffectiveDate: toLocalDate('2026-09-01'),
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok')
      expect(outcome.value.currentRate.equals(period.annualRate)).toBe(true)
  })

  it('refuses invalid and mixed-obligation histories before calculating', () => {
    const duplicate: RatePeriod = { ...period, id: brandId<'ratePeriod'>('rate-duplicate') }
    expect(rateChangeScenario({ ...inputs, ratePeriods: [period, duplicate] }).kind).toBe('refused')

    const otherLoan: RatePeriod = {
      ...period,
      id: brandId<'ratePeriod'>('rate-other-loan'),
      obligationId: brandId<'obligation'>('loan-2'),
      effectiveFrom: toLocalDate('2025-06-01'),
    }
    expect(rateChangeScenario({ ...inputs, ratePeriods: [period, otherLoan] })).toMatchObject({
      kind: 'refused',
      missing: [{ field: 'ratePeriods', reason: 'mixedObligations' }],
    })
  })

  it('models a decrease without increasing projected total still payable', () => {
    const outcome = rateChangeScenario({
      ...inputs,
      hypotheticalAnnualRate: Rate.fromPercent('4'),
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind !== 'ok') return
    expect(
      outcome.value.hypothetical.projectedTotalStillPayable.isGreaterThan(
        outcome.value.baseline.projectedTotalStillPayable,
      ),
    ).toBe(false)
  })

  it('refuses invalid terms and effective dates outside the loan', () => {
    expect(rateChangeScenario({ ...inputs, termMonths: 0 })).toMatchObject({
      kind: 'refused',
      missing: [{ field: 'termMonths', reason: 'notPositiveInteger' }],
    })
    expect(
      rateChangeScenario({
        ...inputs,
        hypotheticalEffectiveDate: toLocalDate('2035-01-01'),
      }),
    ).toMatchObject({
      kind: 'refused',
      missing: [{ field: 'hypotheticalEffectiveDate', reason: 'outsideLoanTerm' }],
    })
  })
})
