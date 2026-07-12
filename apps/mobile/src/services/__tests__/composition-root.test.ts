import { err, isErr, isOk, makeError, ok } from '@eltizamati/domain'
import { QueryClient } from '@tanstack/react-query'
import { createCompositionRoot } from '../composition-root'
import { getSupabaseClient } from '../../core/supabase/client'
import { SupabaseAuthService } from '../auth/supabase-auth-service'
import { SupabaseObligationRepository } from '../repositories/supabase/obligation-repository'
import { SupabasePaymentRepository } from '../repositories/supabase/payment-repository'
import { SupabaseRatePeriodRepository } from '../repositories/supabase/rate-period-repository'
import { SupabaseCalculationRunRepository } from '../repositories/supabase/calculation-run-repository'
import { SupabaseInsightRepository } from '../repositories/supabase/insight-repository'
import { SupabaseConsentRepository } from '../repositories/supabase/consent-repository'
import { SupabaseUserProfileRepository } from '../repositories/supabase/user-profile-repository'

jest.mock('../../core/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}))

describe('createCompositionRoot', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('demo mode never calls getSupabaseClient and leaves personal-mode services undefined', () => {
    const result = createCompositionRoot('demo')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.queryClient).toBeInstanceOf(QueryClient)
      expect(result.value.authService).toBeUndefined()
      expect(result.value.repositories).toBeUndefined()
    }
    expect(getSupabaseClient).not.toHaveBeenCalled()
  })

  it('personal mode constructs authService and every repository from the Supabase client', () => {
    const fakeClient = { mockClient: true } as never
    jest.mocked(getSupabaseClient).mockReturnValue(ok(fakeClient))

    const result = createCompositionRoot('personal')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.authService).toBeInstanceOf(SupabaseAuthService)
      const repos = result.value.repositories
      expect(repos?.obligationRepository).toBeInstanceOf(SupabaseObligationRepository)
      expect(repos?.paymentRepository).toBeInstanceOf(SupabasePaymentRepository)
      expect(repos?.ratePeriodRepository).toBeInstanceOf(SupabaseRatePeriodRepository)
      expect(repos?.calculationRunRepository).toBeInstanceOf(SupabaseCalculationRunRepository)
      expect(repos?.insightRepository).toBeInstanceOf(SupabaseInsightRepository)
      expect(repos?.consentRepository).toBeInstanceOf(SupabaseConsentRepository)
      expect(repos?.userProfileRepository).toBeInstanceOf(SupabaseUserProfileRepository)
    }
  })

  it('personal mode propagates a Supabase client construction failure', () => {
    jest.mocked(getSupabaseClient).mockReturnValue(err(makeError('unexpected')))

    const result = createCompositionRoot('personal')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('unexpected')
  })
})
