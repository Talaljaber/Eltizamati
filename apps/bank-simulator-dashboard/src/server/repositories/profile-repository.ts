/**
 * Profile reads for the dashboard. The demo user-id allowlist has been
 * removed — the dashboard operates over every personal account. Outgoing
 * email/notification is instead gated by the recipient's own consent
 * (`isRecipientConsented`), captured when they accept the Terms & Conditions
 * (which include email/notification consent) in the mobile app.
 */
import {
  err,
  ok,
  makeError,
  type AppError,
  type Result,
  type UserProfile,
} from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { profileRowToDomain } from '../mappers/profile-mapper'

/** The consent document whose acceptance carries email/notification consent. */
const CONSENT_DOC_TYPE = 'privacy-policy'

export async function listAllowlistedProfiles(): Promise<Result<readonly UserProfile[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.from('profiles').select('*')

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(profileRowToDomain))
}

/**
 * Send-time gate (docs/dashboard.md §11), now consent-based rather than
 * allowlist-based. An email is only sendable when BOTH:
 *   1. the recipient address is the one on file for that account (never an
 *      arbitrary typed address), and
 *   2. the account holder has accepted the current Terms & Conditions, which
 *      include consent to receive emails and notifications.
 * Fails closed — any read error, missing profile, mismatched address, or
 * absent consent record means the message is not sendable.
 */
export async function isRecipientConsented(userId: string, email: string): Promise<boolean> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return false
  const client = clientResult.value

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileError !== null || profile === null) return false

  const onFile = profile.email?.toLowerCase()
  if (onFile === undefined || onFile !== email.toLowerCase()) return false

  const { data: consent, error: consentError } = await client
    .from('consent_records')
    .select('id')
    .eq('user_id', userId)
    .eq('doc_type', CONSENT_DOC_TYPE)
    .limit(1)
    .maybeSingle()
  if (consentError !== null) return false
  return consent !== null
}
