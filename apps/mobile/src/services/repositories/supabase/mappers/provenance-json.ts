/**
 * Shared provenance_json <-> Provenance conversion. Generated types type
 * every `*_json` column as the generic `Json` union, so a shape check at
 * this boundary (not a full schema) catches a null/malformed column before
 * it silently becomes a broken Provenance object deeper in the app.
 */
import { DomainInvariantError, type Provenance } from '@eltizamati/domain'
import type { Json } from '../../../../core/supabase/database.types'

const VALID_SOURCES = new Set(['official', 'bureau', 'userEntered', 'estimate', 'demo'])

export function jsonToProvenance(value: Json): Provenance {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof (value as { source?: unknown }).source !== 'string' ||
    !VALID_SOURCES.has((value as { source: string }).source)
  ) {
    throw new DomainInvariantError(
      'validation',
      `provenance_json column does not contain a valid Provenance object: ${JSON.stringify(value)}`,
    )
  }
  return value as unknown as Provenance
}

export function provenanceToJson(provenance: Provenance): Json {
  return provenance as unknown as Json
}
