import { err, isErr, isOk, makeError, ok } from '@eltizamati/domain'
import type { createClient as CreateClient } from '@supabase/supabase-js'
import type { loadSupabaseEnv as LoadSupabaseEnv } from '../../config/env'
import type { getSupabaseClient as GetSupabaseClient } from '../client'

const mockStartAutoRefresh = jest.fn().mockResolvedValue(undefined)
const mockStopAutoRefresh = jest.fn().mockResolvedValue(undefined)
let disposeCurrentLifecycle: (() => void) | undefined

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    mockClient: true,
    auth: { startAutoRefresh: mockStartAutoRefresh, stopAutoRefresh: mockStopAutoRefresh },
  })),
  processLock: jest.fn(),
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
  disposeSupabaseAuthLifecycle: () => void
  createClient: jest.MockedFunction<typeof CreateClient>
  loadSupabaseEnv: jest.MockedFunction<typeof LoadSupabaseEnv>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance per test needs CJS require, not a static import
  const clientModule = require('../client') as {
    getSupabaseClient: typeof GetSupabaseClient
    disposeSupabaseAuthLifecycle: () => void
  }
  disposeCurrentLifecycle = clientModule.disposeSupabaseAuthLifecycle
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
    disposeSupabaseAuthLifecycle: clientModule.disposeSupabaseAuthLifecycle,
    createClient: supabaseJsModule.createClient,
    loadSupabaseEnv: envModule.loadSupabaseEnv,
  }
}

describe('getSupabaseClient', () => {
  afterEach(() => {
    disposeCurrentLifecycle?.()
    disposeCurrentLifecycle = undefined
    jest.restoreAllMocks()
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
          persistSession: false,
          autoRefreshToken: false,
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

  it('handles a rejected detached auth lifecycle transition', async () => {
    const { getSupabaseClient, disposeSupabaseAuthLifecycle, loadSupabaseEnv } = requireFresh()
    loadSupabaseEnv.mockReturnValue(ok({ url: 'http://127.0.0.1:54321', anonKey: 'test-anon-key' }))
    getSupabaseClient()
    mockStopAutoRefresh.mockRejectedValueOnce(makeError('unexpected'))

    disposeSupabaseAuthLifecycle()
    await Promise.resolve()

    expect(mockStopAutoRefresh).toHaveBeenCalled()
  })
})
