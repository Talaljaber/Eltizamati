/**
 * provenance_json -> Provenance conversion (read-only side — the dashboard
 * never writes obligation-family rows directly, only through the demo
 * rate-campaign RPC in Phase 4). Mirrors
 * apps/mobile/src/services/repositories/supabase/mappers/provenance-json.ts:
 * generated types widen every `*_json` column to the generic `Json` union,
 * so a shape check here catches a null/malformed column before it silently
 * becomes a broken `Provenance` object deeper in the app.
 */
import { DomainInvariantError, type Provenance } from '@eltizamati/domain'
import type { Json } from '../supabase/database.types'

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
