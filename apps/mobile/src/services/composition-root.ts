/**
 * Composition root (system-architecture.md §6, Phase 4). The only place
 * `dataMode` selects the repository family. Demo mode never touches
 * Supabase — `getSupabaseClient()` isn't called at all for `dataMode ===
 * 'demo'`, so a missing/invalid env doesn't affect the demo path.
 *
 * All seven `packages/domain` repository ports are wired for personal mode.
 * Demo repositories (Phase 5) must expose the identical `repositories` shape
 * so application services/hooks stay mode-agnostic (ADR-0009).
 */
import type { QueryClient } from '@tanstack/react-query'
import {
  ok,
  type Result,
  type AppError,
  type DataMode,
  type ObligationRepository,
  type PaymentRepository,
  type RatePeriodRepository,
  type CalculationRunRepository,
  type InsightRepository,
  type ConsentRepository,
  type UserProfileRepository,
} from '@eltizamati/domain'
import { createQueryClient } from './query-client'
import { getSupabaseClient } from '../core/supabase/client'
import type { AuthService } from './auth/auth-service'
import { SupabaseAuthService } from './auth/supabase-auth-service'
import { SupabaseUserProfileRepository } from './repositories/supabase/user-profile-repository'
import { SupabaseObligationRepository } from './repositories/supabase/obligation-repository'
import { SupabasePaymentRepository } from './repositories/supabase/payment-repository'
import { SupabaseRatePeriodRepository } from './repositories/supabase/rate-period-repository'
import { SupabaseCalculationRunRepository } from './repositories/supabase/calculation-run-repository'
import { SupabaseInsightRepository } from './repositories/supabase/insight-repository'
import { SupabaseConsentRepository } from './repositories/supabase/consent-repository'

export interface RepositoryRegistry {
  readonly obligation: ObligationRepository
  readonly payment: PaymentRepository
  readonly ratePeriod: RatePeriodRepository
  readonly calculationRun: CalculationRunRepository
  readonly insight: InsightRepository
  readonly consent: ConsentRepository
  readonly userProfile: UserProfileRepository
}

export interface CompositionRoot {
  readonly queryClient: QueryClient
  /** undefined in demo mode — personal-mode-only services are never constructed. */
  readonly authService: AuthService | undefined
  /** undefined in demo mode — Phase 5 constructs the in-memory demo family instead. */
  readonly repositories: RepositoryRegistry | undefined
}

export function createCompositionRoot(dataMode: DataMode): Result<CompositionRoot, AppError> {
  const queryClient = createQueryClient()

  if (dataMode === 'demo') {
    return ok({ queryClient, authService: undefined, repositories: undefined })
  }

  const clientResult = getSupabaseClient()
  if (!clientResult.ok) return clientResult
  const client = clientResult.value

  return ok({
    queryClient,
    authService: new SupabaseAuthService(client),
    repositories: {
      obligation: new SupabaseObligationRepository(client),
      payment: new SupabasePaymentRepository(client),
      ratePeriod: new SupabaseRatePeriodRepository(client),
      calculationRun: new SupabaseCalculationRunRepository(client),
      insight: new SupabaseInsightRepository(client),
      consent: new SupabaseConsentRepository(client),
      userProfile: new SupabaseUserProfileRepository(client),
    },
  })
}
