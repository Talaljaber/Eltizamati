/**
 * Auth/session service port (Phase 4). Named `AppAuthUser`/`AppAuthSession`
 * (not `AuthUser`/`AuthSession`) to avoid colliding with supabase-js's own
 * exports of those names — implementations translate between the two.
 */
import type { Result, AppError } from '@eltizamati/domain'

export interface AppAuthUser {
  readonly id: string
  readonly email: string | undefined
}

export interface AppAuthSession {
  readonly user: AppAuthUser
  /** Unix seconds; undefined if the provider didn't report one. */
  readonly expiresAt: number | undefined
}

export type AppAuthEvent =
  | 'initialSession'
  | 'signedIn'
  | 'signedOut'
  | 'passwordRecovery'
  | 'tokenRefreshed'
  | 'userUpdated'
  | 'other'

export interface AuthCallbackResult {
  readonly kind: 'authentication' | 'passwordRecovery'
  readonly session: AppAuthSession
}

export interface AuthService {
  signUp(email: string, password: string): Promise<Result<AppAuthSession | undefined, AppError>>
  signIn(email: string, password: string): Promise<Result<AppAuthSession, AppError>>
  signOut(): Promise<Result<void, AppError>>
  /** Clears only this device's persisted session, including after server-side deletion. */
  clearLocalSession(): Promise<Result<void, AppError>>
  /** SCR-AUTH-RESET: sends a reset-password email; no session yet returned. */
  resetPassword(email: string): Promise<Result<void, AppError>>
  currentSession(): Promise<Result<AppAuthSession | undefined, AppError>>
  /** Returns an unsubscribe function. */
  onAuthStateChange(
    callback: (event: AppAuthEvent, session: AppAuthSession | undefined) => void,
  ): () => void
  /**
   * SCR-AUTH-CALLBACK: completes the sign-up/reset email link's deep-link
   * handoff, establishing a session from whatever the provider attached to
   * the URL. `url` is the full incoming deep link.
   */
  exchangeCallbackUrl(url: string): Promise<Result<AuthCallbackResult, AppError>>
  /** Completes a recovery flow after the user explicitly supplies a new password. */
  updatePassword(password: string): Promise<Result<void, AppError>>
  /** FR-SET-003 (personal mode): server-side erasure via the `delete-account` Edge Function. */
  deleteAccount(): Promise<Result<void, AppError>>
}
