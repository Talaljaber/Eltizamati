/**
 * Real integration suite against a live local Supabase stack — the
 * "temporary dev-only harness ... labeled as such" the Phase 4 Exit Demo
 * explicitly permits in place of polished auth screens. Requires
 * `pnpm run supabase:start` (Docker) first; run via `pnpm run test:integration`.
 * Never part of `pnpm test`/`pnpm check` — see jest.config.js.
 *
 * Exercises PHASE-04 exit criteria 1/2/3/5 for real: request OTP → verify →
 * write every repository → read back → cross-user isolation via the actual
 * client (not SQL) → sign-out → sign-in → session-restored read.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  brandId,
  isOk,
  isErr,
  userEntered,
  Money,
  Rate,
  type UserProfile,
  type Obligation,
  type GenericFacility,
  type Payment,
  type RatePeriod,
  type Insight,
  type ConsentRecord,
  type CalculationRun,
} from '@eltizamati/domain'
import type { Database } from '../../../../../core/supabase/database.types'
import { SupabaseUserProfileRepository } from '../../user-profile-repository'
import { SupabaseObligationRepository } from '../../obligation-repository'
import { SupabasePaymentRepository } from '../../payment-repository'
import { SupabaseRatePeriodRepository } from '../../rate-period-repository'
import { SupabaseInsightRepository } from '../../insight-repository'
import { SupabaseConsentRepository } from '../../consent-repository'
import { SupabaseCalculationRunRepository } from '../../calculation-run-repository'
import { authenticateWithLocalEmailOtp } from '../../integration/local-email-otp'

// Supabase's well-known fixed local-dev anon key (supabase/config.toml default) —
// not a secret, identical for every `supabase start` on this machine.
const LOCAL_URL = 'http://127.0.0.1:54321'
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/** Node has no SecureStore — an in-memory map is sufficient for this test's session persistence. */
function makeInMemoryStorage(): {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
} {
  const store = new Map<string, string>()
  return {
    getItem: (key) => Promise.resolve(store.get(key) ?? null),
    setItem: (key, value) => {
      store.set(key, value)
      return Promise.resolve()
    },
    removeItem: (key) => {
      store.delete(key)
      return Promise.resolve()
    },
  }
}

function makeTestClient(): SupabaseClient<Database> {
  return createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
    auth: { storage: makeInMemoryStorage(), autoRefreshToken: false, persistSession: true },
  })
}

interface SyntheticUser {
  readonly userId: string
  readonly email: string
}

async function signUpSyntheticUser(
  client: SupabaseClient<Database>,
  tag: string,
): Promise<SyntheticUser> {
  const email = `phase4-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@eltizamati.test`
  const userId = await authenticateWithLocalEmailOtp(client, email)
  return { userId, email }
}

describe('Phase 4 personal-mode integration (live local Supabase)', () => {
  let clientA: SupabaseClient<Database>
  let clientB: SupabaseClient<Database>
  let userA: SyntheticUser
  let userB: SyntheticUser
  let obligationId: string

  beforeAll(async () => {
    clientA = makeTestClient()
    clientB = makeTestClient()
    userA = await signUpSyntheticUser(clientA, 'user-a')
    userB = await signUpSyntheticUser(clientB, 'user-b')
  }, 30_000)

  afterAll(async () => {
    // Best-effort cleanup: obligation delete cascades to every child table
    // (loan_details/rate_periods/payments/calculation_runs/insights) per
    // Phase 3's ON DELETE CASCADE. Re-sign-in first since a later test
    // deliberately signs user A out.
    await authenticateWithLocalEmailOtp(clientA, userA.email)
    if (obligationId !== undefined) {
      await clientA.from('obligations').delete().eq('id', obligationId)
    }
    await clientA.from('consent_records').delete().eq('user_id', userA.userId)
    await clientA.from('profiles').delete().eq('user_id', userA.userId)
  }, 15_000)

  it('user A completes sign-up -> write -> read across every repository (exit criteria 1, 2, 5)', async () => {
    const now = new Date().toISOString()
    const userId = brandId<'user'>(userA.userId)

    // ── UserProfile ──
    const profileRepo = new SupabaseUserProfileRepository(clientA)
    const profile: UserProfile = {
      userId,
      locale: 'en',
      dataMode: 'personal',
      createdAt: now,
      updatedAt: now,
    }
    expect(isOk(await profileRepo.save(profile))).toBe(true)
    const readProfile = await profileRepo.get(userId)
    expect(isOk(readProfile)).toBe(true)
    if (isOk(readProfile)) expect(readProfile.value.locale).toBe('en')

    // ── Consent (exit criterion 5) ──
    const consentRepo = new SupabaseConsentRepository(clientA)
    const consent: ConsentRecord = {
      id: brandId<'consentRecord'>(crypto.randomUUID()),
      userId,
      docType: 'privacy-policy',
      version: 'v1',
      locale: 'en',
      acknowledgedAt: now,
    }
    expect(isOk(await consentRepo.acknowledge(consent))).toBe(true)
    const consentStatus = await consentRepo.status(userId)
    expect(isOk(consentStatus)).toBe(true)
    if (isOk(consentStatus)) {
      expect(
        consentStatus.value.some((c) => c.docType === 'privacy-policy' && c.version === 'v1'),
      ).toBe(true)
    }

    // ── Obligation (conventionalLoan) + RatePeriod ──
    const obligationRepo = new SupabaseObligationRepository(clientA)
    const ratePeriodRepo = new SupabaseRatePeriodRepository(clientA)
    const oblId = brandId<'obligation'>(crypto.randomUUID())
    obligationId = oblId

    const obligation: Obligation = {
      id: oblId,
      userId,
      kind: 'conventionalLoan',
      nickname: 'Integration Test Loan',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: '2024-01-15' as Obligation['openedDate'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
      updatedAt: now,
      loanDetails: {
        originalPrincipal: userEntered(Money.of('20000', 'JOD'), now),
        installment: userEntered(Money.of('307', 'JOD'), now),
        rateType: 'fixed',
        ratePeriods: [],
        termMonths: userEntered(84, now),
        startDate: '2024-01-15' as Obligation['openedDate'],
        maturityDate: '2031-01-15' as Obligation['openedDate'],
        paymentFrequency: 'monthly',
      },
    }
    expect(isOk(await obligationRepo.save(obligation))).toBe(true)

    const period: RatePeriod = {
      id: brandId<'ratePeriod'>(crypto.randomUUID()),
      obligationId: oblId,
      annualRate: Rate.fromPercent('7.5'),
      effectiveFrom: '2024-01-15' as RatePeriod['effectiveFrom'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
    }
    expect(isOk(await ratePeriodRepo.append(period))).toBe(true)

    const readObligation = await obligationRepo.get(oblId)
    expect(isOk(readObligation)).toBe(true)
    if (isOk(readObligation) && readObligation.value.kind === 'conventionalLoan') {
      expect(readObligation.value.loanDetails.originalPrincipal.value.toStorageString()).toBe(
        '20000',
      )
      expect(readObligation.value.nickname).toBe('Integration Test Loan')
    }

    const history = await ratePeriodRepo.historyFor(oblId)
    expect(isOk(history)).toBe(true)
    if (isOk(history)) expect(history.value).toHaveLength(1)

    // ── Payment ──
    const paymentRepo = new SupabasePaymentRepository(clientA)
    const payment: Payment = {
      id: brandId<'payment'>(crypto.randomUUID()),
      obligationId: oblId,
      userId,
      date: '2024-02-15' as Payment['date'],
      amount: Money.of('307', 'JOD'),
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
    }
    expect(isOk(await paymentRepo.log(payment))).toBe(true)
    const payments = await paymentRepo.listFor(oblId)
    expect(isOk(payments)).toBe(true)
    if (isOk(payments)) expect(payments.value).toHaveLength(1)

    // ── CalculationRun (successful outcome, obligation-scoped) ──
    // formulaId is the plain registry key ('amortization'), matching what
    // CalculationService/FORMULA_REGISTRY actually persist — not the
    // dotted 'amortization.v1' doc-comment notation used elsewhere.
    const runRepo = new SupabaseCalculationRunRepository(clientA)
    const run: CalculationRun = {
      id: brandId<'calculationRun'>(crypto.randomUUID()),
      userId,
      obligationId: oblId,
      formulaId: 'amortization',
      formulaVersion: 1,
      asOf: '2026-07-01' as CalculationRun['asOf'],
      inputsSnapshot: { principal: '20000', annualRate: '0.075' },
      inputsHash: 'test-hash-ok',
      outcome: { kind: 'result', confidence: 'high', resultSnapshot: { residual: '19693' } },
      assumptions: ['ASM-008: monthly payment frequency assumed'],
      calculatedAt: now,
    }
    const persisted = await runRepo.persist(run)
    expect(isOk(persisted)).toBe(true)
    const latestRun = await runRepo.latestFor(oblId, 'amortization')
    expect(isOk(latestRun)).toBe(true)
    if (isOk(latestRun)) {
      expect(latestRun.value?.id).toBe(run.id)
      expect(latestRun.value?.formulaId).toBe('amortization')
      expect(latestRun.value?.inputsHash).toBe('test-hash-ok')
      expect(latestRun.value?.inputsSnapshot).toEqual(run.inputsSnapshot)
      expect(latestRun.value?.outcome).toEqual(run.outcome)
      expect(latestRun.value?.assumptions).toEqual(run.assumptions)
    }

    // ── CalculationRun (refused outcome, aggregate/unscoped) — round trip
    // must preserve missingFields and the honestly-partial snapshot. ──
    const refusedRun: CalculationRun = {
      id: brandId<'calculationRun'>(crypto.randomUUID()),
      userId,
      obligationId: undefined,
      formulaId: 'aggregates',
      formulaVersion: 1,
      asOf: '2026-07-01' as CalculationRun['asOf'],
      inputsSnapshot: { balances: [] },
      inputsHash: 'test-hash-refused',
      outcome: {
        kind: 'refused',
        missingFields: ['balances'],
        partialSnapshot: { includesEstimates: false },
      },
      assumptions: [],
      calculatedAt: now,
    }
    const persistedRefused = await runRepo.persist(refusedRun)
    expect(isOk(persistedRefused)).toBe(true)
    const latestRefused = await runRepo.latestFor(undefined, 'aggregates')
    expect(isOk(latestRefused)).toBe(true)
    if (isOk(latestRefused)) {
      expect(latestRefused.value?.id).toBe(refusedRun.id)
      expect(latestRefused.value?.outcome).toEqual(refusedRun.outcome)
    }

    // ── Scope isolation: an obligation-scoped lookup must never return the
    // aggregate (unscoped) run, and vice versa. ──
    const scopedLookupForAggregateFormula = await runRepo.latestFor(oblId, 'aggregates')
    expect(isOk(scopedLookupForAggregateFormula)).toBe(true)
    if (isOk(scopedLookupForAggregateFormula)) {
      expect(scopedLookupForAggregateFormula.value).toBeUndefined()
    }

    // ── Insight ──
    const insightRepo = new SupabaseInsightRepository(clientA)
    const insight: Insight = {
      id: brandId<'insight'>(crypto.randomUUID()),
      userId,
      ruleId: 'integration.test.rule',
      obligationId: oblId,
      severity: 'info',
      titleKey: 'insight.title',
      bodyKey: 'insight.body',
      triggerHash: 'trigger-1',
      createdAt: now,
    }
    expect(isOk(await insightRepo.raise(insight))).toBe(true)
    const insights = await insightRepo.list(userId)
    expect(isOk(insights)).toBe(true)
    if (isOk(insights)) expect(insights.value.some((i) => i.id === insight.id)).toBe(true)
  }, 30_000)

  // The six repository contract suites (`*.contract.ts`) fabricate a second
  // synthetic user id and write rows for it through the same `repoFactory()`
  // instance — fine for the demo repositories' unauthenticated in-memory
  // store, but not reusable here: Supabase's RLS insert policies require
  // `user_id = auth.uid()` of the actually-authenticated client, so a
  // mismatched synthetic id would simply be rejected. This suite instead
  // covers each contract's remaining (non-cross-user) behaviors for real,
  // reusing userA's already-persisted obligation from the test above.
  it('rate periods are append-only: a second period never mutates history (BR-RATE-001)', async () => {
    const ratePeriodRepo = new SupabaseRatePeriodRepository(clientA)
    const now = new Date().toISOString()
    const secondPeriod: RatePeriod = {
      id: brandId<'ratePeriod'>(crypto.randomUUID()),
      obligationId: brandId(obligationId),
      annualRate: Rate.fromPercent('9.25'),
      effectiveFrom: '2024-08-01' as RatePeriod['effectiveFrom'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
    }
    expect(isOk(await ratePeriodRepo.append(secondPeriod))).toBe(true)

    const history = await ratePeriodRepo.historyFor(brandId(obligationId))
    expect(isOk(history)).toBe(true)
    if (isOk(history)) {
      expect(history.value.length).toBeGreaterThanOrEqual(2)
      const first = history.value.find((p) => p.annualRate.equals(Rate.fromPercent('7.5')))
      expect(first).toBeDefined()
    }

    const emptyHistory = await ratePeriodRepo.historyFor(brandId(crypto.randomUUID()))
    expect(isOk(emptyHistory)).toBe(true)
    if (isOk(emptyHistory)) expect(emptyHistory.value).toHaveLength(0)
  }, 15_000)

  it('payments listFor only returns payments for the requested obligation', async () => {
    const obligationRepo = new SupabaseObligationRepository(clientA)
    const paymentRepo = new SupabasePaymentRepository(clientA)
    const userId = brandId<'user'>(userA.userId)
    const now = new Date().toISOString()

    // A second real obligation (Supabase's listFor looks up the parent
    // obligation for its currency, so an unknown id returns `notFound`
    // rather than an empty list — unlike the demo repo's in-memory map;
    // isolation must be proven with a second real obligation instead).
    const otherObligationId = brandId<'obligation'>(crypto.randomUUID())
    const otherObligation: GenericFacility = {
      id: otherObligationId,
      userId,
      kind: 'genericFacility',
      nickname: 'Payment isolation fixture',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: '2026-01-01' as GenericFacility['openedDate'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
      updatedAt: now,
    }
    expect(isOk(await obligationRepo.save(otherObligation))).toBe(true)

    const listForOther = await paymentRepo.listFor(otherObligationId)
    expect(isOk(listForOther)).toBe(true)
    if (isOk(listForOther)) expect(listForOther.value).toHaveLength(0)

    await obligationRepo.delete(otherObligationId)
  }, 15_000)

  it('insight markRead sets readAt without deleting the insight', async () => {
    const insightRepo = new SupabaseInsightRepository(clientA)
    const userId = brandId<'user'>(userA.userId)

    const before = await insightRepo.list(userId)
    expect(isOk(before)).toBe(true)
    if (!isOk(before)) return
    const target = before.value[0]
    expect(target).toBeDefined()
    if (target === undefined) return
    expect(target.readAt).toBeUndefined()

    const marked = await insightRepo.markRead(target.id)
    expect(isOk(marked)).toBe(true)

    const after = await insightRepo.list(userId)
    expect(isOk(after)).toBe(true)
    if (isOk(after)) {
      const found = after.value.find((i) => i.id === target.id)
      expect(found).toBeDefined()
      expect(found?.readAt).toBeDefined()
    }
  }, 15_000)

  it('consent re-acknowledging a version bump appends a new record rather than overwriting', async () => {
    const consentRepo = new SupabaseConsentRepository(clientA)
    const userId = brandId<'user'>(userA.userId)
    const now = new Date().toISOString()
    const consentV2: ConsentRecord = {
      id: brandId<'consentRecord'>(crypto.randomUUID()),
      userId,
      docType: 'privacy-policy',
      version: 'v2',
      locale: 'en',
      acknowledgedAt: now,
    }
    expect(isOk(await consentRepo.acknowledge(consentV2))).toBe(true)

    const status = await consentRepo.status(userId)
    expect(isOk(status)).toBe(true)
    if (isOk(status)) {
      expect(status.value.some((r) => r.version === 'v1')).toBe(true)
      expect(status.value.some((r) => r.version === 'v2')).toBe(true)
    }
  }, 15_000)

  it('obligation archive sets closedDate without deleting; delete removes the obligation', async () => {
    const obligationRepo = new SupabaseObligationRepository(clientA)
    const userId = brandId<'user'>(userA.userId)
    const now = new Date().toISOString()
    const archId = brandId<'obligation'>(crypto.randomUUID())
    const toArchive: GenericFacility = {
      id: archId,
      userId,
      kind: 'genericFacility',
      nickname: 'To archive',
      institution: { name: 'Test Bank' },
      currency: 'JOD',
      openedDate: '2026-01-01' as GenericFacility['openedDate'],
      provenance: userEntered(undefined, now).provenance,
      createdAt: now,
      updatedAt: now,
    }
    expect(isOk(await obligationRepo.save(toArchive))).toBe(true)

    const archived = await obligationRepo.archive(archId)
    expect(isOk(archived)).toBe(true)
    const stillThere = await obligationRepo.get(archId)
    expect(isOk(stillThere)).toBe(true)
    if (isOk(stillThere)) expect(stillThere.value.closedDate).toBeDefined()

    const deleted = await obligationRepo.delete(archId)
    expect(isOk(deleted)).toBe(true)
    const gone = await obligationRepo.get(archId)
    expect(isErr(gone)).toBe(true)
  }, 15_000)

  it('cross-user isolation holds through the client, not just SQL (exit criterion 3)', async () => {
    const obligationRepoB = new SupabaseObligationRepository(clientB)
    const insightRepoB = new SupabaseInsightRepository(clientB)
    const consentRepoB = new SupabaseConsentRepository(clientB)

    const crossUserGet = await obligationRepoB.get(brandId(obligationId))
    expect(isErr(crossUserGet)).toBe(true)

    const insightsB = await insightRepoB.list(brandId(userB.userId))
    expect(isOk(insightsB)).toBe(true)
    if (isOk(insightsB)) expect(insightsB.value).toHaveLength(0)

    const consentB = await consentRepoB.status(brandId(userB.userId))
    expect(isOk(consentB)).toBe(true)
    if (isOk(consentB)) expect(consentB.value).toHaveLength(0)
  }, 15_000)

  it("sign-out then sign-in restores a session that reads user A's own data (exit criterion 1)", async () => {
    const obligationRepo = new SupabaseObligationRepository(clientA)

    const { error: signOutError } = await clientA.auth.signOut()
    expect(signOutError).toBeNull()

    const { data: sessionAfterSignOut } = await clientA.auth.getSession()
    expect(sessionAfterSignOut.session).toBeNull()

    // Personal mode is honestly unavailable without a session — RLS denies
    // reads for an anon-role client, matching the "no fake offline/anon
    // access" requirement (ADR-0017 §4).
    const resultWhileSignedOut = await obligationRepo.get(brandId(obligationId))
    expect(isErr(resultWhileSignedOut)).toBe(true)

    await authenticateWithLocalEmailOtp(clientA, userA.email)

    const resultAfterSignIn = await obligationRepo.get(brandId(obligationId))
    expect(isOk(resultAfterSignIn)).toBe(true)
    if (isOk(resultAfterSignIn))
      expect(resultAfterSignIn.value.nickname).toBe('Integration Test Loan')
  }, 15_000)
})
