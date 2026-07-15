import type { AuthChangeEvent, SupabaseClient, Session } from '@supabase/supabase-js'
import { err, ok, makeError, type Result, type AppError } from '@eltizamati/domain'
import {
  SIGNUP_EMAIL_OTP_LENGTH,
  type AppAuthEvent,
  type AppAuthSession,
  type AuthService,
} from './auth-service'
import { normalizeAuthEmail } from './auth-email'

const OTP_PATTERN = new RegExp(`^\\d{${SIGNUP_EMAIL_OTP_LENGTH}}$`)
const MIN_PASSWORD_LENGTH = 12

function toAppAuthEvent(event: AuthChangeEvent): AppAuthEvent {
  switch (event) {
    case 'INITIAL_SESSION':
      return 'initialSession'
    case 'SIGNED_IN':
      return 'signedIn'
    case 'SIGNED_OUT':
      return 'signedOut'
    case 'TOKEN_REFRESHED':
      return 'tokenRefreshed'
    case 'USER_UPDATED':
      return 'userUpdated'
    default:
      return 'other'
  }
}

function toAppSession(session: Session): AppAuthSession {
  return {
    user: { id: session.user.id, email: session.user.email },
    expiresAt: session.expires_at,
  }
}

interface AuthErrorLike {
  readonly code: string | undefined
  readonly status?: number | undefined
  readonly message: string
}

function toAuthAppError(error: AuthErrorLike): AppError {
  if (error.status === undefined) {
    return makeError('connectivity', {
      safeMetadata: { authErrorCode: error.code ?? 'unknown' },
      cause: error,
    })
  }
  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    error.code === 'over_request_rate_limit'
  ) {
    return makeError('rateLimited', {
      safeMetadata: { authErrorCode: error.code ?? 'unknown' },
      cause: error,
    })
  }
  const otpFailure =
    error.code === 'otp_expired' || error.code === 'token_expired'
      ? 'expired'
      : error.code === 'otp_disabled' || error.code === 'invalid_otp'
        ? 'invalid'
        : undefined
  const reason =
    error.code === 'email_not_confirmed'
      ? 'email_not_confirmed'
      : error.code === 'invalid_credentials'
        ? 'invalid_credentials'
        : error.code === 'weak_password'
          ? 'weak_password'
          : undefined
  return makeError('auth', {
    safeMetadata: {
      authErrorCode: error.code ?? 'unknown',
      ...(otpFailure === undefined ? {} : { otpFailure }),
      ...(reason === undefined ? {} : { reason }),
    },
    cause: error,
  })
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async signUp(email: string, password: string): Promise<Result<void, AppError>> {
    const normalizedEmail = normalizeAuthEmail(email)
    if (normalizedEmail === undefined) {
      return err(makeError('validation', { safeMetadata: { field: 'email' } }))
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return err(makeError('validation', { safeMetadata: { field: 'password' } }))
    }
    const { data, error } = await this.client.auth.signUp({
      email: normalizedEmail,
      password,
    })
    if (error) return err(toAuthAppError(error))
    if (data.session !== null) {
      await this.client.auth.signOut({ scope: 'local' })
      return err(
        makeError('providerUnavailable', {
          safeMetadata: { reason: 'email_confirmation_disabled' },
        }),
      )
    }
    return ok(undefined)
  }

  async signIn(email: string, password: string): Promise<Result<AppAuthSession, AppError>> {
    const normalizedEmail = normalizeAuthEmail(email)
    if (normalizedEmail === undefined) {
      return err(makeError('validation', { safeMetadata: { field: 'email' } }))
    }
    if (password.length === 0) {
      return err(makeError('validation', { safeMetadata: { field: 'password' } }))
    }
    const { data, error } = await this.client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) return err(toAuthAppError(error))
    if (data.session === null) {
      return err(makeError('auth', { safeMetadata: { reason: 'missing_sign_in_session' } }))
    }
    return ok(toAppSession(data.session))
  }

  async verifySignupOtp(email: string, code: string): Promise<Result<AppAuthSession, AppError>> {
    const normalizedEmail = normalizeAuthEmail(email)
    if (normalizedEmail === undefined) {
      return err(makeError('validation', { safeMetadata: { field: 'email' } }))
    }
    if (!OTP_PATTERN.test(code)) {
      return err(makeError('validation', { safeMetadata: { field: 'otp' } }))
    }
    const { data, error } = await this.client.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'email',
    })
    if (error) return err(toAuthAppError(error))
    if (data.session === null) {
      return err(makeError('auth', { safeMetadata: { reason: 'missing_verification_session' } }))
    }
    return ok(toAppSession(data.session))
  }

  async resendSignupOtp(email: string): Promise<Result<void, AppError>> {
    const normalizedEmail = normalizeAuthEmail(email)
    if (normalizedEmail === undefined) {
      return err(makeError('validation', { safeMetadata: { field: 'email' } }))
    }
    const { error } = await this.client.auth.resend({ type: 'signup', email: normalizedEmail })
    if (error) return err(toAuthAppError(error))
    return ok(undefined)
  }

  async signOut(): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signOut()
    if (error) {
      const localResult = await this.clearLocalSession()
      if (!localResult.ok) return err(toAuthAppError(error))
    }
    return ok(undefined)
  }

  async clearLocalSession(): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signOut({ scope: 'local' })
    if (error) return err(toAuthAppError(error))
    return ok(undefined)
  }

  async currentSession(): Promise<Result<AppAuthSession | undefined, AppError>> {
    const { data, error } = await this.client.auth.getSession()
    if (error) return err(toAuthAppError(error))
    return ok(data.session ? toAppSession(data.session) : undefined)
  }

  onAuthStateChange(
    callback: (event: AppAuthEvent, session: AppAuthSession | undefined) => void,
  ): () => void {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((event, session) => {
      callback(toAppAuthEvent(event), session ? toAppSession(session) : undefined)
    })
    return () => subscription.unsubscribe()
  }

  async deleteAccount(): Promise<Result<void, AppError>> {
    const { error } = await this.client.functions.invoke('delete-account')
    if (error !== null) return err(makeError('unexpected', { cause: error }))
    return ok(undefined)
  }
}
