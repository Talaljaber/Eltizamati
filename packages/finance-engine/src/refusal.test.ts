import { describe, expect, it } from 'vitest'
import { engineOk, isEngineOk, isRefused, refused } from './refusal.js'
import { cardPayoff } from './formulas/card-payoff.js'
import { extraPaymentScenario } from './formulas/extra-payment-scenario.js'
import { residualDetection } from './formulas/residual-detection.js'
import { variableProjection } from './formulas/variable-projection.js'
import { aggregates } from './formulas/aggregates.js'
import { allocationEstimate } from './formulas/allocation-estimate.js'

describe('refused()', () => {
  it('omits partial when not provided', () => {
    const result = refused([{ field: 'principal' }])
    expect(result.kind).toBe('refused')
    expect(result.partial).toBeUndefined()
    expect(isRefused(result)).toBe(true)
  })

  it('includes partial when provided', () => {
    const result = refused([{ field: 'principal' }], { note: 'limited view' })
    expect(result.partial).toEqual({ note: 'limited view' })
  })
})

describe('engineOk()', () => {
  it('wraps a value with confidence and assumptions', () => {
    const result = engineOk({ x: 1 }, 'high', ['assumption 1'])
    expect(isEngineOk(result)).toBe(true)
    expect(result.confidence).toBe('high')
    expect(result.assumptions).toEqual(['assumption 1'])
  })
})

describe('formula refusal paths (missing parameters)', () => {
  it('cardPayoff refuses empty inputs', () => {
    const result = cardPayoff({} as any)
    expect(isRefused(result)).toBe(true)
  })

  it('extraPaymentScenario refuses empty inputs', () => {
    const result = extraPaymentScenario({} as any)
    expect(isRefused(result)).toBe(true)
  })

  it('residualDetection refuses empty inputs', () => {
    const result = residualDetection({} as any)
    expect(isRefused(result)).toBe(true)
  })

  it('variableProjection refuses empty inputs', () => {
    const result = variableProjection({} as any)
    expect(isRefused(result)).toBe(true)
  })

  it('aggregates refuses empty inputs', () => {
    const result = aggregates({} as any)
    expect(isRefused(result)).toBe(true)
  })

  it('allocationEstimate refuses empty inputs', () => {
    const result = allocationEstimate({} as any)
    expect(isRefused(result)).toBe(true)
  })
})
