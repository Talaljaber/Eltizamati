import { describe, expect, it } from 'vitest'
import { Money, Rate, toLocalDate } from '@eltizamati/domain'
import { amortization, computeAmortizationSchedule } from './amortization.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily, isPendingFinance, type RawVector } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-1xx-amortization.json')

function vectorInputs(v: RawVector): {
  principal: Money
  annualRate: Rate
  termMonths: number
  startDate: ReturnType<typeof toLocalDate>
} {
  const inputs = v.inputs as {
    principal: string
    annualRatePercent: string
    termMonths: number
    startDate: string
  }
  return {
    principal: Money.of(inputs.principal, 'JOD'),
    annualRate: Rate.fromPercent(inputs.annualRatePercent),
    termMonths: inputs.termMonths,
    startDate: toLocalDate(inputs.startDate),
  }
}

describe('amortization.v1 — analytical vectors', () => {
  it('has the expected vector family loaded', () => {
    expect(vectors.map((v) => v.id)).toEqual(['TV-101', 'TV-102', 'TV-103', 'TV-104', 'TV-105'])
  })

  for (const vector of vectors) {
    it(`${vector.id}: ${vector.description}`, () => {
      const { principal, annualRate, termMonths, startDate } = vectorInputs(vector)
      const asOf = toLocalDate(vector.asOf)
      const result = computeAmortizationSchedule(principal, annualRate, termMonths, startDate, asOf)

      // BR-CALC-008: every vector must close to exactly zero regardless of
      // whether its numeric expectation is pending finance sign-off.
      const finalEntry = result.schedule[result.schedule.length - 1]
      expect(finalEntry).toBeDefined()
      expect(finalEntry?.closingBalance.isZero()).toBe(true)

      if (isPendingFinance(vector)) {
        return
      }

      const expected = vector.expected as {
        computedInstallment?: string
        singlePayment?: string
        totalCost?: string
        finalClosingBalance: string
      }

      expect(finalEntry?.closingBalance.equals(Money.of(expected.finalClosingBalance, 'JOD'))).toBe(
        true,
      )

      if (expected.computedInstallment !== undefined) {
        expect(
          result.computedInstallment.equals(Money.of(expected.computedInstallment, 'JOD')),
        ).toBe(true)
      }
      if (expected.singlePayment !== undefined) {
        expect(finalEntry?.payment.equals(Money.of(expected.singlePayment, 'JOD'))).toBe(true)
      }
      if (expected.totalCost !== undefined) {
        expect(result.totals.totalCost.equals(Money.of(expected.totalCost, 'JOD'))).toBe(true)
      }
    })
  }
})

describe('amortization.v1 — INV-4 (zero rate ⇒ zero cost, total paid = principal exactly)', () => {
  it('total paid equals principal exactly when rate is zero', () => {
    const principal = Money.of('12000', 'JOD')
    const result = computeAmortizationSchedule(
      principal,
      Rate.fromPercent('0'),
      24,
      toLocalDate('2026-01-01'),
      toLocalDate('2026-01-01'),
    )
    expect(result.totals.totalCost.isZero()).toBe(true)
    expect(result.totals.totalPaid.toStorageString()).toBe(principal.toStorageString())
  })
})

describe('amortization.v1 — BR-CALC-017 consistency notice', () => {
  it('emits a notice when the override deviates more than 2% from the computed installment', () => {
    const result = computeAmortizationSchedule(
      Money.of('1000', 'JOD'),
      Rate.fromPercent('12'),
      12,
      toLocalDate('2026-01-01'),
      toLocalDate('2026-01-01'),
      Money.of('95', 'JOD'), // computed is 88.849 — deviation ~6.9%
    )
    expect(result.consistencyNotice).toBeDefined()
    expect(result.usedInstallment.equals(Money.of('95', 'JOD'))).toBe(true)
  })

  it('stays silent when the override is within 2% of the computed installment', () => {
    const result = computeAmortizationSchedule(
      Money.of('1000', 'JOD'),
      Rate.fromPercent('12'),
      12,
      toLocalDate('2026-01-01'),
      toLocalDate('2026-01-01'),
      Money.of('89', 'JOD'), // computed is 88.849 — deviation ~0.17%
    )
    expect(result.consistencyNotice).toBeUndefined()
  })
})

describe('amortization — engine refusal (BR-CALC-016)', () => {
  it('refuses when principal is missing', () => {
    const outcome = amortization({
      annualRate: Rate.fromPercent('12'),
      termMonths: 12,
      startDate: toLocalDate('2026-01-01'),
      asOf: toLocalDate('2026-01-01'),
    })
    expect(isRefused(outcome)).toBe(true)
    if (isRefused(outcome)) {
      expect(outcome.missing).toEqual([{ field: 'principal' }])
    }
  })

  it('refuses when rate, term, and start date are all missing', () => {
    const outcome = amortization({
      principal: Money.of('1000', 'JOD'),
      asOf: toLocalDate('2026-01-01'),
    })
    expect(isRefused(outcome)).toBe(true)
    if (isRefused(outcome)) {
      expect(outcome.missing.map((m) => m.field)).toEqual(['annualRate', 'termMonths', 'startDate'])
    }
  })

  it('succeeds with high confidence when every required field is present', () => {
    const outcome = amortization({
      principal: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('12'),
      termMonths: 12,
      startDate: toLocalDate('2026-01-01'),
      asOf: toLocalDate('2026-01-01'),
    })
    expect(isEngineOk(outcome)).toBe(true)
    if (isEngineOk(outcome)) {
      expect(outcome.confidence).toBe('high')
      expect(outcome.value.schedule).toHaveLength(12)
    }
  })
})

describe('amortization — invariant violations', () => {
  it('throws on non-positive term', () => {
    expect(() =>
      computeAmortizationSchedule(
        Money.of('1000', 'JOD'),
        Rate.fromPercent('12'),
        0,
        toLocalDate('2026-01-01'),
        toLocalDate('2026-01-01'),
      ),
    ).toThrow()
  })
})
