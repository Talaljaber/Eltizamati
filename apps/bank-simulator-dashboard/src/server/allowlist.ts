/**
 * `DEMO_ALLOWED_USER_IDS`: which test accounts this app is permitted to read
 * as client-level data (docs/dashboard.md §6). Every server query that
 * reaches client-level data MUST call `assertAllowlistConfigured()` first
 * and filter to `getDashboardEnv().demoAllowedUserIds`. No "show all auth
 * users" path exists anywhere in this app.
 *
 * There is no separate email-recipient allowlist — the email gateway's
 * send-time gate (docs/dashboard.md §11) checks the recipient against the
 * email already on file for an allowlisted profile instead
 * (`isEmailOnAllowlistedProfile` in `./repositories/profile-repository`),
 * which is itself scoped to this same `demoAllowedUserIds` list.
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
