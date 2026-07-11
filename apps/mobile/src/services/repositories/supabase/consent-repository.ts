import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type ConsentRecord,
  type ConsentRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import { consentDomainToRow, consentRowToDomain } from './mappers/consent-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabaseConsentRepository implements ConsentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async status(userId: Id<'user'>): Promise<Result<readonly ConsentRecord[], AppError>> {
    const { data, error } = await this.client
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
    if (error) return err(toStorageAppError(error))
    return ok(data.map(consentRowToDomain))
  }

  async acknowledge(record: ConsentRecord): Promise<Result<ConsentRecord, AppError>> {
    const { data, error } = await this.client
      .from('consent_records')
      .insert(consentDomainToRow(record))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(consentRowToDomain(data))
  }
}
