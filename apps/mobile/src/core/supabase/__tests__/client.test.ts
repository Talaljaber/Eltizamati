import { err, isErr, isOk, makeError, ok } from '@eltizamati/domain'
import type { createClient as CreateClient } from '@supabase/supabase-js'
import type { loadSupabaseEnv as LoadSupabaseEnv } from '../../config/env'
import type { getSupabaseClient as GetSupabaseClient } from '../client'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mockClient: true })),
}))

jest.mock('../secure-store-adapter', () => ({
  secureStoreAdapter: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}))

jest.mock('../../config/env', () => ({
  loadSupabaseEnv: jest.fn(),
}))

/**
 * Every mocked dependency and the subject under test must come from the
 * same fresh `require()` after `jest.resetModules()` — a static top-level
 * `import` would bind to a module instance from before the reset, which
 * client.ts's freshly-required copy would never see (this bit both
 * `createClient` and `loadSupabaseEnv` before this helper existed).
 */
function requireFresh(): {
  getSupabaseClient: typeof GetSupabaseClient
  createClient: jest.MockedFunction<typeof CreateClient>
  loadSupabaseEnv: jest.MockedFunction<typeof LoadSupabaseEnv>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance per test needs CJS require, not a static import
  const clientModule = require('../client') as { getSupabaseClient: typeof GetSupabaseClient }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must resolve from the same fresh registry as clientModule above
  const supabaseJsModule = require('@supabase/supabase-js') as {
    createClient: jest.MockedFunction<typeof CreateClient>
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must resolve from the same fresh registry as clientModule above
  const envModule = require('../../config/env') as {
    loadSupabaseEnv: jest.MockedFunction<typeof LoadSupabaseEnv>
  }

  return {
    getSupabaseClient: clientModule.getSupabaseClient,
    createClient: supabaseJsModule.createClient,
    loadSupabaseEnv: envModule.loadSupabaseEnv,
  }
}

describe('getSupabaseClient', () => {
  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('returns the env error and does not call createClient when env is invalid', () => {
    const { getSupabaseClient, createClient, loadSupabaseEnv } = requireFresh()
    loadSupabaseEnv.mockReturnValue(err(makeError('unexpected')))

    const result = getSupabaseClient()

    expect(isErr(result)).toBe(true)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('constructs the client from validated env, using the SecureStore adapter and anon-key-only auth', () => {
    const { getSupabaseClient, createClient, loadSupabaseEnv } = requireFresh()
    loadSupabaseEnv.mockReturnValue(ok({ url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' }))

    const result = getSupabaseClient()

    expect(isOk(result)).toBe(true)
    expect(createClient).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        }),
      }),
    )
  })

  it('caches the client — a second call does not re-invoke createClient', () => {
    const { getSupabaseClient, createClient, loadSupabaseEnv } = requireFresh()
    loadSupabaseEnv.mockReturnValue(ok({ url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' }))

    getSupabaseClient()
    getSupabaseClient()

    expect(createClient).toHaveBeenCalledTimes(1)
  })
})
