import { describe, expect, it } from 'vitest'
import { engineOk, isEngineOk, isRefused, refused } from './refusal.js'

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
