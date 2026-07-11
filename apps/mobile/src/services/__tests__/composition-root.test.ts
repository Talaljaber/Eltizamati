import { err, isErr, isOk, makeError, ok } from '@eltizamati/domain'
import { QueryClient } from '@tanstack/react-query'
import { createCompositionRoot } from '../composition-root'
import { getSupabaseClient } from '../../core/supabase/client'
import { SupabaseAuthService } from '../auth/supabase-auth-service'
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
      expect(result.value.userProfileRepository).toBeUndefined()
    }
    expect(getSupabaseClient).not.toHaveBeenCalled()
  })

  it('personal mode constructs authService and userProfileRepository from the Supabase client', () => {
    const fakeClient = { mockClient: true } as never
    jest.mocked(getSupabaseClient).mockReturnValue(ok(fakeClient))

    const result = createCompositionRoot('personal')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.authService).toBeInstanceOf(SupabaseAuthService)
      expect(result.value.userProfileRepository).toBeInstanceOf(SupabaseUserProfileRepository)
    }
  })

  it('personal mode propagates a Supabase client construction failure', () => {
    jest.mocked(getSupabaseClient).mockReturnValue(err(makeError('unexpected')))

    const result = createCompositionRoot('personal')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('unexpected')
  })
})
