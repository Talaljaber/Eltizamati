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
import { decryptField, encryptField } from '../../../core/crypto/field-cipher'
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

  /**
   * Encrypts the three client-encrypted PII columns on a mapped insert/upsert row before it
   * leaves the device. `email` is intentionally NOT encrypted (denormalized copy of the
   * plaintext auth.users.email — see the encryption plan); every other column is left as-is.
   */
  private async encryptRow<T extends Database['public']['Tables']['profiles']['Insert']>(
    row: T,
  ): Promise<Result<T, AppError>> {
    const encrypted = { ...row }
    for (const field of ['full_name', 'phone_number', 'primary_bank'] as const) {
      const value = row[field]
      if (typeof value !== 'string') continue
      const result = await encryptField(this.client, value)
      if (!result.ok) return result
      encrypted[field] = result.value as T[typeof field]
    }
    return ok(encrypted)
  }

  /** Decrypts the three client-encrypted PII fields on a mapped domain profile after any read. */
  private async decryptProfile(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const decrypted = { ...profile }
    for (const field of ['fullName', 'phoneNumber', 'primaryBank'] as const) {
      const value = profile[field]
      if (value === undefined) continue
      const result = await decryptField(this.client, value)
      if (!result.ok) return result
      decrypted[field] = result.value
    }
    return ok(decrypted)
  }

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
    return this.decryptProfile(profileRowToDomain(data))
  }

  async save(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const rowResult = await this.encryptRow(profileDomainToRow(profile))
    if (!rowResult.ok) return rowResult
    const { data, error } = await this.client
      .from('profiles')
      .upsert(rowResult.value)
      .select('*')
      .single()
    if (error) {
      logProfileProviderError('save', error)
      return err(toSupabaseAppError(error))
    }
    return this.decryptProfile(profileRowToDomain(data))
  }

  async createIfAbsent(profile: UserProfile): Promise<Result<UserProfile, AppError>> {
    const rowResult = await this.encryptRow(profileDomainToInsertRow(profile))
    if (!rowResult.ok) return rowResult
    const { data, error } = await this.client
      .from('profiles')
      .insert(rowResult.value)
      .select('*')
      .single()
    if (error?.code === '23505') return this.get(profile.userId)
    if (error) {
      logProfileProviderError('create', error)
      return err(toSupabaseAppError(error))
    }
    return this.decryptProfile(profileRowToDomain(data))
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
    // The row read back here still carries the encrypted PII columns (this update touched only
    // the version flag) — decrypt them so the returned profile is consistent with get()/save().
    return this.decryptProfile(profileRowToDomain(data))
  }
}
