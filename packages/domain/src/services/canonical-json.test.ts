/**
 * Canonical JSON serialization + hashing tests — INV-5 (determinism):
 * identical canonical inputs must produce identical hashes, regardless of
 * key-insertion order. `sha256Hex` (the raw primitive) is verified directly
 * against published NIST test vectors; `hashCanonicalJson` is verified for
 * the determinism property plus concrete values cross-checked against
 * Node's own `crypto.createHash('sha256')`.
 */
import { describe, it, expect } from 'vitest'
import { canonicalStringify, hashCanonicalJson, sha256Hex } from './canonical-json.js'

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

describe('sha256Hex (raw primitive — NIST test vectors)', () => {
  it('matches the NIST vector for the empty string', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('matches the NIST vector for "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('matches the NIST vector for the standard 56-character multi-block message', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    )
  })

  it('matches Node crypto.createHash("sha256") for a non-ASCII (Arabic) UTF-8 string', () => {
    expect(sha256Hex('اختبار')).toBe(
      'fa1333522f373b96fa6ac85e7e498219bc21978ee175100a7b38892646c6d9aa',
    )
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

  it('is a deterministic 64-character hex string (SHA-256)', () => {
    const hash = hashCanonicalJson({ a: 1 })
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is exactly sha256Hex(canonicalStringify(value))', () => {
    const value = { amount: '1000.500', formulaId: 'amortization', rate: '0.0925' }
    expect(hashCanonicalJson(value)).toBe(sha256Hex(canonicalStringify(value)))
  })

  it('matches Node crypto.createHash("sha256") for a JSON-like payload', () => {
    const value = { amount: '1000.500', formulaId: 'amortization', rate: '0.0925' }
    expect(hashCanonicalJson(value)).toBe(
      '50971125b7bc24e7161c28c922d10cc408926ec792bccf38175e36d329461ce3',
    )
  })
})
