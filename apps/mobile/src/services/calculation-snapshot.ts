/**
 * Read helpers for `CalculationRun.outcome.resultSnapshot` — opaque canonical
 * JSON by design (finance-engine's types.ts §top, PHASE-02-DECISION-LOG §6).
 * `toCanonicalJsonValue` (packages/domain/src/services/canonical-json.ts)
 * serializes `Money` as `{ type: 'Money', amount, currency }`, never as a
 * bare string — screens must go through these helpers rather than casting
 * the snapshot to `any` and reaching into it directly.
 */
import type { CanonicalJsonValue } from '@eltizamati/domain'

type JsonRecord = Record<string, CanonicalJsonValue>

function asRecord(value: CanonicalJsonValue | undefined): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

/** Reads a snapshot's top-level object as a keyed record (empty record if the shape doesn't match). */
export function snapshotRecord(value: CanonicalJsonValue | undefined): JsonRecord {
  return asRecord(value)
}

/** Reads a snapshot's top-level value as an array (empty array if the shape doesn't match). */
export function snapshotArray(value: CanonicalJsonValue | undefined): readonly CanonicalJsonValue[] {
  return Array.isArray(value) ? value : []
}

/** Extracts the decimal string from a canonicalized `Money` value (`{ type: 'Money', amount, currency }`). */
export function snapshotMoneyAmount(value: CanonicalJsonValue | undefined): string | undefined {
  const amount = asRecord(value).amount
  return typeof amount === 'string' ? amount : undefined
}

/** Extracts a plain number field from a snapshot record. */
export function snapshotNumber(value: CanonicalJsonValue | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined
}
