/**
 * Canonical JSON serialization + deterministic hashing — the reproducibility
 * mechanism behind `CalculationRun.inputsHash` (INV-5: identical canonical
 * inputs ⇒ identical hash, across runs).
 *
 * `canonicalStringify` sorts object keys recursively so semantically-identical
 * inputs always serialize byte-identically regardless of construction order.
 *
 * `hashCanonicalJson` is SHA-256 (FIPS 180-4), hand-implemented in pure JS
 * rather than via Node's `crypto` module or the Web Crypto API: Node's
 * `crypto` is unavailable in React Native, and Web Crypto's `subtle.digest`
 * is async and not reliably present in every RN/Hermes target — either
 * dependency would compromise ADR-0007's portability goal (the same code
 * must run unchanged in React Native and Supabase Edge Functions). A pure
 * bitwise implementation has no environment dependency at all. Verified
 * against Node's own `crypto.createHash('sha256')` and the NIST test vectors
 * for `''`/`'abc'`/the standard 56-character vector (see
 * `canonical-json.test.ts`). This is a real cryptographic hash used here
 * purely for reproducibility/change-detection (INV-5) — it is not an
 * integrity or audit signature over untrusted input.
 */

import { err, makeError, ok, type AppError, type Result } from '../errors/app-error.js'
import { Money, Rate } from '../value-objects/money.js'
import { Percentage } from '../value-objects/percentage.js'

export type CanonicalJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue }

/**
 * Converts runtime finance values into actual JSON data before persistence or
 * hashing. Private fields in value objects must never disappear through a
 * type assertion/JSON.stringify call.
 */
export function toCanonicalJsonValue(value: unknown): Result<CanonicalJsonValue, AppError> {
  return normalizeCanonicalValue(value, '$', new Set<object>())
}

function normalizeCanonicalValue(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): Result<CanonicalJsonValue, AppError> {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return ok(value)
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? ok(value)
      : canonicalValidationError(path, 'nonFiniteNumber')
  }
  if (value instanceof Money) {
    return ok({
      type: 'Money',
      amount: value.toStorageString(),
      currency: value.currency,
    })
  }
  if (value instanceof Rate) {
    return ok({ type: 'Rate', annualRate: value.toStorageString() })
  }
  if (value instanceof Percentage) {
    return ok({ type: 'Percentage', percent: value.toStorageString() })
  }
  if (typeof value !== 'object') {
    return canonicalValidationError(path, `unsupported:${typeof value}`)
  }
  if (ancestors.has(value)) return canonicalValidationError(path, 'circularReference')

  ancestors.add(value)
  if (Array.isArray(value)) {
    const normalized: CanonicalJsonValue[] = []
    for (let index = 0; index < value.length; index++) {
      const item = normalizeCanonicalValue(value[index], `${path}[${String(index)}]`, ancestors)
      if (!item.ok) return item
      normalized.push(item.value)
    }
    ancestors.delete(value)
    return ok(normalized)
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    ancestors.delete(value)
    return canonicalValidationError(path, 'unsupportedClassInstance')
  }

  const normalized: Record<string, CanonicalJsonValue> = {}
  for (const [key, child] of Object.entries(value)) {
    const item = normalizeCanonicalValue(child, `${path}.${key}`, ancestors)
    if (!item.ok) return item
    normalized[key] = item.value
  }
  ancestors.delete(value)
  return ok(normalized)
}

function canonicalValidationError(
  path: string,
  reason: string,
): Result<never, AppError> {
  return err(makeError('validation', { safeMetadata: { path, reason } }))
}

/** Deterministically stringify a JSON-serializable value with recursively sorted object keys. */
export function canonicalStringify(value: CanonicalJsonValue): string {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`
  }
  const obj = value as Readonly<Record<string, CanonicalJsonValue>>
  const keys = Object.keys(obj).sort()
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k] as CanonicalJsonValue)}`,
  )
  return `{${entries.join(',')}}`
}

// ─── SHA-256 (FIPS 180-4), pure JS, dependency-free ───────────────────────────

const SHA256_ROUND_CONSTANTS: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

/** Encodes a JS string to UTF-8 bytes without relying on a global TextEncoder. */
function utf8Bytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i) as number
    if (code > 0xffff) i++ // consume the low surrogate of a surrogate pair
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return bytes
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

function toHex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0')
}

/**
 * SHA-256 digest of a UTF-8 string, as a 64-character lowercase hex string.
 * Exported (in addition to `hashCanonicalJson`) so the cryptographic
 * primitive itself can be verified directly against published test vectors,
 * independent of `canonicalStringify`'s JSON-quoting of string values.
 */
export function sha256Hex(message: string): string {
  const bytes = utf8Bytes(message)
  const bitLength = bytes.length * 8

  const padded = bytes.slice()
  padded.push(0x80)
  while (padded.length % 64 !== 56) padded.push(0)

  const high = Math.floor(bitLength / 0x100000000)
  const low = bitLength >>> 0
  padded.push(
    (high >>> 24) & 0xff,
    (high >>> 16) & 0xff,
    (high >>> 8) & 0xff,
    high & 0xff,
    (low >>> 24) & 0xff,
    (low >>> 16) & 0xff,
    (low >>> 8) & 0xff,
    low & 0xff,
  )

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Uint32Array(64)

  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    for (let i = 0; i < 16; i++) {
      const base = chunkStart + i * 4
      w[i] =
        (((padded[base] as number) << 24) |
          ((padded[base + 1] as number) << 16) |
          ((padded[base + 2] as number) << 8) |
          (padded[base + 3] as number)) >>>
        0
    }
    for (let i = 16; i < 64; i++) {
      const wim15 = w[i - 15] as number
      const wim2 = w[i - 2] as number
      const s0 = rotr(wim15, 7) ^ rotr(wim15, 18) ^ (wim15 >>> 3)
      const s1 = rotr(wim2, 17) ^ rotr(wim2, 19) ^ (wim2 >>> 10)
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i++) {
      const bigS1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 =
        (h + bigS1 + ch + (SHA256_ROUND_CONSTANTS[i] as number) + (w[i] as number)) >>> 0
      const bigS0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (bigS0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map(toHex8).join('')
}

/** SHA-256 hash of a canonical JSON value — the `inputsHash` behind INV-5. */
export function hashCanonicalJson(value: CanonicalJsonValue): string {
  return sha256Hex(canonicalStringify(value))
}
