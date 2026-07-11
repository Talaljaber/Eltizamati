import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { err, ok, makeError, type Result, type AppError } from '@eltizamati/domain'
import type { AppAuthSession, AuthService } from './auth-service'

function toAppSession(session: Session): AppAuthSession {
  return {
    user: { id: session.user.id, email: session.user.email },
    expiresAt: session.expires_at,
  }
}

function toAuthAppError(error: { code: string | undefined; message: string }): AppError {
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
}
