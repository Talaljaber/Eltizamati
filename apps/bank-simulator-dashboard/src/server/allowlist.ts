/**
 * The demo user-id allowlist has been removed. The dashboard now operates over
 * every personal account, and outgoing email/notification is gated per
 * recipient by their own consent (see `isRecipientConsented` in
 * `./repositories/profile-repository`) rather than by a static allowlist.
 *
 * `isUserAllowlisted` is kept as an always-true shim so the few historical
 * call sites (a client-page guard, rate-campaign eligibility) keep compiling
 * without special-casing; every existing account is now permitted.
 */
export function isUserAllowlisted(_userId: string): boolean {
  return true
}
