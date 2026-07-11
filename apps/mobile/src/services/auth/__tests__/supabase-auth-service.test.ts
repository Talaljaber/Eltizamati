import { isErr, isOk } from '@eltizamati/domain'
import { SupabaseAuthService } from '../supabase-auth-service'

const fakeSession = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_in: 3600,
  expires_at: 1_700_000_000,
  token_type: 'bearer' as const,
  user: { id: 'user-1', email: 'user@example.com' },
}

function makeFakeClient(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { session: fakeSession }, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: { session: fakeSession }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      ...overrides,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double, not production code
  } as any
}

describe('SupabaseAuthService', () => {
  it('signUp maps a returned session to an AppAuthSession', async () => {
    const client = makeFakeClient()
    const service = new SupabaseAuthService(client)

    const result = await service.signUp('user@example.com', 'password123')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        user: { id: 'user-1', email: 'user@example.com' },
        expiresAt: 1_700_000_000,
      })
    }
  })

  it('signUp returns undefined session when email verification is pending', async () => {
    const client = makeFakeClient({
      signUp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    })
    const service = new SupabaseAuthService(client)

    const result = await service.signUp('user@example.com', 'password123')

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeUndefined()
    }
  })

  it('signIn maps an auth error to an AppError with code "auth"', async () => {
    const client = makeFakeClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null },
        error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      }),
    })
    const service = new SupabaseAuthService(client)

    const result = await service.signIn('user@example.com', 'wrong-password')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('auth')
      expect(result.error.safeMetadata).toEqual({ authErrorCode: 'invalid_credentials' })
    }
  })

  it('signOut returns ok(undefined) on success', async () => {
    const client = makeFakeClient()
    const service = new SupabaseAuthService(client)

    const result = await service.signOut()

    expect(isOk(result)).toBe(true)
  })

  it('currentSession returns the mapped session when one exists', async () => {
    const client = makeFakeClient()
    const service = new SupabaseAuthService(client)

    const result = await service.currentSession()

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value?.user.id).toBe('user-1')
    }
  })

  it('onAuthStateChange forwards mapped sessions and returns an unsubscribe function', () => {
    const client = makeFakeClient()
    const service = new SupabaseAuthService(client)
    const callback = jest.fn()

    const unsubscribe = service.onAuthStateChange(callback)
    unsubscribe()

    expect(client.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(typeof unsubscribe).toBe('function')
  })
})
