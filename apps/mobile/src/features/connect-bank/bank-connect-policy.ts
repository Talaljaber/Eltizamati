/**
 * Completion policy for the "pull obligations from your bank" onboarding
 * step (connect-plan.md Phase D). User-scoped and server-side (on the
 * profile's `bankConnectOnboardingVersion` column) — deliberately not a
 * device-local flag, so one user completing the step can never suppress it
 * for a different user on the same device, and it survives reinstall.
 *
 * Versioned so a future redesign of the flow can force everyone through it
 * again by bumping this constant — an account whose stored version doesn't
 * match is treated exactly like "never completed".
 */
import type { UserProfile } from '@eltizamati/domain'

export const CURRENT_BANK_CONNECT_VERSION = 'v1'

export function hasCompletedBankConnect(profile: UserProfile): boolean {
  return profile.bankConnectOnboardingVersion === CURRENT_BANK_CONNECT_VERSION
}
