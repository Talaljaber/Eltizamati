/**
 * BR-OBL-002: rate periods are contiguous, non-overlapping, ordered;
 * validation rejects violations at entry. BR-RATE-001: rate history is
 * append-only — superseded periods are excluded from the ordering/overlap
 * check (they represent corrected history, not active periods).
 */
import { err, ok, makeError, type Result, type AppError } from '../errors/app-error.js'
import type { RatePeriod } from '../entities/rate-period.js'
import { compareLocalDate } from '../value-objects/local-date-math.js'

export function validateRatePeriods(periods: readonly RatePeriod[]): Result<void, AppError> {
  const active = periods.filter((p) => p.supersededBy === undefined)

  if (active.length === 0) {
    return err(
      makeError('validation', {
        safeMetadata: { field: 'ratePeriods', reason: 'empty' },
        recoveryHint: 'A loan must have at least one active rate period.',
      }),
    )
  }

  const sorted = [...active].sort((a, b) => compareLocalDate(a.effectiveFrom, b.effectiveFrom))

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1] as RatePeriod
    const curr = sorted[i] as RatePeriod
    if (compareLocalDate(prev.effectiveFrom, curr.effectiveFrom) === 0) {
      return err(
        makeError('validation', {
          safeMetadata: {
            field: 'ratePeriods',
            reason: 'duplicateEffectiveFrom',
            effectiveFrom: curr.effectiveFrom,
          },
          recoveryHint: 'Two active rate periods share the same effective date.',
        }),
      )
    }
  }

  return ok(undefined)
}
