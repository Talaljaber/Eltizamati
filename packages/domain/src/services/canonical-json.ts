/**
 * Canonical JSON serialization + deterministic hashing — the reproducibility
 * mechanism behind `CalculationRun.inputsHash` (INV-5: identical canonical
 * inputs ⇒ identical hash, across runs).
 *
 * `canonicalStringify` sorts object keys recursively so semantically-identical
 * inputs always serialize byte-identically regardless of construction order.
 *
 * `hashCanonicalJson` is a small, dependency-free, non-cryptographic checksum
 * (FNV-1a, 32-bit) — deliberately not Node's `crypto` module, so the exact
 * same code runs unchanged in React Native and (later) Supabase Edge
 * Functions, per ADR-0007's portability goal. It is sufficient for
 * reproducibility/change-detection; it is not a security primitive and must
 * never be used as one.
 */

export type CanonicalJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue }

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

/** FNV-1a 32-bit hash, hex-encoded. Deterministic, dependency-free, non-cryptographic. */
function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Deterministic hash of a canonical JSON value — the `inputsHash` behind INV-5. */
export function hashCanonicalJson(value: CanonicalJsonValue): string {
  return fnv1a32Hex(canonicalStringify(value))
}
