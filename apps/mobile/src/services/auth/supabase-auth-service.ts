import type { SupabaseClient, Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { err, ok, makeError, type Result, type AppError } from '@eltizamati/domain'
import type { AppAuthSession, AuthService } from './auth-service'

/**
 * The URL Supabase's confirmation/reset emails link back to. Without this,
 * Supabase falls back to the project's dashboard "Site URL" — which for a
 * mobile-only project is typically an unconfigured placeholder (often
 * localhost), producing a link the user can't open on their phone.
 *
 * `Linking.createURL` resolves to the right scheme for the current
 * environment (the app's custom scheme in a standalone/dev-client build,
 * an `exp://` dev-server URL in Expo Go) — see app.json's `expo.scheme`.
 *
 * This only takes effect once the same URL is added to the Supabase
 * project's Authentication → URL Configuration → Redirect URLs allowlist;
 * Supabase silently ignores redirect URLs that aren't allow-listed.
 */
function authCallbackUrl(): string {
  return Linking.createURL('/auth/callback')
}

/**
 * Supabase can send back either link shape depending on the project's
 * configured auth flow type: PKCE (`?code=`, a query param) or implicit
 * (`#access_token=...&refresh_token=...`, a URL fragment).
 */
function tokensFromFragment(
  url: string,
): { accessToken: string; refreshToken: string } | undefined {
  const hashIndex = url.indexOf('#')
  if (hashIndex === -1) return undefined
  const fragment = new URLSearchParams(url.slice(hashIndex + 1))
  const accessToken = fragment.get('access_token')
  const refreshToken = fragment.get('refresh_token')
  if (accessToken === null || refreshToken === null) return undefined
  return { accessToken, refreshToken }
}

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
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authCallbackUrl() },
    })
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
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(),
    })
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

  async exchangeCallbackUrl(url: string): Promise<Result<void, AppError>> {
    const { queryParams } = Linking.parse(url)
    const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined

    if (code !== undefined) {
      const { error } = await this.client.auth.exchangeCodeForSession(code)
      if (error) return err(toAuthAppError(error))
      return ok(undefined)
    }

    const tokens = tokensFromFragment(url)
    if (tokens === undefined) {
      return err(makeError('unexpected', { safeMetadata: { reason: 'no code or tokens in url' } }))
    }
    const { error } = await this.client.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    })
    if (error) return err(toAuthAppError(error))
    return ok(undefined)
  }
}
