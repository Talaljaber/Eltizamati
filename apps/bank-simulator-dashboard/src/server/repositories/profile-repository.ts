/**
 * Allowlist-gated profile reads. Every query here filters to
 * `assertAllowlistConfigured()`'s user-id list — there is no "list all
 * profiles" path (docs/dashboard.md §6).
 */
import {
  err,
  ok,
  makeError,
  type AppError,
  type Result,
  type UserProfile,
} from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { profileRowToDomain } from '../mappers/profile-mapper'

export async function listAllowlistedProfiles(): Promise<Result<readonly UserProfile[], AppError>> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('profiles')
    .select('*')
    .in('user_id', allowedUserIds)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(profileRowToDomain))
}

/**
 * The email gateway's send-time gate (docs/dashboard.md §11) — replaces a
 * separate `EMAIL_RECIPIENT_ALLOWLIST` env list with a check against the
 * email already on file for an allowlisted account. This can never be
 * broader than before: `listAllowlistedProfiles()` is itself scoped to
 * `DEMO_ALLOWED_USER_IDS`, so a match here is always a real address
 * belonging to an already-allowlisted test account. Fails closed — if the
 * profile read itself fails, nothing is treated as sendable.
 */
export async function isEmailOnAllowlistedProfile(email: string): Promise<boolean> {
  const profiles = await listAllowlistedProfiles()
  if (!profiles.ok) return false
  const normalized = email.toLowerCase()
  return profiles.value.some((profile) => profile.email?.toLowerCase() === normalized)
}
