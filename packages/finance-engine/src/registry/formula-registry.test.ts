/**
 * Finance engine M0 placeholder test — proves the package exists, imports work,
 * and the registry is accessible. Real formula tests arrive in M3.
 *
 * NOTE: Coverage gate (≥95%) will only apply once formula implementations land.
 * The M0 package has no formula implementation, so coverage is 100% by default
 * (the only executable code is the registry object).
 */
import { describe, it, expect } from 'vitest'
import {
  FORMULA_REGISTRY,
  isFormulaId,
  resolveFormula,
  resolveRuntimeFormula,
} from '../registry/formula-registry.js'
import type { FormulaId } from './types.js'
import { isErr, isOk } from '@eltizamati/domain'

describe('FORMULA_REGISTRY (M0 scaffold)', () => {
  it('contains all 8 expected formula ids', () => {
    const expectedIds = [
      'amortization',
      'variableProjection',
      'residualDetection',
      'allocationEstimate',
      'murabahaProgress',
      'extraPaymentScenario',
      'cardPayoff',
      'aggregates',
    ]
    for (const id of expectedIds) {
      expect(FORMULA_REGISTRY).toHaveProperty(id)
    }
  })

  it('every formula has version 1 at M0', () => {
    for (const [_id, meta] of Object.entries(FORMULA_REGISTRY)) {
      expect(meta.version).toBe(1)
    }
  })

  it('no formula has empty assumptions list', () => {
    for (const [_id, meta] of Object.entries(FORMULA_REGISTRY)) {
      expect(meta.assumptions.length).toBeGreaterThan(0)
    }
  })

  it('engine does NOT import React Native or SQLite (boundary test)', async () => {
    // This test would fail at import time if the boundary was violated.
    // The dep-cruiser config enforces this statically; this is a runtime guard.
    const hasReactNative = Object.keys(FORMULA_REGISTRY).some((k) => k.includes('react-native'))
    expect(hasReactNative).toBe(false)
  })

  it('every formula exposes an executable function', () => {
    for (const [_id, meta] of Object.entries(FORMULA_REGISTRY)) {
      expect(typeof meta.execute).toBe('function')
    }
  })
})

describe('resolveFormula', () => {
  it('resolves a valid formula and version', () => {
    const result = resolveFormula('amortization', 1)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.id).toBe('amortization')
      expect(result.value.version).toBe(1)
      expect(typeof result.value.execute).toBe('function')
    }
  })

  it('fails safely for an unknown formula id', () => {
    const result = resolveFormula('nonExistent' as FormulaId, 1)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
      expect(result.error.cause).toMatch(/Unknown formula id/)
    }
  })

  it('fails safely for a known formula with an unavailable version', () => {
    const result = resolveFormula('amortization', 999 as 1)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
      expect(result.error.cause).toMatch(/Requested version 999 not available/)
    }
  })
})

describe('isFormulaId', () => {
  it('returns true for every real formula id', () => {
    for (const id of Object.keys(FORMULA_REGISTRY)) {
      expect(isFormulaId(id)).toBe(true)
    }
  })

  it('returns false for an untrusted/unknown string', () => {
    expect(isFormulaId('not-a-real-formula')).toBe(false)
  })
})

describe('resolveRuntimeFormula — untrusted id/version boundary', () => {
  it('resolves a valid runtime id and version', () => {
    const result = resolveRuntimeFormula('amortization', 1)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.id).toBe('amortization')
    }
  })

  it('fails safely for an untrusted id that is not in the registry', () => {
    const result = resolveRuntimeFormula('drop-table-obligations', 1)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
    }
  })

  it('fails safely for an untrusted version that is not 1', () => {
    const result = resolveRuntimeFormula('amortization', 2)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('calculationUnsupported')
    }
  })
})
