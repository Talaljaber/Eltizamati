import { describe, expect, it } from 'vitest'
import { engineOk, isEngineOk, isRefused, refused } from './refusal.js'
import { cardPayoff, type CardPayoffInputs } from './formulas/card-payoff.js'
import {
  extraPaymentScenario,
  type ExtraPaymentScenarioInputs,
} from './formulas/extra-payment-scenario.js'
import { residualDetection, type ResidualDetectionInputs } from './formulas/residual-detection.js'
import {
  variableProjection,
  type VariableProjectionInputs,
} from './formulas/variable-projection.js'
import { aggregates, type AggregatesInputs } from './formulas/aggregates.js'
import {
  allocationEstimate,
  type AllocationEstimateInputs,
} from './formulas/allocation-estimate.js'

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
    const result = cardPayoff({} as unknown as CardPayoffInputs)
    expect(isRefused(result)).toBe(true)
  })

  it('extraPaymentScenario refuses empty inputs', () => {
    const result = extraPaymentScenario({} as unknown as ExtraPaymentScenarioInputs)
    expect(isRefused(result)).toBe(true)
  })

  it('residualDetection refuses empty inputs', () => {
    const result = residualDetection({} as unknown as ResidualDetectionInputs)
    expect(isRefused(result)).toBe(true)
  })

  it('variableProjection refuses empty inputs', () => {
    const result = variableProjection({} as unknown as VariableProjectionInputs)
    expect(isRefused(result)).toBe(true)
  })

  it('aggregates refuses empty inputs', () => {
    const result = aggregates({} as unknown as AggregatesInputs)
    expect(isRefused(result)).toBe(true)
  })

  it('allocationEstimate refuses empty inputs', () => {
    const result = allocationEstimate({} as unknown as AllocationEstimateInputs)
    expect(isRefused(result)).toBe(true)
  })
})
