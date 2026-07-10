/**
 * Provenance value object — tracks the origin and freshness of every material field.
 *
 * Rules: data-provenance.md §1–3, BR-PROV-001..006, PRIN-2.
 * Design: `Sourced<T>` wraps any material field with its provenance.
 *         `Provenance` is immutable history (BR-PROV-006) — corrections append, never mutate.
 */

// ─── Source classes (data-provenance.md §2) ─────────────────────────────────

export type SourceClass = 'official' | 'bureau' | 'userEntered' | 'estimate' | 'demo'

// ─── Provenance value object ─────────────────────────────────────────────────

export interface Provenance {
  readonly source: SourceClass
  /** 'demo-seed' | 'manual' | 'crif' | 'openbanking:<bank>' */
  readonly providerId?: string
  /** ISO datetime: when the value was true per the source */
  readonly observedAt: string
  /** ISO datetime: when we stored it */
  readonly recordedAt: string
  /** Statement id, sync-run id, or seed version (P1 fills) */
  readonly sourceReference?: string
}

// ─── Sourced<T> — wraps a material field with provenance ──────────────────

export interface Sourced<T> {
  readonly value: T
  readonly provenance: Provenance
}

// ─── Factories ───────────────────────────────────────────────────────────────

export function userEntered<T>(value: T, recordedAt: string): Sourced<T> {
  return {
    value,
    provenance: {
      source: 'userEntered',
      providerId: 'manual',
      observedAt: recordedAt,
      recordedAt,
    },
  }
}

export function demoSourced<T>(
  value: T,
  seedVersion: string,
  observedAt: string,
  recordedAt: string,
): Sourced<T> {
  return {
    value,
    provenance: {
      source: 'demo',
      providerId: 'demo-seed',
      sourceReference: seedVersion,
      observedAt,
      recordedAt,
    },
  }
}

export function engineEstimate<T>(
  value: T,
  calculationRunId: string,
  recordedAt: string,
): Sourced<T> {
  return {
    value,
    provenance: {
      source: 'estimate',
      sourceReference: calculationRunId,
      observedAt: recordedAt,
      recordedAt,
    },
  }
}

// ─── Priority ordering (BR-PROV-001) ─────────────────────────────────────────

const SOURCE_PRIORITY: Record<SourceClass, number> = {
  official: 4,
  bureau: 3,
  userEntered: 2,
  estimate: 1,
  demo: 2, // treated same priority as userEntered for conflict purposes
}

/** Returns true if `candidate` should replace `existing` (higher priority wins). */
export function isHigherPriority(candidate: SourceClass, existing: SourceClass): boolean {
  return SOURCE_PRIORITY[candidate] > SOURCE_PRIORITY[existing]
}

/**
 * Freshness thresholds (BR-PROV-003).
 * Returns true if the provenance is considered stale.
 */
export function isStale(provenance: Provenance, nowIso: string): boolean {
  const now = new Date(nowIso).getTime()
  const observed = new Date(provenance.observedAt).getTime()
  const ageMs = now - observed

  switch (provenance.source) {
    case 'official':
      return ageMs > 7 * 24 * 60 * 60 * 1000 // 7 days
    case 'userEntered':
    case 'demo':
      return ageMs > 90 * 24 * 60 * 60 * 1000 // 90 days
    case 'estimate':
      return false // estimates are recomputed on input change, never stale
    case 'bureau':
      return false // bureau always displays as-of date; no stale gate needed
  }
}
