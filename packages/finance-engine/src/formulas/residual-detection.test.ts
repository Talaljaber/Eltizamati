import { describe, expect, it } from 'vitest'
import { Money, toLocalDate } from '@eltizamati/domain'
import { computeResidualDetection, residualDetection } from './residual-detection.js'
import { isRefused } from '../refusal.js'

const asOf = toLocalDate('2026-07-01')

describe('residualDetection.v1', () => {
  it('reports no risk when residual is below the threshold', () => {
    const result = computeResidualDetection(
      Money.of('50', 'JOD'),
      Money.of('20000', 'JOD'), // 1% = 200
      Money.of('310', 'JOD'),
      {},
      asOf,
    )
    expect(result.hasResidualRisk).toBe(false)
    expect(result.causes).toEqual([])
    expect(result.monthsOfExtraPayments).toBeUndefined()
  })

  it('flags risk and computes months of extra payments when residual exceeds the threshold', () => {
    const result = computeResidualDetection(
      Money.of('1500', 'JOD'),
      Money.of('20000', 'JOD'),
      Money.of('310', 'JOD'),
      { rateIncreasedWithUnchangedInstallment: true },
      asOf,
    )
    expect(result.hasResidualRisk).toBe(true)
    expect(result.causes).toEqual(['rateIncreaseWithUnchangedInstallment'])
    // ceil(1500/310) = 5
    expect(result.monthsOfExtraPayments).toBe(5)
  })

  it('reports contractualBalloon distinctly from a detected residual (BR-CALC-013)', () => {
    const result = computeResidualDetection(
      Money.of('1500', 'JOD'),
      Money.of('20000', 'JOD'),
      Money.of('310', 'JOD'),
      { contractualBalloon: Money.of('1500', 'JOD') },
      asOf,
    )
    expect(result.causes).toEqual(['contractualBalloon'])
  })

  it('falls back to "unknown" rather than inventing a cause it cannot see', () => {
    const result = computeResidualDetection(
      Money.of('1500', 'JOD'),
      Money.of('20000', 'JOD'),
      Money.of('310', 'JOD'),
      {},
      asOf,
    )
    expect(result.causes).toEqual(['unknown'])
  })

  it('threshold uses whichever of 1% principal / 1 installment is larger', () => {
    // 1% of 100,000 = 1000 > installment 310 → threshold should be 1000, not 310.
    const belowOnePercent = computeResidualDetection(
      Money.of('500', 'JOD'),
      Money.of('100000', 'JOD'),
      Money.of('310', 'JOD'),
      {},
      asOf,
    )
    expect(belowOnePercent.hasResidualRisk).toBe(false)
  })
})

describe('residualDetection — engine refusal (BR-CALC-016)', () => {
  it('refuses when required inputs are missing', () => {
    const outcome = residualDetection({ asOf })
    expect(isRefused(outcome)).toBe(true)
  })

  it('succeeds through the public entry point when all inputs are present', () => {
    const outcome = residualDetection({
      projectedResidualAtMaturity: Money.of('1500', 'JOD'),
      originalPrincipal: Money.of('20000', 'JOD'),
      currentInstallment: Money.of('310', 'JOD'),
      evidence: { rateIncreasedWithUnchangedInstallment: true },
      asOf,
    })
    expect(outcome.kind).toBe('ok')
    if (outcome.kind === 'ok') {
      expect(outcome.value.hasResidualRisk).toBe(true)
      expect(outcome.confidence).toBe('high')
    }
  })
})
