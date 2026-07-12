/**
 * Auth service context — Phase 4.
 *
 * Always mounted (unlike demo repositories, which boot conditionally). The
 * real Supabase client (`getSupabaseClient()`) is constructed lazily, on
 * first actual `getServices()` invocation, not at provider-mount time —
 * this matters because constructing a `SupabaseClient` also constructs a
 * `GoTrueClient`, whose constructor auto-runs session recovery/refresh
 * against SecureStore/network regardless of the app's current `dataMode`.
 * Eagerly constructing it at mount would silently touch the network in
 * demo mode too, whenever a stale personal-mode session happens to be
 * persisted in SecureStore from prior use on the same device — breaking
 * the "demo mode is airplane-mode-safe" guarantee.
 *
 * Two access patterns:
 *   - `useAuthService()`/`useConsentRepository()` — eager, for the auth
 *     screens (sign-in/sign-up/reset), which always need the real service
 *     immediately since they're only ever reached on the personal-mode path.
 *   - `useAuthServiceLazy()` — returns a getter instead of an already-
 *     resolved `Result`, for hooks like `useActiveUser` that run on every
 *     render of demo-mode screens too. Merely calling this hook must not
 *     construct the real client; only invoking the returned getter does.
 */

import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'
import {
  DomainInvariantError,
  err,
  ok,
  type AppError,
  type ConsentRepository,
  type Result,
} from '@eltizamati/domain'
import { getSupabaseClient } from '@/core/supabase/client'
import type { AuthService } from '@/services/auth/auth-service'
import { SupabaseAuthService } from '@/services/auth/supabase-auth-service'
import { SupabaseConsentRepository } from '@/services/repositories/supabase/consent-repository'

interface PersonalAuthServices {
  readonly authService: AuthService
  /** For the sign-up/first-sign-in server-backed consent write (PHASE-04 §3). */
  readonly consentRepository: ConsentRepository
}

type ServicesGetter = () => Result<PersonalAuthServices, AppError>

const AuthServiceContext = createContext<ServicesGetter | null>(null)

export function AuthServiceProvider({ children }: { children: ReactNode }) {
  // A ref, not useMemo/useState: construction must happen lazily on first
  // `getServices()` call, not eagerly during this provider's own render.
  const cachedRef = useRef<Result<PersonalAuthServices, AppError> | undefined>(undefined)
  const getServices = useCallback((): Result<PersonalAuthServices, AppError> => {
    if (cachedRef.current !== undefined) return cachedRef.current
    const clientResult = getSupabaseClient()
    if (!clientResult.ok) {
      cachedRef.current = err(clientResult.error)
      return cachedRef.current
    }
    const client = clientResult.value
    cachedRef.current = ok({
      authService: new SupabaseAuthService(client),
      consentRepository: new SupabaseConsentRepository(client),
    })
    return cachedRef.current
  }, [])

  return <AuthServiceContext.Provider value={getServices}>{children}</AuthServiceContext.Provider>
}

function useServicesGetter(): ServicesGetter {
  const getServices = useContext(AuthServiceContext)
  if (getServices === null) {
    throw new DomainInvariantError(
      'unexpected',
      'useAuthService must be used within AuthServiceProvider',
    )
  }
  return getServices
}

export function useAuthService(): Result<AuthService, AppError> {
  const result = useServicesGetter()()
  return result.ok ? ok(result.value.authService) : result
}

export function useConsentRepository(): Result<ConsentRepository, AppError> {
  const result = useServicesGetter()()
  return result.ok ? ok(result.value.consentRepository) : result
}

/**
 * Lazy variant of `useAuthService()` — returns a getter instead of an
 * already-resolved `Result`. Calling this hook is always safe/cheap in any
 * `dataMode`; only calling the returned function constructs the real
 * Supabase-backed `AuthService`. Callers (e.g. `useActiveUser`) must only
 * invoke the getter once they know `dataMode === 'personal'`.
 */
export function useAuthServiceLazy(): () => Result<AuthService, AppError> {
  const getServices = useServicesGetter()
  return useCallback((): Result<AuthService, AppError> => {
    const result = getServices()
    return result.ok ? ok(result.value.authService) : result
  }, [getServices])
}
