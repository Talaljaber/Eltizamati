/**
 * Canonical JSON serialization + hashing tests — INV-5 (determinism):
 * identical canonical inputs must produce identical hashes, regardless of
 * key-insertion order.
 */
import { describe, it, expect } from 'vitest'
import { canonicalStringify, hashCanonicalJson } from './canonical-json.js'

describe('canonicalStringify', () => {
  it('produces byte-identical output regardless of key order', () => {
    const a = { b: 2, a: 1, c: { z: 1, y: 2 } }
    const b = { a: 1, c: { y: 2, z: 1 }, b: 2 }
    expect(canonicalStringify(a)).toBe(canonicalStringify(b))
  })

  it('serializes arrays preserving element order', () => {
    expect(canonicalStringify([3, 1, 2])).toBe('[3,1,2]')
  })

  it('serializes nested structures deterministically', () => {
    expect(canonicalStringify({ x: [{ b: 1, a: 2 }] })).toBe('{"x":[{"a":2,"b":1}]}')
  })
})

describe('hashCanonicalJson', () => {
  it('INV-5: identical canonical inputs produce identical hashes across key order', () => {
    const a = { formulaId: 'amortization', principal: 1000, rate: '0.0925' }
    const b = { rate: '0.0925', formulaId: 'amortization', principal: 1000 }
    expect(hashCanonicalJson(a)).toBe(hashCanonicalJson(b))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashCanonicalJson({ a: 1 })).not.toBe(hashCanonicalJson({ a: 2 }))
  })

  it('is a deterministic 8-character hex string', () => {
    const hash = hashCanonicalJson({ a: 1 })
    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })
})
