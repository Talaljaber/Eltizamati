/**
 * Auth service context — Phase 4.
 *
 * Always mounted (unlike demo repositories, which boot conditionally): the
 * Supabase client is lazily constructed and cached by `getSupabaseClient()`,
 * so mounting this provider has no effect on demo mode and no network cost
 * until a screen actually calls a method. If env is missing/invalid, the
 * context holds a `Result` err instead of throwing — auth screens render
 * that as a fatal error state rather than crashing the app.
 *
 * Usage:
 *   const authServiceResult = useAuthService()
 *   if (!authServiceResult.ok) { ...render fatal state... }
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
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

const AuthServiceContext = createContext<Result<PersonalAuthServices, AppError> | null>(null)

export function AuthServiceProvider({ children }: { children: ReactNode }) {
  const result = useMemo<Result<PersonalAuthServices, AppError>>(() => {
    const clientResult = getSupabaseClient()
    if (!clientResult.ok) return err(clientResult.error)
    const client = clientResult.value
    return ok({
      authService: new SupabaseAuthService(client),
      consentRepository: new SupabaseConsentRepository(client),
    })
  }, [])

  return <AuthServiceContext.Provider value={result}>{children}</AuthServiceContext.Provider>
}

function usePersonalAuthServices(): Result<PersonalAuthServices, AppError> {
  const result = useContext(AuthServiceContext)
  if (result === null) {
    throw new DomainInvariantError(
      'unexpected',
      'useAuthService must be used within AuthServiceProvider',
    )
  }
  return result
}

export function useAuthService(): Result<AuthService, AppError> {
  const result = usePersonalAuthServices()
  return result.ok ? ok(result.value.authService) : result
}

export function useConsentRepository(): Result<ConsentRepository, AppError> {
  const result = usePersonalAuthServices()
  return result.ok ? ok(result.value.consentRepository) : result
}
