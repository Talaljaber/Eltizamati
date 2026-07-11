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
}
