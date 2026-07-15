/** Supabase remains the sole password, session, JWT, and auth-user authority. */
import type { Result, AppError } from '@eltizamati/domain'

export const SIGNUP_EMAIL_OTP_LENGTH = 8

export interface AppAuthUser {
  readonly id: string
  readonly email: string | undefined
}

export interface AppAuthSession {
  readonly user: AppAuthUser
  /** Unix seconds; undefined if the provider did not report one. */
  readonly expiresAt: number | undefined
}

export type AppAuthEvent =
  'initialSession' | 'signedIn' | 'signedOut' | 'tokenRefreshed' | 'userUpdated' | 'other'

export interface AuthService {
  /** Creates an unverified password account and requests email confirmation. */
  signUp(email: string, password: string): Promise<Result<void, AppError>>
  /** Authenticates an already verified account with its password. */
  signIn(email: string, password: string): Promise<Result<AppAuthSession, AppError>>
  /** Verifies the first-time email confirmation code and requires a real session. */
  verifySignupOtp(email: string, code: string): Promise<Result<AppAuthSession, AppError>>
  resendSignupOtp(email: string): Promise<Result<void, AppError>>
  signOut(): Promise<Result<void, AppError>>
  /** Clears only this device's persisted session, including after server-side deletion. */
  clearLocalSession(): Promise<Result<void, AppError>>
  currentSession(): Promise<Result<AppAuthSession | undefined, AppError>>
  /** Returns an unsubscribe function. */
  onAuthStateChange(
    callback: (event: AppAuthEvent, session: AppAuthSession | undefined) => void,
  ): () => void
  /** FR-SET-003: server-side erasure via the delete-account Edge Function. */
  deleteAccount(): Promise<Result<void, AppError>>
}
