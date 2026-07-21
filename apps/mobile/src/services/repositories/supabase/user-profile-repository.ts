/**
 * Reference Supabase repository implementation (Phase 4 foundation). This is
 * the smallest repository — `profiles` is a 1:1 table with no provenance or
 * composite FKs — and exists as the pattern the remaining six
 * `packages/domain` repository ports follow in the next Phase 4 slice.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type UserProfile,
  type UserProfileRepository,
} from '@eltizamati/domain'
import { logger } from '../../../core/logging/logger'
import type { Database } from '../../../core/supabase/database.types'
import { toSupabaseAppError } from '../../../core/supabase/supabase-error'
import {
  profileDomainToInsertRow,
  profileDomainToRow,
  profileRowToDomain,
} from './mappers/user-profile-mapper'

function logProfileProviderError(
  stage: 'read' | 'save' | 'create',
  error: { readonly code?: string; readonly message: string; readonly status?: number },
): void {
  logger.error({
    stage: `supabaseProfile:${stage}`,
    code: error.code ?? 'unknown',
    safeMetadata: { httpStatus: error.status ?? 0, providerMessage: error.message },
  })
}

export class SupabaseUserProfileRepository implements UserProfileRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(userId: Id<'user'>): Promise<Result<UserProfile, AppError>> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      logProfileProviderError('read', error)
      return err(toSupabaseAppError(error))
    }
    if (data === null) return err(makeError('notFound'))
    return ok(profileRowToDomain(data))
  }

  async save(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert(profileDomainToRow(profile))
      .select('*')
      .single()
    if (error) {
      logProfileProviderError('save', error)
      return err(toSupabaseAppError(error))
    }
    return ok(profileRowToDomain(data))
  }

  async createIfAbsent(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const { data, error } = await this.client
      .from('profiles')
      .insert(profileDomainToInsertRow(profile))
      .select('*')
      .single()
    if (error?.code === '23505') return this.get(profile.userId)
    if (error) {
      logProfileProviderError('create', error)
      return err(toSupabaseAppError(error))
    }
    return ok(profileRowToDomain(data))
  }

  /**
   * Column-scoped update — touches `bank_connect_onboarding_version` only.
   * Deliberately not routed through `save()`'s full-row upsert: a caller
   * there without the current value in hand would null this column out.
   */
  async markBankConnectComplete(
    userId: Id<'user'>,
    version: string,
  ): Promise<Result<UserProfile, AppError>> {
    const { data, error } = await this.client
      .from('profiles')
      .update({ bank_connect_onboarding_version: version })
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) {
      logProfileProviderError('save', error)
      return err(toSupabaseAppError(error))
    }
    return ok(profileRowToDomain(data))
  }
}
