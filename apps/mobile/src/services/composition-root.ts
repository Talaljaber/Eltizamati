/**
 * Composition root (system-architecture.md §6, Phase 4 foundation). The only
 * place `dataMode` selects the repository family. Demo mode never touches
 * Supabase — `getSupabaseClient()` isn't called at all for `dataMode ===
 * 'demo'`, so a missing/invalid env doesn't affect the demo path.
 *
 * Only `userProfileRepository` is wired so far (the reference implementation
 * from this foundation slice); the remaining six `packages/domain`
 * repository ports follow the same pattern in the next Phase 4 slice — see
 * `services/repositories/supabase/user-profile-repository.ts`. Demo
 * repositories are Phase 5's responsibility (ADR-0017).
 */
import type { QueryClient } from '@tanstack/react-query'
import { ok, type Result, type AppError, type DataMode } from '@eltizamati/domain'
import { createQueryClient } from './query-client'
import { getSupabaseClient } from '../core/supabase/client'
import type { AuthService } from './auth/auth-service'
import { SupabaseAuthService } from './auth/supabase-auth-service'
import { SupabaseUserProfileRepository } from './repositories/supabase/user-profile-repository'

export interface CompositionRoot {
  readonly queryClient: QueryClient
  /** undefined in demo mode — personal-mode-only services are never constructed. */
  readonly authService: AuthService | undefined
  readonly userProfileRepository: SupabaseUserProfileRepository | undefined
}

export function createCompositionRoot(dataMode: DataMode): Result<CompositionRoot, AppError> {
  const queryClient = createQueryClient()

  if (dataMode === 'demo') {
    return ok({ queryClient, authService: undefined, userProfileRepository: undefined })
  }

  const clientResult = getSupabaseClient()
  if (!clientResult.ok) return clientResult

  return ok({
    queryClient,
    authService: new SupabaseAuthService(clientResult.value),
    userProfileRepository: new SupabaseUserProfileRepository(clientResult.value),
  })
}
