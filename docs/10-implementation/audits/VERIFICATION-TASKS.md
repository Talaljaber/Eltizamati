# Completion-Report Verification — Task List

Working list for verifying `COMPLETION-REPORT-VERIFICATION-AUDIT.md` against actual repo state and
closing real gaps before Phase 8 can start. Generated 2026-07-12, before any fixes were applied.
Check items off as they're verified/fixed; leave a one-line note on what was actually found.

## 0. Ground truth / environment

- [x] Confirm current HEAD, branch, and working-tree diff — `phase6-finance-engine` @ `6ad618d` + uncommitted Phase-7 follow-up formatting edits (pre-existing, not audit-authored)
- [x] `pnpm install --frozen-lockfile` — passes cleanly (~5s). Cyclic workspace-dependency warning (demo-data ↔ finance-engine) confirmed real (see §1/F-07).
- [x] `pnpm run check` — now genuinely exits 0 end-to-end (format, lint, typecheck, depcruise 389 modules/1156 deps, test:packages, test:app). It was failing before this session's fix: `finance-engine`'s vitest run threw a worker-teardown RPC timeout (birpc 60s heartbeat starved by long synchronous property-test blocks) even though all 118 assertions passed — fixed by chunking the seven `fc.assert` property tests through a new `assertPropertyChunked` helper (same `numRuns: 1000`, same fixed seed, just yields every 100 runs). Verified clean on 3 consecutive runs.
- [ ] Decide fate of untracked root `package-lock.json` (repo is pnpm-only — npm lockfile shouldn't exist) — F-12, not yet resolved

## 1. Re-verify audit's specific code claims

- [x] F-04 — confirmed present (`obligation/[id].tsx:73`, `(tabs)/obligations.tsx:133`, both `insights: []`) — **fixed**: added `useInsightsByObligation` (list-and-group hook) and wired `useInsightsViewModel` into the detail screen; both now pass real insights into `deriveObligationStatus`.
- [x] Providers/composition root — confirmed `AppProviders`/`composition-root.ts` correctly gate Supabase construction on `dataMode`. **But** found a deeper, un-flagged real bug in the same area: `useActiveUser()` (used by every core demo screen — Home, Obligations, loan-detail, insights, scenario, schedule, rate-impact) unconditionally called `useAuthService()`, which eagerly constructs a real `SupabaseClient`/`GoTrueClient` regardless of `dataMode`. `GoTrueClient`'s constructor auto-runs session recovery, which issues a real network refresh call if a session is persisted in SecureStore — so a device that was ever in personal mode would silently attempt network access from every demo-mode screen. **Fixed**: `AuthServiceProvider` now constructs lazily (ref-cached getter); added `useAuthServiceLazy()` for `useActiveUser` so calling the hook is free and only invoking the getter (gated on `mode === 'personal'`) constructs the client.
- [x] Root vs composition-root separate `QueryClient` — not a live bug in practice (composition-root's own `queryClient` field is unused by `providers.tsx`, which keeps its own top-level instance); left as-is, out of scope for this pass.
- [x] F-07 — cyclic workspace dependency confirmed real (`pnpm install` prints the warning every run: `packages/demo-data` ↔ `packages/finance-engine`). Root cause: `finance-engine`'s `demo-seed-vectors.test.ts` devDependency on `demo-data` for fixtures, while `demo-data`'s builders depend on `finance-engine` for real evaluation logic (Phase 7 commit `379824a`). Not fixed — untangling it means either moving the shared fixtures to a third package or duplicating them, a real (if small) design decision, not a one-line fix; left documented for a deliberate follow-up rather than rushed.
- [x] F-08 — confirmed still true: `use-scenario-simulator.test.tsx` structurally checks the scenario resolves without asserting exact TV-304 numbers. Correct as-is per this session's explicit instruction (TV-30x stays pending, no invented expected values) — not a defect, a correct honesty boundary.
- [x] F-02 — confirmed: Settings screen had only a language toggle, `ImportService.resetDemo()` (FR-SET-005) existed but had zero callers anywhere in the app. **Fixed**: added a "Reset demo data" control to Settings (only rendered when `repositories.reset` exists, i.e. demo family), confirmation alert, cache invalidation after reset, EN+AR copy, 2 new RNTL tests.
- [x] F-03/Finance sign-off — reconfirmed this session: TV-104/203/301-305/601 remain `PENDING-FINANCE`/`reviewedBy: null`. Not touched (correct — no finance authority to sign these off in this session).
- [ ] Settings account section (sign-out/delete-account UI) — not re-checked this pass; Phase 4 report already correctly scoped this to Phase 8.
- [ ] STATUS.md / phase-file status-column drift — not yet corrected (see §4).

## 2. Real fixes applied this session

- [x] Fixed `finance-engine` vitest RPC-timeout flake (test-infra only, no formula/value changes) — `pnpm run check` is now genuinely green.
- [x] Wired real insights into `obligation/[id].tsx` and `(tabs)/obligations.tsx` (new `use-insights-by-obligation.ts`).
- [x] Fixed demo-mode Supabase network leak via `useActiveUser`/`AuthServiceProvider` laziness.
- [x] Added the Phase 5 demo-reset control to Settings (UI + i18n + tests).
- [x] Scenario screen (Phase 7): added a real debounced extra-payment input, Current-vs-Scenario side-by-side comparison (payoff period + residual at maturity, both already computed by `extraPaymentScenario` but previously undisplayed), and perf measurement (`performance.now()` around the engine call, displayed, NFR-PERF-002).
- [x] Rate-impact screen (Phase 7): wired the previously-unused `residualDetection` formula (BR-CALC-012/013 cause language: contractual-balloon vs rate-increase-driven, confidence) instead of a bare positive/negative heuristic — `contractualBalloon` evidence stays honestly absent since `ConventionalLoanDetails` has no such field in this MVP (never fabricated).
- [ ] `package-lock.json` — not yet resolved.

## 3. Explicitly out of reach this session (record, don't fake)

- GitHub Actions exact-head CI green — needs GitHub network/account access (not available here).
- Finance-team sign-off on TV-104/203/301-305/601 — needs a human financial reviewer.
- Device/EAS/Arabic-native review — needs a physical device / native speaker.
- ~~Supabase live round-trip~~ — turned out to be reachable this session: Docker + the local Supabase stack were actually available (containers resumed from a prior session), so `supabase db reset` (12/12 migrations), `supabase test db` (68/68 pgTAP), the mobile `test:integration` suite (9/9, including a composition-root-level personal-mode wiring test), and a generated-types diff-clean check were all run for real, not assumed.

## 4. Documentation corrections

- [x] Added a dated §20 addendum to `COMPLETION-REPORT-VERIFICATION-AUDIT.md` with real command output and what was overturned/confirmed/fixed.
- [x] Added a 2026-07-13 addendum to `STATUS.md`; corrected "Active phase"/"Next phase readiness"/"Current task" to Phase 7 in-progress-not-closeable (was stale: said "Phase 4 active" and "Phase 7 may begin, Phases 1-6 verified complete"). Did **not** rewrite the historical Phase 1/2/3/5/6 completion-claim bullets — those need their own re-verification pass, not assumed correct or incorrect here.
- [x] Phase 7 is not marked complete anywhere; no completion report was created.
- [x] Final verdict: **No**, Phase 8 may not begin. Phase 7 must close first (TV-30x sign-off + AR/EN airplane-mode walkthrough recording + completion report).

## 5. Final deliverable

- [x] Delivered to the user in this session's final message.
