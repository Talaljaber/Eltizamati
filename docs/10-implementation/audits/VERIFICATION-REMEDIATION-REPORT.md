# Verification & Remediation Report — 2026-07-13

Single consolidated record of this session's work: re-verifying `COMPLETION-REPORT-VERIFICATION-AUDIT.md`
against the actual repository, fixing what was in scope, and continuing Phase 7. Read this first; the
other two files in this folder are the supporting detail:

- `COMPLETION-REPORT-VERIFICATION-AUDIT.md` — the original independent audit (§1–19), with a short §20
  addendum pointing back here.
- `VERIFICATION-TASKS.md` — the working checklist, item-by-item, with a one-line note per item.

## 1. Starting point

- Branch `phase6-finance-engine`, HEAD `6ad618d` (`feat(mobile): implement Phase 7 loan journey screens
and navigation`), plus pre-existing uncommitted Phase-7 formatting edits.
- The independent audit had found: `pnpm run check` not reproducibly green, several completion reports'
  own exit criteria unmet, and Phase 7 (merged mid-audit) with no completion report and real gaps.

## 2. What was confirmed true (no action needed beyond confirming)

| Finding                                                           | Status                                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| F-02 — no reachable "reset demo data" control                     | Confirmed. `ImportService.resetDemo()` existed with zero UI callers.                                                         |
| F-04 — `insights: []` passed into `deriveObligationStatus`        | Confirmed in both `obligation/[id].tsx` and `(tabs)/obligations.tsx`.                                                        |
| F-07 — cyclic workspace dependency `demo-data` ⇄ `finance-engine` | Confirmed (pnpm prints the warning on every install).                                                                        |
| F-12 — untracked `package-lock.json`                              | Confirmed: npm artifact, never committed, content didn't even match the current workspace.                                   |
| TV-104/203/301-305/601 unsigned                                   | Confirmed `source: 'finance-team'`, `reviewedBy: null` for all six — correctly still pending, not a doc error.               |
| F-08 — scenario test avoids exact TV-304 values                   | Confirmed, and correct as-is: TV-30x is still unsigned, so a structural test (not a numeric assertion) is the honest choice. |

## 3. What was overturned by actually running the gates

The audit's own environment (Docker down, install flaking) meant several of its "Not Executed —
verification remains open" classifications were genuinely true _for that session_, but not because the
work is missing — because the gate hadn't run clean yet. This time it did:

- **`pnpm run check` is genuinely green**, reproduced 3× from a clean `pnpm install --frozen-lockfile`:
  format, lint, typecheck, depcruise (389 modules / 1156 deps, 0 violations), `test:packages`,
  `test:app`. The real blocker was a `finance-engine` vitest defect (below), not a phantom.
- **Live Supabase verification, for real**: Docker + the local stack were actually reachable this
  session (containers resumed from a prior run) — `supabase db reset` (12/12 migrations clean),
  `supabase test db` (68/68 pgTAP), `pnpm run test:integration` (9/9), and a generated-Supabase-types
  diff-clean check (byte-identical after formatting) all ran and passed.
- The integration suite includes a **new composition-root-level personal-mode test**
  (`composition-root-personal-mode.integration.test.ts`) proving
  sign-up → consent → write → read → sign-out → RLS-denies-access → sign-in → data-restores, through the
  real `createCompositionRoot('personal')` path — not a bypass. This closes part of the audit's F-05
  ("no mounted E1 proof") at the service/repository layer. It does **not** prove a rendered
  auth-screen → tabs UI click-through — that's still open.

## 4. Real defects found and fixed this session

### 4.1 `finance-engine` vitest RPC-timeout flake (blocking `pnpm run check`)

All 118 property-based/formula tests passed, but the process still exited 1: a `[vitest-worker]:
Timeout calling "onTaskUpdate"` error. Root cause: `fc.assert` runs its `numRuns` iterations in one
uninterrupted synchronous block; the two slowest property tests (INV-1/2/6, INV-5) ran 58–64s straight,
exceeding birpc's 60s default heartbeat window between the worker and the main process, even though
every assertion passed.

**Fix:** added `packages/finance-engine/src/test-support/assert-property-chunked.ts` — runs the same
`numRuns: 1000` in chunks of 100, yielding to the event loop between chunks (`setImmediate`), same fixed
seed per chunk. No formula or expected-value change; purely a test-runner fix. Verified clean on 3
consecutive full runs.

### 4.2 Demo mode wasn't actually network-independent

`composition-root.ts` correctly never calls `getSupabaseClient()` when `dataMode === 'demo'`. But
`AuthServiceProvider` (mounted unconditionally, wrapping the whole app) eagerly constructed the real
Supabase client in a `useMemo` on mount, regardless of mode. And `useActiveUser()` — consumed by Home,
Obligations, loan-detail, insights, scenario, schedule, and rate-impact, i.e. every screen in the demo
spine — unconditionally called `useAuthService()` on every render.

Constructing a `SupabaseClient` also constructs a `GoTrueClient`, whose constructor **auto-runs session
recovery** (reads SecureStore, and if a session is near/past expiry, fires a real network token-refresh
call) — unless `skipAutoInitialize` is passed, which this app doesn't. Net effect: any device that had
ever used personal mode, then switched to demo mode, would silently attempt network access from the
very first demo screen it rendered — undermining the airplane-mode demo guarantee that Phase 5/7 depend
on.

**Fix:**

- `AuthServiceProvider` (`apps/mobile/src/features/auth/hooks/use-auth-service.tsx`) now constructs the
  real client lazily, cached in a `useRef`, on first actual `getServices()` invocation.
- Added `useAuthServiceLazy()`, returning a getter instead of an already-resolved `Result`. Calling the
  hook is now free in any mode; only invoking the getter constructs the client.
- `useActiveUser()` (`apps/mobile/src/features/auth/hooks/use-active-user.ts`) now uses the lazy variant
  and only invokes the getter inside its `mode === 'personal'` branch.
- `useAuthService()`/`useConsentRepository()` (used only by the three auth screens, which legitimately
  need the service eagerly) keep their original eager contract — unchanged behavior there.

### 4.3 Phase 5's demo-reset path had no UI

`ImportService.resetDemo()` (FR-SET-005) was fully implemented and tested at the service level but had
zero callers anywhere in the app — a judge/tester had no way to reset demo state without reinstalling.

**Fix:** added a "Reset demo data" control to `app/settings/index.tsx` — only rendered when the active
repositories are the demo family (`typeof repos.reset === 'function'`), confirmation alert before
wiping, query-cache invalidation after reset (several demo queries use `staleTime: Infinity`, which only
holds without a reset button), EN+AR copy, 2 new RNTL tests (`app/settings/__tests__/index.test.tsx`).

### 4.4 Insight wiring

`app/obligation/[id].tsx` and `app/(tabs)/obligations.tsx` both passed `insights: []` (with a `// TODO:
integrate real insights` comment on the former) into `deriveObligationStatus`, meaning the
insight-driven parts of the status-derivation precedence chain could never fire.

**Fix:** added `apps/mobile/src/features/home/api/use-insights-by-obligation.ts` (fetches the user's
insights once, groups by `obligationId` — `InsightRepository.list()` is user-wide, not per-obligation)
and wired it into the obligations list; wired the existing `useInsightsViewModel(obligationId)` into the
detail screen. Both now pass real insights.

### 4.5 Untracked `package-lock.json`

An npm lockfile in this pnpm-only repo, never committed, and its content (`"react": "^19.2.7"` at root)
didn't even match the current root `package.json` (devDependencies only, no `react`) — a stale artifact
from an accidental `npm install`, not intentional.

**Fix:** removed the file; added `package-lock.json` and `yarn.lock` to `.gitignore` to prevent
recurrence.

### 4.6 Phase 7 continuation — scenario screen

The scenario screen (`app/obligation/[id]/scenario.tsx`) had no input control at all — `extraMonthly`
was a hardcoded `useState(50)` with no way for the user to change it, no debounce, no Current-vs-Scenario
comparison, and no perf measurement, despite the phase file requiring all four.

**Fix:**

- `use-scenario-simulator.ts`: added a debounced draft/committed input pair (300ms,
  `SCENARIO_INPUT_DEBOUNCE_MS`) and `performance.now()` timing around the engine call.
- Screen: added a real numeric `TextInput`, a Current-vs-Scenario side-by-side comparison (payoff period
  - residual at maturity — both already computed by `extraPaymentScenario` as
    `basePayoffPeriod`/`scenarioPayoffPeriod`/`baseResidualAtMaturity`/`scenarioResidualAtMaturity`, just
    previously undisplayed), and a perf readout (NFR-PERF-002, "measure and record").

### 4.7 Phase 7 continuation — rate-impact screen

The rate-impact screen only showed a bare yes/no "detected residual risk" — it never called the
`residualDetection` formula (BR-CALC-012/013), which exists specifically to distinguish _why_ a residual
exists (contractual balloon vs. a detected rate-increase-driven residual) and was completely unused.

**Fix:** `use-rate-impact-view-model.ts` now runs `residualDetection` as a second calculation once a
residual is detected, deriving `rateIncreasedWithUnchangedInstallment` evidence from the obligation's own
rate-period history (comparing earliest vs. latest `annualRate`, valid because the MVP always projects
under the `unchanged` installment policy). `contractualBalloon` evidence is intentionally always absent
— `ConventionalLoanDetails` has no balloon field in this MVP, so it is never fabricated. The screen now
shows the residual amount, a deterministic/estimated confidence label, cause-language copy (EN+AR), and
an `ExplainSheet` deep link into the `residualDetection` calculation run.

## 5. Documentation updated

- `docs/10-implementation/STATUS.md` — 2026-07-13 addendum with the findings above; corrected
  "Active phase" (was stale: said Phase 4 active, Phase 7 may begin, Phases 1–6 verified complete) to
  Phase 7 in-progress-not-closeable; corrected "Current task" and "Next phase readiness" accordingly.
  The historical Phase 1/2/3/5/6 completion-report narrative further down was **not** rewritten — those
  need their own re-verification pass, not assumed correct or incorrect here.
- `docs/10-implementation/audits/COMPLETION-REPORT-VERIFICATION-AUDIT.md` — §20 addendum summarizing
  what was confirmed, overturned, and fixed.
- `docs/10-implementation/audits/VERIFICATION-TASKS.md` — every checklist item marked with what was
  actually found.

## 6. Files changed this session (working tree only — nothing committed)

```
apps/mobile/app/(tabs)/index.tsx                                        (pre-existing formatting)
apps/mobile/app/(tabs)/obligations.tsx                                  insight wiring
apps/mobile/app/insights.tsx                                            (pre-existing formatting)
apps/mobile/app/obligation/[id].tsx                                     insight wiring
apps/mobile/app/obligation/[id]/bank-questions.tsx                      (pre-existing formatting)
apps/mobile/app/obligation/[id]/rate-history.tsx                        (pre-existing formatting)
apps/mobile/app/obligation/[id]/rate-impact.tsx                         residualDetection UI
apps/mobile/app/obligation/[id]/scenario.tsx                            input/comparison/perf UI
apps/mobile/app/obligation/[id]/schedule.tsx                            (pre-existing formatting)
apps/mobile/app/settings/index.tsx                                      reset-demo control
apps/mobile/app/settings/__tests__/index.test.tsx                       NEW — reset-demo tests
apps/mobile/src/core/design-system/index.ts                             (pre-existing formatting)
apps/mobile/src/core/design-system/primitives/{InsightBanner,ProgressBar,Sheet,TimelineItem}.tsx
                                                                         (pre-existing formatting)
apps/mobile/src/features/auth/hooks/use-active-user.ts                  lazy auth-service fix
apps/mobile/src/features/auth/hooks/use-auth-service.tsx                lazy provider + useAuthServiceLazy
apps/mobile/src/features/bank-questions/hooks/use-bank-questions-view-model.ts  (pre-existing formatting)
apps/mobile/src/features/explain/components/ExplainSheet.tsx            (pre-existing formatting)
apps/mobile/src/features/home/api/use-insights-by-obligation.ts         NEW — insight grouping hook
apps/mobile/src/features/home/hooks/__tests__/use-home-aggregates.test.tsx  mock updated for lazy hook
apps/mobile/src/features/loan-detail/hooks/use-loan-detail-view-model.ts (pre-existing formatting)
apps/mobile/src/features/rate-history/hooks/use-rate-history-view-model.ts (pre-existing formatting)
apps/mobile/src/features/rate-impact/hooks/use-rate-impact-view-model.ts residualDetection wiring
apps/mobile/src/features/scenario/__tests__/use-scenario-simulator.test.tsx  mock updated for lazy hook
apps/mobile/src/features/scenario/hooks/use-scenario-simulator.ts       debounce + perf
apps/mobile/src/i18n/translations/{en,ar}.json                          new copy (settings/scenario/rateImpact)
apps/mobile/src/services/calculation-snapshot.ts                        (pre-existing formatting)
packages/finance-engine/src/properties/*.property.test.ts (5 files)     chunked-assert fix
packages/finance-engine/src/test-support/assert-property-chunked.ts     NEW — chunking helper
.gitignore                                                              package-lock.json/yarn.lock
docs/10-implementation/STATUS.md                                        addendum + corrections
docs/10-implementation/audits/COMPLETION-REPORT-VERIFICATION-AUDIT.md   pre-existing (untracked); §20 added
docs/10-implementation/audits/VERIFICATION-TASKS.md                     NEW — working checklist
docs/10-implementation/audits/VERIFICATION-REMEDIATION-REPORT.md        NEW — this file
package-lock.json                                                       REMOVED (untracked artifact)
```

Files marked "(pre-existing formatting)" had only prettier-driven whitespace/quote-style diffs already
present in the working tree before this session started — not authored by this pass.

## 7. Explicitly out of reach this session

- Exact-head GitHub Actions CI — no network/GitHub access in this environment.
- Finance-team sign-off on TV-104/203/301-305/601 — needs a human financial reviewer.
- Physical-device/EAS build and native-Arabic-speaker review.
- A fully RNTL-mounted personal-mode auth-screen → tabs click-through (the composition-root integration
  test proves the service/repository layer; it does not render navigation).

## 8. Verdict

| Phase | Verdict                                                                                                                                                                                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–3   | Implementation exists; this session's repo-wide gate is genuinely green. Their own historical completion-report claims (CI runs, device/RTL evidence, coverage counts) were **not** independently re-verified this pass — no change to their status beyond what §2–3 above cover. |
| 4     | Closed per its own completion report; not reopened. The `useActiveUser` fix (§4.2) touches auth-service plumbing this phase built, but was a bug found and fixed, not a scope reopening.                                                                                          |
| 5     | The one concrete, previously-flagged gap (no reset UI) is now closed.                                                                                                                                                                                                             |
| 6     | The one concrete, previously-flagged gap (vitest flake blocking `pnpm run check`) is now closed. Finance vectors remain correctly unsigned.                                                                                                                                       |
| 7     | **Still open. Cannot close.** No completion report exists. Real progress made (insights, scenario, rate-impact), but TV-30x sign-off and the mandatory AR/EN airplane-mode walkthrough recording are outstanding per the phase file's own exit criteria.                          |
| 8     | **May not begin.** Phase 7 must close first.                                                                                                                                                                                                                                      |

**Nothing in this session was committed, merged, or pushed.** HEAD remains `6ad618d`; all changes above
are uncommitted working-tree edits, left for you to review and commit at your discretion.
