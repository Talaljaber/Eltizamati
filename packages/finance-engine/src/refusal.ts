/**
 * Refusal contract (BR-CALC-016, financial-calculation-spec.md §5).
 *
 * The engine never invents a missing material input. Every public formula
 * entry point returns `EngineOutcome<T>` — either a successful, confidence-
 * rated result, or a typed `Refused` naming exactly which fields were
 * missing (and an optional, honestly-partial view).
 *
 * `Confidence` here is the domain VO (`'official'|'high'|'medium'|'low'`),
 * not finance-engine's legacy `CalculationConfidence` registry type — see
 * PHASE-02-DECISION-LOG.md §2: that type is intentionally left unchanged;
 * the domain `Confidence` is what actually flows into `CalculationRun`.
 */
import type { Confidence } from '@eltizamati/domain'

export interface FieldRef {
  readonly field: string
  readonly reason?: string
}

export interface Refused<TPartial = never> {
  readonly kind: 'refused'
  readonly missing: readonly FieldRef[]
  readonly partial?: TPartial
}

export interface EngineResult<T> {
  readonly kind: 'ok'
  readonly value: T
  readonly confidence: Confidence
  readonly assumptions: readonly string[]
}

export type EngineOutcome<T, TPartial = never> = EngineResult<T> | Refused<TPartial>

export function refused<TPartial = never>(
  missing: readonly FieldRef[],
  partial?: TPartial,
): Refused<TPartial> {
  return partial === undefined
    ? { kind: 'refused', missing }
    : { kind: 'refused', missing, partial }
}

export function engineOk<T>(
  value: T,
  confidence: Confidence,
  assumptions: readonly string[],
): EngineResult<T> {
  return { kind: 'ok', value, confidence, assumptions }
}

export function isRefused<T, P>(outcome: EngineOutcome<T, P>): outcome is Refused<P> {
  return outcome.kind === 'refused'
}

export function isEngineOk<T, P>(outcome: EngineOutcome<T, P>): outcome is EngineResult<T> {
  return outcome.kind === 'ok'
}
