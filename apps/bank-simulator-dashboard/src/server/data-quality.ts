/**
 * Data-quality labeling for aggregates (docs/dashboard.md §7.A: "Every
 * aggregate must indicate whether it contains: official; user-entered;
 * estimated; mixed; incomplete data").
 *
 * Buckets follow `SourceClass` (packages/domain/src/value-objects/provenance.ts)
 * directly rather than inventing a parallel taxonomy: `official`/`bureau`
 * are institution-sourced, `demo` displays "styled as official" per
 * data-provenance.md §2, so all three share the `official` bucket here;
 * `userEntered` and `estimate` are their own buckets. A single contributing
 * bucket yields that label; more than one yields `mixed`.
 */
import type { SourceClass } from '@eltizamati/domain'

export type DataQualityLabel = 'official' | 'userEntered' | 'estimated' | 'mixed'

function bucketFor(source: SourceClass): 'official' | 'userEntered' | 'estimated' {
  if (source === 'userEntered') return 'userEntered'
  if (source === 'estimate') return 'estimated'
  return 'official' // official | bureau | demo
}

export function classifyDataQuality(sources: readonly SourceClass[]): DataQualityLabel | undefined {
  if (sources.length === 0) return undefined
  const buckets = new Set(sources.map(bucketFor))
  if (buckets.size > 1) return 'mixed'
  return [...buckets][0]
}
