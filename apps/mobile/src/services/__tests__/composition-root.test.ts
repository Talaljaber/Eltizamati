import { createPersonalRepositoryRegistry } from '../composition-root'
import { SupabaseObligationRepository } from '../repositories/supabase/obligation-repository'
import { SupabasePaymentRepository } from '../repositories/supabase/payment-repository'
import { SupabaseRatePeriodRepository } from '../repositories/supabase/rate-period-repository'
import { SupabaseCalculationRunRepository } from '../repositories/supabase/calculation-run-repository'
import { SupabaseInsightRepository } from '../repositories/supabase/insight-repository'
import { SupabaseConsentRepository } from '../repositories/supabase/consent-repository'
import { SupabaseUserProfileRepository } from '../repositories/supabase/user-profile-repository'

describe('createPersonalRepositoryRegistry', () => {
  it('constructs every personal repository from the caller-owned Supabase client only', () => {
    const client = { mockClient: true } as never
    const repositories = createPersonalRepositoryRegistry(client)

    expect(repositories.obligationRepository).toBeInstanceOf(SupabaseObligationRepository)
    expect(repositories.paymentRepository).toBeInstanceOf(SupabasePaymentRepository)
    expect(repositories.ratePeriodRepository).toBeInstanceOf(SupabaseRatePeriodRepository)
    expect(repositories.calculationRunRepository).toBeInstanceOf(SupabaseCalculationRunRepository)
    expect(repositories.insightRepository).toBeInstanceOf(SupabaseInsightRepository)
    expect(repositories.consentRepository).toBeInstanceOf(SupabaseConsentRepository)
    expect(repositories.userProfileRepository).toBeInstanceOf(SupabaseUserProfileRepository)
  })
})
