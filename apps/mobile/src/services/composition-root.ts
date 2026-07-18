/**
 * Personal repository composition (system-architecture.md §6).
 *
 * AppProviders owns the production QueryClient and AuthServiceProvider owns
 * the lazily-created Supabase client/AuthService. This module deliberately
 * builds only repositories from that already-owned client so personal boot
 * cannot create disposable query or auth lifecycles.
 */
import type {
  CalculationRunRepository,
  ConsentRepository,
  InsightRepository,
  LoanApplicationRepository,
  LoanScheduleProposalRepository,
  ObligationRepository,
  PaymentRepository,
  RatePeriodRepository,
  UserProfileRepository,
} from '@eltizamati/domain'
import { SupabaseUserProfileRepository } from './repositories/supabase/user-profile-repository'
import { SupabaseObligationRepository } from './repositories/supabase/obligation-repository'
import { SupabasePaymentRepository } from './repositories/supabase/payment-repository'
import { SupabaseRatePeriodRepository } from './repositories/supabase/rate-period-repository'
import { SupabaseCalculationRunRepository } from './repositories/supabase/calculation-run-repository'
import { SupabaseInsightRepository } from './repositories/supabase/insight-repository'
import { SupabaseConsentRepository } from './repositories/supabase/consent-repository'
import { SupabaseLoanApplicationRepository } from './repositories/supabase/loan-application-repository'
import { SupabaseLoanScheduleProposalRepository } from './repositories/supabase/loan-schedule-proposal-repository'

type PersonalRepositoryClient = ConstructorParameters<typeof SupabaseObligationRepository>[0]

export interface RepositoryRegistry {
  readonly obligationRepository: ObligationRepository
  readonly paymentRepository: PaymentRepository
  readonly ratePeriodRepository: RatePeriodRepository
  readonly calculationRunRepository: CalculationRunRepository
  readonly insightRepository: InsightRepository
  readonly consentRepository: ConsentRepository
  readonly userProfileRepository: UserProfileRepository
  readonly loanApplicationRepository: LoanApplicationRepository
  readonly loanScheduleProposalRepository: LoanScheduleProposalRepository
  /** Only present for the demo family — personal mode has no in-memory state to reset. */
  readonly reset?: () => void
}

export function createPersonalRepositoryRegistry(
  client: PersonalRepositoryClient,
): RepositoryRegistry {
  return {
    obligationRepository: new SupabaseObligationRepository(client),
    paymentRepository: new SupabasePaymentRepository(client),
    ratePeriodRepository: new SupabaseRatePeriodRepository(client),
    calculationRunRepository: new SupabaseCalculationRunRepository(client),
    insightRepository: new SupabaseInsightRepository(client),
    consentRepository: new SupabaseConsentRepository(client),
    userProfileRepository: new SupabaseUserProfileRepository(client),
    loanApplicationRepository: new SupabaseLoanApplicationRepository(client),
    loanScheduleProposalRepository: new SupabaseLoanScheduleProposalRepository(client),
  }
}
