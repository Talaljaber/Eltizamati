import { isErr, isOk } from '@eltizamati/domain'
import { SupabaseAuthService } from '../supabase-auth-service'

const fakeSession = {
  access_token: 'not-logged',
  refresh_token: 'not-logged',
  expires_in: 3600,
  expires_at: 1_700_000_000,
  token_type: 'bearer' as const,
  user: { id: 'user-1', email: 'user@example.com' },
}

function makeFakeClient(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    auth: {
      signUp: jest
        .fn()
        .mockResolvedValue({ data: { user: fakeSession.user, session: null }, error: null }),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ data: { user: fakeSession.user, session: fakeSession }, error: null }),
      verifyOtp: jest
        .fn()
        .mockResolvedValue({ data: { user: fakeSession.user, session: fakeSession }, error: null }),
      resend: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: fakeSession }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      ...overrides,
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: { deleted: true }, error: null }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- focused provider double
  } as any
}

describe('SupabaseAuthService password signup with first-time email OTP', () => {
  it('normalizes email and creates a password account without inventing a session', async () => {
    const client = makeFakeClient()
    const result = await new SupabaseAuthService(client).signUp(
      ' User@Example.COM ',
      'long-password',
    )
    expect(isOk(result)).toBe(true)
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'long-password',
    })
  })

  it('rejects short passwords before calling Supabase', async () => {
    const client = makeFakeClient()
    const result = await new SupabaseAuthService(client).signUp('user@example.com', 'short')
    expect(isErr(result)).toBe(true)
    expect(client.auth.signUp).not.toHaveBeenCalled()
  })

  it('rejects hosted configuration that returns a signup session before email verification', async () => {
    const client = makeFakeClient({
      signUp: jest.fn().mockResolvedValue({ data: { session: fakeSession }, error: null }),
    })
    const result = await new SupabaseAuthService(client).signUp('user@example.com', 'long-password')
    expect(isErr(result)).toBe(true)
    if (isErr(result))
      expect(result.error.safeMetadata).toEqual({ reason: 'email_confirmation_disabled' })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('signs in verified returning users with password and maps the returned session', async () => {
    const client = makeFakeClient()
    const result = await new SupabaseAuthService(client).signIn('User@example.com', 'long-password')
    expect(result).toEqual({
      ok: true,
      value: { user: { id: 'user-1', email: 'user@example.com' }, expiresAt: 1_700_000_000 },
    })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'long-password',
    })
  })

  it('keeps invalid credentials and unverified email distinguishable without provider messages', async () => {
    for (const code of ['invalid_credentials', 'email_not_confirmed']) {
      const client = makeFakeClient({
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: null },
          error: { code, status: 400, message: 'private' },
        }),
      })
      const result = await new SupabaseAuthService(client).signIn('user@example.com', 'password')
      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error.safeMetadata?.reason).toBe(code)
      if (isErr(result)) expect(JSON.stringify(result.error.safeMetadata)).not.toContain('private')
    }
  })

  it('verifies the eight-digit signup email code and requires a session', async () => {
    const client = makeFakeClient()
    const result = await new SupabaseAuthService(client).verifySignupOtp(
      'User@example.com',
      '12345678',
    )
    expect(isOk(result)).toBe(true)
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '12345678',
      type: 'email',
    })
  })

  it('rejects a nominal verification response without a session', async () => {
    const client = makeFakeClient({
      verifyOtp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    })
    const result = await new SupabaseAuthService(client).verifySignupOtp(
      'user@example.com',
      '12345678',
    )
    expect(isErr(result)).toBe(true)
  })

  it('resends only a signup confirmation code', async () => {
    const client = makeFakeClient()
    expect(isOk(await new SupabaseAuthService(client).resendSignupOtp('User@example.com'))).toBe(
      true,
    )
    expect(client.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'user@example.com' })
  })

  it.each([
    ['otp_expired', 'expired'],
    ['invalid_otp', 'invalid'],
  ])('maps %s safely', async (code, otpFailure) => {
    const client = makeFakeClient({
      verifyOtp: jest.fn().mockResolvedValue({
        data: { session: null },
        error: { code, status: 403, message: 'private' },
      }),
    })
    const result = await new SupabaseAuthService(client).verifySignupOtp(
      'user@example.com',
      '12345678',
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result))
      expect(result.error.safeMetadata).toEqual({ authErrorCode: code, otpFailure })
  })

  it('maps rate limits and connectivity distinctly', async () => {
    const limited = makeFakeClient({
      resend: jest.fn().mockResolvedValue({
        error: { code: 'over_email_send_rate_limit', status: 429, message: 'limited' },
      }),
    })
    const offline = makeFakeClient({
      signInWithPassword: jest
        .fn()
        .mockResolvedValue({ error: { code: undefined, message: 'offline' } }),
    })
    const limitedResult = await new SupabaseAuthService(limited).resendSignupOtp('user@example.com')
    const offlineResult = await new SupabaseAuthService(offline).signIn(
      'user@example.com',
      'password',
    )
    if (isErr(limitedResult)) expect(limitedResult.error.code).toBe('rateLimited')
    if (isErr(offlineResult)) expect(offlineResult.error.code).toBe('connectivity')
  })

  it('keeps session restore, events, sign-out, and deletion intact', async () => {
    const client = makeFakeClient()
    const service = new SupabaseAuthService(client)
    expect(isOk(await service.currentSession())).toBe(true)
    service.onAuthStateChange(jest.fn())()
    expect(isOk(await service.signOut())).toBe(true)
    expect(isOk(await service.deleteAccount())).toBe(true)
  })
})
