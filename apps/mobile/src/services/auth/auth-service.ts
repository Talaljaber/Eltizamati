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

export interface AuthService {
  signUp(email: string, password: string): Promise<Result<AppAuthSession | undefined, AppError>>
  signIn(email: string, password: string): Promise<Result<AppAuthSession, AppError>>
  signOut(): Promise<Result<void, AppError>>
  /** SCR-AUTH-RESET: sends a reset-password email; no session yet returned. */
  resetPassword(email: string): Promise<Result<void, AppError>>
  currentSession(): Promise<Result<AppAuthSession | undefined, AppError>>
  /** Returns an unsubscribe function. */
  onAuthStateChange(callback: (session: AppAuthSession | undefined) => void): () => void
  /** FR-SET-003 (personal mode): server-side erasure via the `delete-account` Edge Function. */
  deleteAccount(): Promise<Result<void, AppError>>
}
