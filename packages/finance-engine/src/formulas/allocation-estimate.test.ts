import { describe, expect, it } from 'vitest'
import { Money, Rate, toLocalDate } from '@eltizamati/domain'
import { allocationEstimate, computeAllocationEstimate } from './allocation-estimate.js'
import { isEngineOk, isRefused } from '../refusal.js'
import { loadVectorFamily } from '../test-support/load-vectors.js'

const vectors = loadVectorFamily('tv-4xx-allocation-estimate.json')
const asOf = toLocalDate('2026-07-01')

describe('allocationEstimate.v1 — TV-401/TV-402 analytical vectors', () => {
  it('TV-401: unknown split mid-loan', () => {
    const vector = vectors.find((v) => v.id === 'TV-401')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as {
      balanceBeforePayment: string
      paymentAmount: string
      annualRatePercent: string
    }
    const expected = vector.expected as { cost: string; principal: string; closingBalance: string }

    const result = computeAllocationEstimate(
      Money.of(inputs.balanceBeforePayment, 'JOD'),
      Money.of(inputs.paymentAmount, 'JOD'),
      Rate.fromPercent(inputs.annualRatePercent),
      asOf,
    )

    expect(result.cost.equals(Money.of(expected.cost, 'JOD'))).toBe(true)
    expect(result.principal.equals(Money.of(expected.principal, 'JOD'))).toBe(true)
    expect(result.closingBalance.equals(Money.of(expected.closingBalance, 'JOD'))).toBe(true)
    expect(result.allocationSource).toBe('estimated')
    expect(result.overpayment).toBeUndefined()
  })

  it('TV-402: overpayment beyond balance — no negative balance (INV-1)', () => {
    const vector = vectors.find((v) => v.id === 'TV-402')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as {
      balanceBeforePayment: string
      paymentAmount: string
      annualRatePercent: string
    }
    const expected = vector.expected as {
      cost: string
      principal: string
      overpayment: string
      closingBalance: string
    }

    const result = computeAllocationEstimate(
      Money.of(inputs.balanceBeforePayment, 'JOD'),
      Money.of(inputs.paymentAmount, 'JOD'),
      Rate.fromPercent(inputs.annualRatePercent),
      asOf,
    )

    expect(result.cost.equals(Money.of(expected.cost, 'JOD'))).toBe(true)
    expect(result.principal.equals(Money.of(expected.principal, 'JOD'))).toBe(true)
    expect(result.overpayment?.equals(Money.of(expected.overpayment, 'JOD'))).toBe(true)
    expect(result.closingBalance.isZero()).toBe(true)
    expect(result.closingBalance.isNegative()).toBe(false)
  })

  it('TV-403: caller-resolved rate correctly drives the estimate across a repricing boundary', () => {
    const vector = vectors.find((v) => v.id === 'TV-403')
    if (vector === undefined)
      throw new Error(/* eslint-disable-line no-restricted-syntax */ 'vector missing')
    const inputs = vector.inputs as {
      balanceBeforePayment: string
      paymentAmount: string
      rateBeforeBoundaryPercent: string
      rateAfterBoundaryPercent: string
    }
    const balance = Money.of(inputs.balanceBeforePayment, 'JOD')
    const payment = Money.of(inputs.paymentAmount, 'JOD')

    const before = computeAllocationEstimate(
      balance,
      payment,
      Rate.fromPercent(inputs.rateBeforeBoundaryPercent),
      asOf,
    )
    const after = computeAllocationEstimate(
      balance,
      payment,
      Rate.fromPercent(inputs.rateAfterBoundaryPercent),
      asOf,
    )

    // Higher rate ⇒ higher cost share ⇒ lower principal share, same inputs otherwise.
    expect(after.cost.isGreaterThan(before.cost)).toBe(true)
    expect(after.principal.isLessThan(before.principal)).toBe(true)
  })
})

describe('allocationEstimate.v1 — floors negative principal at zero', () => {
  it('when the payment does not cover the period cost', () => {
    const result = computeAllocationEstimate(
      Money.of('100000', 'JOD'),
      Money.of('10', 'JOD'),
      Rate.fromPercent('24'),
      asOf,
    )
    // cost = 100000 * 0.02 = 2000, payment 10 << cost
    expect(result.principal.isZero()).toBe(true)
    expect(result.principal.isNegative()).toBe(false)
  })
})

describe('allocationEstimate — engine refusal (BR-CALC-016)', () => {
  it('refuses when the rate for the period is unknown', () => {
    const outcome = allocationEstimate({
      balanceBeforePayment: Money.of('1000', 'JOD'),
      paymentAmount: Money.of('100', 'JOD'),
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('refuses when balanceBeforePayment is missing', () => {
    const outcome = allocationEstimate({
      paymentAmount: Money.of('100', 'JOD'),
      annualRateForPeriod: Rate.fromPercent('9'),
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('refuses when paymentAmount is missing', () => {
    const outcome = allocationEstimate({
      balanceBeforePayment: Money.of('1000', 'JOD'),
      annualRateForPeriod: Rate.fromPercent('9'),
      asOf,
    })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds with medium confidence (estimated allocation — spec §7)', () => {
    const outcome = allocationEstimate({
      balanceBeforePayment: Money.of('1000', 'JOD'),
      paymentAmount: Money.of('100', 'JOD'),
      annualRateForPeriod: Rate.fromPercent('9'),
      asOf,
    })
    expect(isEngineOk(outcome)).toBe(true)
    if (isEngineOk(outcome)) {
      expect(outcome.confidence).toBe('medium')
    }
  })
})
