import { describe, expect, it } from 'vitest'
import { Money, Percentage, Rate, toLocalDate, type MinimumPaymentRule } from '@eltizamati/domain'
import { cardPayoff, computeCardPayoff } from './card-payoff.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-6xx-card-payoff.json')
const asOf = toLocalDate('2026-07-01')

function findVector(id: string) {
  const v = vectors.find((x) => x.id === id)
  if (v === undefined)
    throw new Error(/* eslint-disable-line no-restricted-syntax */ `vector ${id} not found`)
  return v
}

describe('cardPayoff.v1 — TV-601 (monotonicity vs fixed-100 path, INV-3)', () => {
  it('a higher fixed payment pays off faster and cheaper than minimum-only', () => {
    const vector = findVector('TV-601')
    const inputs = vector.inputs as {
      balance: string
      annualRatePercent: string
      minimumPaymentRule: { type: string; value: string; floor: string }
      fixedPaymentAmount: string
    }
    const rule: MinimumPaymentRule = {
      type: 'percent',
      value: Percentage.of(inputs.minimumPaymentRule.value),
      floor: Money.of(inputs.minimumPaymentRule.floor, 'JOD'),
    }

    const result = computeCardPayoff(
      Money.of(inputs.balance, 'JOD'),
      Rate.fromPercent(inputs.annualRatePercent),
      rule,
      asOf,
      Money.of(inputs.fixedPaymentAmount, 'JOD'),
    )

    expect(result.minimumOnly.neverPaysOff).toBe(false)
    expect(result.fixedPayment).toBeDefined()
    if (result.fixedPayment !== undefined) {
      expect(result.fixedPayment.neverPaysOff).toBe(false)
      expect(result.fixedPayment.months).toBeLessThanOrEqual(result.minimumOnly.months)
      expect(
        result.fixedPayment.totalCharges.isLessThan(result.minimumOnly.totalCharges) ||
          result.fixedPayment.totalCharges.equals(result.minimumOnly.totalCharges),
      ).toBe(true)
    }
  })
})

describe('cardPayoff.v1 — TV-602 (payment below first charge ⇒ neverPaysOff)', () => {
  it('flags neverPaysOff and reports the first period charge', () => {
    const vector = findVector('TV-602')
    const inputs = vector.inputs as {
      balance: string
      annualRatePercent: string
      minimumPaymentRule: { type: string; value: string }
      fixedPaymentAmount: string
    }
    const expected = vector.expected as { neverPaysOff: boolean; firstPeriodCharge: string }
    const rule: MinimumPaymentRule = {
      type: 'fixed',
      value: Money.of(inputs.minimumPaymentRule.value, 'JOD'),
    }

    const result = computeCardPayoff(
      Money.of(inputs.balance, 'JOD'),
      Rate.fromPercent(inputs.annualRatePercent),
      rule,
      asOf,
      Money.of(inputs.fixedPaymentAmount, 'JOD'),
    )

    expect(result.fixedPayment?.neverPaysOff).toBe(expected.neverPaysOff)
    expect(
      result.fixedPayment?.firstPeriodCharge.equals(Money.of(expected.firstPeriodCharge, 'JOD')),
    ).toBe(true)
  })
})

describe('cardPayoff.v1 — TV-603 (zero APR: months = ceil(balance/payment), charges 0)', () => {
  it('matches the closed-form zero-rate case (INV-4)', () => {
    const vector = findVector('TV-603')
    const inputs = vector.inputs as {
      balance: string
      annualRatePercent: string
      minimumPaymentRule: { type: string; value: string }
      fixedPaymentAmount: string
    }
    const expected = vector.expected as { months: number; totalCharges: string }
    const rule: MinimumPaymentRule = {
      type: 'fixed',
      value: Money.of(inputs.minimumPaymentRule.value, 'JOD'),
    }

    const result = computeCardPayoff(
      Money.of(inputs.balance, 'JOD'),
      Rate.fromPercent(inputs.annualRatePercent),
      rule,
      asOf,
      Money.of(inputs.fixedPaymentAmount, 'JOD'),
    )

    expect(result.fixedPayment?.months).toBe(expected.months)
    expect(result.fixedPayment?.totalCharges.equals(Money.of(expected.totalCharges, 'JOD'))).toBe(
      true,
    )
    expect(result.fixedPayment?.neverPaysOff).toBe(false)
  })
})

describe('cardPayoff — engine refusal (BR-CALC-016)', () => {
  it('refuses when the minimum payment rule is unknown', () => {
    const outcome = cardPayoff({
      balance: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('20'),
      minimumPaymentRule: { type: 'unknown' },
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('refuses when balance is missing', () => {
    const outcome = cardPayoff({
      annualRate: Rate.fromPercent('20'),
      minimumPaymentRule: { type: 'fixed', value: Money.of('50', 'JOD') },
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds when balance, rate, and a known rule are present', () => {
    const outcome = cardPayoff({
      balance: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('20'),
      minimumPaymentRule: { type: 'fixed', value: Money.of('50', 'JOD') },
      asOf,
    })
    expect(isEngineOk(outcome)).toBe(true)
    if (isEngineOk(outcome)) {
      expect(outcome.value.minimumOnly.neverPaysOff).toBe(false)
      expect(outcome.value.fixedPayment).toBeUndefined()
    }
  })

  it('refuses when minimumPaymentRule is entirely missing', () => {
    const outcome = cardPayoff({
      balance: Money.of('1000', 'JOD'),
      annualRate: Rate.fromPercent('20'),
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('computeCardPayoff throws directly if ever called with an unknown rule (defensive invariant)', () => {
    expect(() =>
      computeCardPayoff(Money.of('1000', 'JOD'), Rate.fromPercent('20'), { type: 'unknown' }, asOf),
    ).toThrow()
  })
})
