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
import type { Database } from '../../../core/supabase/database.types'
import { profileDomainToRow, profileRowToDomain } from './mappers/user-profile-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', {
    safeMetadata: { postgresErrorCode: error.code },
    cause: error,
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
    if (error) return err(toStorageAppError(error))
    if (data === null) return err(makeError('notFound'))
    return ok(profileRowToDomain(data))
  }

  async save(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const { data, error } = await this.client
      .from('profiles')
      .upsert(profileDomainToRow(profile))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(profileRowToDomain(data))
  }
}
