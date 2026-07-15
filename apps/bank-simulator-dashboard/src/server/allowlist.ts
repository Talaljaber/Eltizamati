/**
 * Two distinct allowlists (docs/dashboard.md §6, §11) — do not conflate them:
 *
 *   - `DEMO_ALLOWED_USER_IDS`/`DEMO_ALLOWED_EMAILS`: which test accounts this
 *     app is permitted to read as client-level data. Every server query that
 *     reaches client-level data MUST call `assertAllowlistConfigured()` first
 *     and filter to `getDashboardEnv().demoAllowedUserIds`. No "show all auth
 *     users" path exists anywhere in this app.
 *   - `EMAIL_RECIPIENT_ALLOWLIST`: which addresses the email gateway may
 *     actually send to (§11) — a separate, send-time gate, checked by
 *     `isEmailRecipientAllowlisted` below.
 */
import { DomainInvariantError } from '@eltizamati/domain'
import { getDashboardEnv } from './env'

/** Throws if the allowlist is empty — refuses to load any client-level data. */
export function assertAllowlistConfigured(): readonly string[] {
  const { demoAllowedUserIds } = getDashboardEnv()
  if (demoAllowedUserIds.length === 0) {
    throw new DomainInvariantError(
      'authorization',
      'DEMO_ALLOWED_USER_IDS is empty — refusing to load client-level information (docs/dashboard.md §6).',
    )
  }
  return demoAllowedUserIds
}

export function isUserAllowlisted(userId: string): boolean {
  const { demoAllowedUserIds } = getDashboardEnv()
  return demoAllowedUserIds.includes(userId)
}

export function isEmailRecipientAllowlisted(email: string): boolean {
  const { emailRecipientAllowlist } = getDashboardEnv()
  return emailRecipientAllowlist.some((allowed) => allowed.toLowerCase() === email.toLowerCase())
}
