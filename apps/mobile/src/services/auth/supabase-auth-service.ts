import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { err, ok, makeError, type Result, type AppError } from '@eltizamati/domain'
import type { AppAuthSession, AuthService } from './auth-service'

function toAppSession(session: Session): AppAuthSession {
  return {
    user: { id: session.user.id, email: session.user.email },
    expiresAt: session.expires_at,
  }
}

/**
 * supabase-js's AuthError leaves `status` undefined specifically for
 * failures that occurred before any HTTP response was received (network
 * unreachable, DNS failure, request timeout) — as opposed to a real
 * rejection from the server (invalid credentials, email in use), which
 * always carries a status code. Classifying the former as `connectivity`
 * (not `auth`) is what lets `toErrorUiState` show the offline surface
 * instead of an incorrect "check your credentials" message.
 */
function toAuthAppError(error: {
  code: string | undefined
  status?: number | undefined
  message: string
}): AppError {
  if (error.status === undefined) {
    return makeError('connectivity', {
      safeMetadata: { authErrorCode: error.code ?? 'unknown' },
      cause: error,
    })
  }
  return makeError('auth', {
    safeMetadata: { authErrorCode: error.code ?? 'unknown' },
    cause: error,
  })
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async signUp(
    email: string,
    password: string,
  ): Promise<Result<AppAuthSession | undefined, AppError>> {
    const { data, error } = await this.client.auth.signUp({ email, password })
    if (error) return err(toAuthAppError(error))
    return ok(data.session ? toAppSession(data.session) : undefined)
  }

  async signIn(email: string, password: string): Promise<Result<AppAuthSession, AppError>> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) return err(toAuthAppError(error))
    return ok(toAppSession(data.session))
  }

  async signOut(): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.signOut()
    if (error) return err(toAuthAppError(error))
    return ok(undefined)
  }

  async resetPassword(email: string): Promise<Result<void, AppError>> {
    const { error } = await this.client.auth.resetPasswordForEmail(email)
    if (error) return err(toAuthAppError(error))
    return ok(undefined)
  }

  async currentSession(): Promise<Result<AppAuthSession | undefined, AppError>> {
    const { data, error } = await this.client.auth.getSession()
    if (error) return err(toAuthAppError(error))
    return ok(data.session ? toAppSession(data.session) : undefined)
  }

  onAuthStateChange(callback: (session: AppAuthSession | undefined) => void): () => void {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session ? toAppSession(session) : undefined)
    })
    return () => {
      subscription.unsubscribe()
    }
  }

  async deleteAccount(): Promise<Result<void, AppError>> {
    const { error } = await this.client.functions.invoke('delete-account')
    if (error !== null) return err(makeError('unexpected', { cause: error }))
    return ok(undefined)
  }
}
