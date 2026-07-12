/**
 * Converts a formula result (containing `Money`/`Rate`/`Percentage`
 * instances) into a plain JSON-safe structure for INV-5 determinism
 * checks — two runs are byte-identical iff their canonicalized JSON strings
 * are identical.
 */
export function canonicalizeForComparison(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'object') {
    const storageStringFn = (value as { toStorageString?: unknown }).toStorageString
    if (typeof storageStringFn === 'function') {
      return (storageStringFn as () => string).call(value)
    }
    if (Array.isArray(value)) return value.map(canonicalizeForComparison)
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, canonicalizeForComparison(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b))
    return Object.fromEntries(entries)
  }
  return value
}

export function canonicalJsonStringOf(value: unknown): string {
  return JSON.stringify(canonicalizeForComparison(value))
}
