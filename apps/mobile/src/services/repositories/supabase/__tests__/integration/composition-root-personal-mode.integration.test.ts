/**
 * Real wiring-path integration test — proves `createCompositionRoot('personal')`
 * (apps/mobile/src/services/composition-root.ts) actually works end to end
 * against a live local Supabase stack, unlike
 * `personal-mode.integration.test.ts`'s suite (which constructs the seven
 * Supabase repository classes directly, bypassing the composition root and
 * `providers.tsx` entirely — Phase 6 finding). Requires
 * `pnpm run supabase:start` (Docker) first; run via `pnpm run test:integration`.
 * Never part of `pnpm test`/`pnpm check` — see jest.config.js.
 *
 * Env-var alignment: `getSupabaseClient()` (core/supabase/client.ts) reads
 * `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` from
 * `process.env` exactly once, at module scope (`loadSupabaseEnv`'s default
 * parameter captures it at import time) — unlike the sibling
 * `personal-mode.integration.test.ts`, which never goes through env.ts at
 * all (it constructs its own `SupabaseClient` directly with hardcoded local
 * URL/anon-key constants). Because of that module-scope capture, this file
 * sets `process.env.EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` to Supabase's
 * well-known fixed local-dev values *before* `composition-root.ts` (and
 * transitively `client.ts`/`env.ts`) is ever required — done via a runtime
 * `require()` inside `beforeAll` rather than a static top-level `import`,
 * since static imports are hoisted above any top-level `process.env`
 * assignment and would capture `undefined` instead.
 *
 * `expo-secure-store` (client.ts's real session-storage adapter) has no
 * usable native implementation under plain Jest/Node, so
 * `core/supabase/secure-store-adapter` is swapped for an in-memory
 * implementation here — the same accommodation
 * `personal-mode.integration.test.ts` makes with its own
 * `makeInMemoryStorage()`, just applied to the real adapter module instead
 * of a bespoke test client.
 */
import {
  brandId,
  isOk,
  isErr,
  userEntered,
  type Obligation,
  type ConsentRecord,
} from '@eltizamati/domain'
import type { createPersonalRepositoryRegistry as CreatePersonalRepositoryRegistry } from '../../../../composition-root'
import type { getSupabaseClient as GetSupabaseClient } from '../../../../../core/supabase/client'
import type { SupabaseAuthService as SupabaseAuthServiceType } from '../../../../auth/supabase-auth-service'

// Supabase's well-known fixed local-dev anon key (supabase/config.toml default) —
// not a secret, identical for every `supabase start` on this machine.
const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

jest.mock('../../../../../core/supabase/secure-store-adapter', () => {
  const store = new Map<string, string>()
  return {
    secureStoreAdapter: {
      getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
      setItem: (key: string, value: string) => {
        store.set(key, value)
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        store.delete(key)
        return Promise.resolve()
      },
    },
  }
})

describe('createCompositionRoot(personal) — real wiring path (live local Supabase)', () => {
  let createPersonalRepositoryRegistry: typeof CreatePersonalRepositoryRegistry
  let getSupabaseClient: typeof GetSupabaseClient
  let SupabaseAuthService: typeof SupabaseAuthServiceType
  const email = `phase6-wiring-${Date.now()}-${Math.random().toString(36).slice(2)}@eltizamati.test`
  const password = 'correct-horse-battery-staple'
  let userId: string
  let obligationId: string

  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = LOCAL_URL
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = LOCAL_ANON_KEY
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be required after process.env is set (see file-header comment); a static import would be hoisted above the assignment above.
    ;({ createPersonalRepositoryRegistry } = require('../../../../composition-root'))
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be required after process.env is set.
    ;({ getSupabaseClient } = require('../../../../../core/supabase/client'))
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be required after process.env is set.
    ;({ SupabaseAuthService } = require('../../../../auth/supabase-auth-service'))
  })

  function createProductionPersonalServices() {
    const clientResult = getSupabaseClient()
    if (!clientResult.ok) return clientResult
    return {
      ok: true as const,
      value: {
        authService: new SupabaseAuthService(clientResult.value),
        repositories: createPersonalRepositoryRegistry(clientResult.value),
      },
    }
  }

  afterAll(async () => {
    if (obligationId === undefined) return
    const root = createProductionPersonalServices()
    // eslint-disable-next-line no-restricted-syntax -- test-teardown fail-fast, not application error handling.
    if (!root.ok) throw new Error('composition root failed during cleanup')
    // Re-sign-in first since the suite deliberately signs the user out.
    await root.value.authService?.signIn(email, password)
    await root.value.repositories?.obligationRepository.delete(brandId(obligationId))
  }, 15_000)

  it('sign-up -> consent -> write -> read -> sign-out -> sign-in -> read (session/data restore)', async () => {
    const root = createProductionPersonalServices()
    expect(isOk(root)).toBe(true)
    if (!root.ok) return

    const { authService, repositories } = root.value
    expect(authService).toBeDefined()
    expect(repositories).toBeDefined()
    if (authService === undefined || repositories === undefined) return

    // ── Sign-up (local dev has enable_confirmations = false, so a session
    // comes back immediately — no verification step to wait out). ──
    const signUpResult = await authService.signUp(email, password)
    expect(isOk(signUpResult)).toBe(true)
    if (!isOk(signUpResult)) return
    expect(signUpResult.value).toBeDefined()
    if (signUpResult.value === undefined) return
    userId = signUpResult.value.user.id
    const brandedUserId = brandId<'user'>(userId)

    // ── Consent, through the composition root's own repository instance. ──
    const now = new Date().toISOString()
    const consent: ConsentRecord = {
      id: brandId<'consentRecord'>(crypto.randomUUID()),
      userId: brandedUserId,
      docType: 'privacy-policy',
      version: 'v1',
      locale: 'en',
      acknowledgedAt: now,
    }
    expect(isOk(await repositories.consentRepository.acknowledge(consent))).toBe(true)
    const consentStatus = await repositories.consentRepository.status(brandedUserId)
    expect(isOk(consentStatus)).toBe(true)
    if (isOk(consentStatus)) {
      expect(consentStatus.value.some((c) => c.version === 'v1')).toBe(true)
    }

    // ── Write an obligation, through the composition root's own repository
    // instance (not a directly-constructed SupabaseObligationRepository). ──
    const oblId = brandId<'obligation'>(crypto.randomUUID())
    obligationId = oblId
    const obligation: Obligation = {
      id: oblId,
      userId: brandedUserId,
      kind: 'genericFacility',
      nickname: 'Composition-root wiring test',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: '2026-01-01' as Obligation['openedDate'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
      updatedAt: now,
    }
    expect(isOk(await repositories.obligationRepository.save(obligation))).toBe(true)

    const readBack = await repositories.obligationRepository.get(oblId)
    expect(isOk(readBack)).toBe(true)
    if (isOk(readBack)) expect(readBack.value.nickname).toBe('Composition-root wiring test')

    // ── Sign out, then prove personal mode is honestly unavailable without
    // a session (RLS denies the anon-role client). ──
    expect(isOk(await authService.signOut())).toBe(true)
    const whileSignedOut = await repositories.obligationRepository.get(oblId)
    expect(isErr(whileSignedOut)).toBe(true)

    // ── Sign back in and prove the session restores access to the same
    // user's own data through the same repository instances. ──
    const signInResult = await authService.signIn(email, password)
    expect(isOk(signInResult)).toBe(true)

    const afterSignIn = await repositories.obligationRepository.get(oblId)
    expect(isOk(afterSignIn)).toBe(true)
    if (isOk(afterSignIn)) {
      expect(afterSignIn.value.nickname).toBe('Composition-root wiring test')
      expect(afterSignIn.value.userId).toBe(brandedUserId)
    }
  }, 30_000)
})
