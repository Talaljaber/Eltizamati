import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type RatePeriod,
  type RatePeriodRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import { ratePeriodDomainToRow, ratePeriodRowToDomain } from './mappers/rate-period-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabaseRatePeriodRepository implements RatePeriodRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async historyFor(
    obligationId: Id<'obligation'>,
  ): Promise<Result<readonly RatePeriod[], AppError>> {
    const { data, error } = await this.client
      .from('rate_periods')
      .select('*')
      .eq('obligation_id', obligationId)
      .order('effective_from', { ascending: true })
    if (error) return err(toStorageAppError(error))
    return ok(data.map(ratePeriodRowToDomain))
  }

  /** Append-only (BR-RATE-001) — always an insert, the table has no update policy. */
  async append(period: RatePeriod): Promise<Result<RatePeriod, AppError>> {
    const { data: userData, error: userError } = await this.client.auth.getUser()
    if (userError)
      return err(
        makeError('auth', {
          safeMetadata: { authErrorCode: userError.code ?? 'unknown' },
          cause: userError,
        }),
      )

    const { data, error } = await this.client
      .from('rate_periods')
      .insert(ratePeriodDomainToRow(period, userData.user.id))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(ratePeriodRowToDomain(data))
  }

  /**
   * Idempotent variant for deterministic-id callers (provider import retry).
   * `rate_periods_authority_guard` (20260718025215) denies a second insert
   * for the same obligation regardless of whether it's a genuine duplicate or
   * a legitimately later period, so a plain insert failure alone can't tell
   * "already imported, retry is a no-op" apart from "a real conflict" — this
   * looks up the row by id afterward and compares before deciding which.
   */
  async appendIfAbsent(period: RatePeriod): Promise<Result<RatePeriod, AppError>> {
    const { data: userData, error: userError } = await this.client.auth.getUser()
    if (userError)
      return err(
        makeError('auth', {
          safeMetadata: { authErrorCode: userError.code ?? 'unknown' },
          cause: userError,
        }),
      )

    const insertResult = await this.client
      .from('rate_periods')
      .insert(ratePeriodDomainToRow(period, userData.user.id))
      .select('*')
      .single()
    if (!insertResult.error) return ok(ratePeriodRowToDomain(insertResult.data))

    const existingResult = await this.client
      .from('rate_periods')
      .select('*')
      .eq('id', period.id)
      .maybeSingle()
    if (existingResult.error || existingResult.data === null) {
      return err(toStorageAppError(insertResult.error))
    }

    const existing = ratePeriodRowToDomain(existingResult.data)
    if (isSameRatePeriodData(existing, period)) return ok(existing)
    return err(
      makeError('dataConflict', {
        safeMetadata: { entity: 'ratePeriod', ratePeriodId: period.id },
      }),
    )
  }
}

function isSameRatePeriodData(a: RatePeriod, b: RatePeriod): boolean {
  return (
    a.annualRate.equals(b.annualRate) &&
    a.effectiveFrom === b.effectiveFrom &&
    (a.benchmarkRate?.toStorageString() ?? null) === (b.benchmarkRate?.toStorageString() ?? null) &&
    (a.margin?.toStorageString() ?? null) === (b.margin?.toStorageString() ?? null)
  )
}
