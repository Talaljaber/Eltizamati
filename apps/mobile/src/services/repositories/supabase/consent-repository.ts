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
import { logger } from '../../../core/logging/logger'
import type { Database } from '../../../core/supabase/database.types'
import { consentDomainToRow, consentRowToDomain } from './mappers/consent-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

function logConsentProviderError(
  stage: 'status' | 'acknowledge',
  error: { readonly code: string; readonly message: string; readonly status?: number },
): void {
  logger.error({
    stage: `supabaseConsent:${stage}`,
    code: error.code,
    safeMetadata: { httpStatus: error.status ?? 0, providerMessage: error.message },
  })
}

export class SupabaseConsentRepository implements ConsentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async status(userId: Id<'user'>): Promise<Result<readonly ConsentRecord[], AppError>> {
    const { data, error } = await this.client
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
    if (error) {
      logConsentProviderError('status', error)
      return err(toStorageAppError(error))
    }
    return ok(data.map(consentRowToDomain))
  }

  async acknowledge(record: ConsentRecord): Promise<Result<ConsentRecord, AppError>> {
    const { data, error } = await this.client
      .from('consent_records')
      .insert(consentDomainToRow(record))
      .select('*')
      .single()
    if (error) {
      logConsentProviderError('acknowledge', error)
      return err(toStorageAppError(error))
    }
    return ok(consentRowToDomain(data))
  }
}
