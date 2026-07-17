import { describe, expect, it } from 'vitest'
import { computeDemoRiskIndicator } from './demo-risk-indicator'

describe('computeDemoRiskIndicator', () => {
  it('bands a small new burden relative to existing commitments as low', () => {
    // 1200 / 24 = 50/month against 500 existing = 0.1 ratio.
    const result = computeDemoRiskIndicator({
      requestedAmount: 1200,
      requestedTermMonths: 24,
      existingMonthlyCommitment: 500,
    })
    expect(result.band).toBe('low')
    expect(result.burdenRatio).toBe(0.1)
    expect(result.estimatedMonthlyPayment).toBe(50)
  })

  it('bands a burden comparable to existing commitments as medium', () => {
    // 1000/month against 1000 existing = 1.0 ratio.
    const result = computeDemoRiskIndicator({
      requestedAmount: 12000,
      requestedTermMonths: 12,
      existingMonthlyCommitment: 1000,
    })
    expect(result.band).toBe('medium')
    expect(result.burdenRatio).toBe(1)
  })

  it('bands a burden far exceeding existing commitments as high', () => {
    // 2000/month against 500 existing = 4.0 ratio.
    const result = computeDemoRiskIndicator({
      requestedAmount: 24000,
      requestedTermMonths: 12,
      existingMonthlyCommitment: 500,
    })
    expect(result.band).toBe('high')
    expect(result.burdenRatio).toBe(4)
  })

  it('never divides by zero — no existing commitment falls back to medium, ratio 0', () => {
    const result = computeDemoRiskIndicator({
      requestedAmount: 5000,
      requestedTermMonths: 12,
      existingMonthlyCommitment: 0,
    })
    expect(result.band).toBe('medium')
    expect(result.burdenRatio).toBe(0)
  })
})
