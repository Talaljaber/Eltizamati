# STATUS — Live Implementation Source of Truth

> Read this first, then the active phase file. Update this file at every session end and every phase state change. Pre-plan history: [status-m0-session-log.md](status-m0-session-log.md) (the mid-M0 session log) and [CURRENT_STATE.md](CURRENT_STATE.md) (independent audit, 2026-07-11). Master plan: [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

## 2026-07-13 addendum — Phase 8 implementation complete

All 8 core (non-cuttable) Phase 8 items are built, tested, and committed — see
[PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md) for the full breakdown: Murabaha/card
detail + card-utilization insight, manual entry (add/edit/archive/delete obligation, log
payment/rate), Settings completion (acknowledgments, account, about), Data Status, Legal doc +
Learn/glossary, and the user-defined threshold insight + reminder-day setting.

The owner subsequently restored all four initially cuttable items. Mock connect, card payoff
simulation, recurring local reminders, and duplicate-payment warnings are now implemented and
covered by tests. The mobile gate passes with 40 suites / 203 tests, plus TypeScript, ESLint, and
formatting. Physical-device notification and bilingual offline walkthrough evidence moves to Phase 9.

The prior whole-repository gate remains recorded below. This restoration pass independently verified
the affected mobile scope. **Phase 8 implementation is complete; Phase 9 owns device-level validation.**

## 2026-07-13 addendum — owner decision: defer Phase 7's remaining blockers to Phase 10

The product owner decided to **postpone Phase 7's remaining exit-criteria items to
[PHASE-10-ios-parity-push-and-saved-scenarios.md](phases/PHASE-10-ios-parity-push-and-saved-scenarios.md)**
(see its "Carried over from Phase 7" section) rather than block Phase 8 on them indefinitely:

1. **TV-104 / TV-601 finance sign-off** — exact reference numbers requested from the finance contact
   (amortization installment/total-cost for the 20,000 JOD/7.5%/84mo vector; card-payoff months/total-charges
   for the 2,350 JOD/24% APR vector). Question set sent; awaiting reply. **Still deferred.**
2. ~~Rate-history cumulative extra-interest annotation~~ — **done, 2026-07-13**, same day it was
   deferred. Owner clarified the actual ask: not a JOD-total comparison against a baseline rate (which
   would have needed a new finance-engine formula), but a %-change indicator. Implemented as a pure
   UI-layer percentage: `SCR-RATE-HIST` shows %-change in the rate itself vs. the previous period;
   `SCR-OBL-SCHEDULE` shows %-change in the interest portion of each installment vs. the previous
   period. No new formula, no finance sign-off needed — both derive from figures already shown
   elsewhere. Removed from the Phase 10 carry-over list.
3. **AR/EN airplane-mode walkthrough recording** — owner performs informal manual walkthroughs
   regularly; a formal recorded walkthrough (for judge-facing evidence) is deferred, not required to
   trust the app's own correctness. **Still deferred.**

Phase 7's code (screens, formulas, provenance wiring) is otherwise implemented and verified working —
the 2 remaining items above need input from the owner or an external finance contact, not further
engineering effort in isolation. **Phase 8 may proceed now.**

## 2026-07-13 addendum — independent verification pass + Phase 7 continuation

An independent audit (`docs/10-implementation/audits/COMPLETION-REPORT-VERIFICATION-AUDIT.md`) found
this file's blanket "Phases 1–6 independently verified complete, Phase 7 may begin" claim did not hold
up: `pnpm run check` was not reproducibly green, several completion reports' criteria were unmet, and
Phase 7 (merged mid-audit) had no completion report and real gaps. This session re-verified the audit's
claims against the current repo (branch `phase6-finance-engine`, this session started at `6ad618d` plus
in-flight Phase-7 formatting edits) and fixed what was in scope. Real, reproduced findings — not
re-asserted claims:

- **`pnpm run check` is now genuinely green**, reproduced 3× from a clean `pnpm install --frozen-lockfile`
  (format, lint, typecheck, depcruise — 389 modules/1156 deps, 0 violations — `test:packages`,
  `test:app`). It was failing before this pass on a real defect: `finance-engine`'s vitest run threw a
  worker-teardown RPC timeout (birpc's 60s heartbeat starved by long synchronous property-test blocks)
  even though all 118 assertions passed. Fixed via a chunked-assert test helper (same `numRuns: 1000`,
  same fixed seed — no formula or expected-value change).
- **Live Supabase verification, reproduced for real** (Docker + the local stack were actually available
  this session): `supabase db reset` (12/12 migrations clean), `supabase test db` (68/68 pgTAP),
  `pnpm run test:integration` (9/9, including a new composition-root-level personal-mode wiring test
  proving sign-up→consent→write→read→sign-out→RLS-deny→sign-in→restore through the real
  `createCompositionRoot('personal')` path, not a bypass), and a generated-Supabase-types diff-clean
  check.
- **Fixed a real demo-mode network-independence gap**: `useActiveUser()` (used by every core demo
  screen — Home, Obligations, loan-detail, insights, scenario, schedule, rate-impact) unconditionally
  called `useAuthService()`, which eagerly constructs a real `SupabaseClient`/`GoTrueClient` regardless
  of `dataMode`. `GoTrueClient`'s constructor auto-runs session recovery, which issues a real network
  refresh call if a session is ever persisted in SecureStore — so a device that had ever used personal
  mode would silently touch the network from demo-mode screens too, undermining the airplane-mode demo
  guarantee. Fixed: `AuthServiceProvider` now constructs lazily; `useActiveUser` uses a new
  `useAuthServiceLazy()` that only constructs the client inside the `mode === 'personal'` branch.
- **Fixed Phase 5's missing demo-reset path** (F-02 in the audit): `ImportService.resetDemo()`
  (FR-SET-005) existed with zero UI callers anywhere in the app. Added a reachable "Reset demo data"
  control to Settings (demo-family-only, confirmation alert, cache invalidation, EN+AR, tests).
- **Fixed the Phase 7 insight-wiring gap** (F-04): `obligation/[id].tsx` and `(tabs)/obligations.tsx`
  both passed `insights: []` into `deriveObligationStatus` instead of the user's real insights.
- **Continued Phase 7** on the rate-impact and scenario screens: scenario now has a real debounced
  extra-payment input, a Current-vs-Scenario side-by-side comparison (payoff period + residual at
  maturity — both already computed by `extraPaymentScenario` but previously undisplayed), and perf
  measurement (NFR-PERF-002). Rate-impact now wires the previously-unused `residualDetection` formula
  (BR-CALC-012/013 cause language + confidence) instead of a bare positive/negative heuristic.
- **Confirmed, untouched**: TV-104/203/301-305/601 remain `source: 'finance-team'`, `reviewedBy: null` —
  correctly still pending finance sign-off, not invented. The `demo-data` ⇄ `finance-engine` cyclic
  workspace dependency is confirmed real (Phase 7's `379824a` made `demo-data` depend on
  `finance-engine` for real evaluation logic, while `finance-engine`'s own tests devDepend on
  `demo-data` fixtures) — documented, not untangled this pass; it's a real (if small) design decision,
  not a one-line fix.
- Removed an untracked, stray `package-lock.json` (npm artifact in this pnpm-only repo, never committed,
  content didn't even match the current workspace) and added `package-lock.json`/`yarn.lock` to
  `.gitignore` to prevent recurrence.

**What this does NOT establish:** exact-head GitHub Actions CI (still no network/gh access here);
finance-team sign-off on the vectors above (needs a human reviewer); a physical-device/EAS/native-Arabic
walkthrough; a full RNTL-mounted click-through of the personal-mode auth→tabs UI (the composition-root
integration test above proves the service/repository layer, not rendered navigation). **Phase 7 is not
closed** — no completion report exists, and TV-30x sign-off + the mandatory AR/EN airplane-mode
walkthrough recording are still outstanding per the phase file's exit criteria. Full detail, command-by-
command: `docs/10-implementation/audits/VERIFICATION-TASKS.md`.

**Date updated:** 2026-07-13 (Phase 8 core scope complete — see the addendum at the top of this file and [PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md))

## Active phase

**Phase 8 — Remaining MVP Flows** → [PHASE-08-remaining-mvp-flows.md](phases/PHASE-08-remaining-mvp-flows.md)
**Phase status:** All 8 core items and all 4 restored cuttable items are built and tested — see
[PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md). Phase 7 remains
formally open on its own 2 deferred items (TV-104/TV-601 finance sign-off, AR/EN walkthrough
recording), both pushed to Phase 10 per the prior 2026-07-13 owner decision below; unaffected by
Phase 8's closure. See [PHASE-04-auth-repositories-and-integration.md](phases/PHASE-04-auth-repositories-and-integration.md) /
[PHASE-4-COMPLETION.md](completions/PHASE-4-COMPLETION.md) for the (closed) Phase 4 record.

**Phase 9 may begin** for device-level and cross-cutting validation.

## Repository position

- **Branch:** `phase6-finance-engine` @ `6ad618d` plus in-flight Phase-7 formatting/implementation edits (this session's own fixes are uncommitted — see the final summary for the full file list; nothing was pushed or merged).
- **Docker/local Supabase running** for this session (`supabase status` healthy) — the live-Supabase integration suite (`pnpm run test:integration`) was run for real, not skipped.
- **⚠ GitHub Actions infrastructure issue — not re-checked this session** (no network/gh access in this environment). Last confirmed present at `eada339` (Phase 3 close) via the GitHub Actions REST API: both CI jobs completed in ~1 second with **zero steps executed** and an immediate `failure` conclusion — a pre-existing, account-level condition (also present on `fdf25a0` and `964c8ea`, predating Phase 2/3 entirely), not a code defect. Requires the repository owner to check GitHub Settings → Actions and Billing for this repo/account. Not treated as blocking phase closure, consistent with Phase 3's precedent.

## Completed phases

- **Phase 1 (Stabilize the foundation):** Complete (2026-07-11) — [PHASE-1-COMPLETION.md](completions/PHASE-1-COMPLETION.md).
- **Phase 2 (Complete Domain Contracts and Supabase Schema Design):** Complete (2026-07-12) — [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md).

- **Phase 3 (Supabase Schema and Security Foundation):** Complete (2026-07-11) — [PHASE-3-COMPLETION.md](completions/PHASE-3-COMPLETION.md). Two real bugs found and fixed during first genuine Docker-based verification: a typo'd index column (`created_at` → `calculated_at` in `calculation_runs`) and missing table-level `GRANT`s for `authenticated` (RLS policies alone don't grant table access — every table was unreachable until fixed). All local gates now genuinely green; GitHub Actions remains blocked by the unresolved external infrastructure issue (not a code defect).

- **Phase 5 (Demo Data & Foundation UX):** Complete (2026-07-12) — [PHASE-5-COMPLETION.md](completions/PHASE-5-COMPLETION.md).
- **Phase 6 (Core Financial Engine & Mobile Integration):** Merged 2026-07-12, but an independent post-merge audit the same day found the merge did not actually typecheck (`pnpm run check` was never green), had a P0 defect (Money/Rate/Percentage amounts silently lost during `CalculationRun` hashing/serialization — distinct financial inputs hashed identically), and had zero tests for the Supabase `CalculationRunRepository`. All three were fixed and re-verified for real the same day (typecheck clean, 350/350 tests across domain/finance-engine/mobile, finance-engine coverage 99.89/95.43/100/99.89 against a 95/90/95/95 gate, live Supabase round-trip for both successful and refused outcomes) — see [PHASE-6-COMPLETION.md](completions/PHASE-6-COMPLETION.md) §6. This landed out of the sequence this document otherwise describes ("Phase 6: Not ready" until Phase 4 closes); Phase 4 has since closed (above), so the sequencing gap is now moot, but the out-of-order landing itself was never corrected — noted for the record.
- **Phase 4 (Authentication, Repositories, and Application Integration):** Complete (2026-07-12) — [PHASE-4-COMPLETION.md](completions/PHASE-4-COMPLETION.md). Closed the remaining gaps from the earlier backend-only pass: auth screens, onboarding wiring, offline/error UI, and per-repository contract coverage for all 6 non-user-profile repositories.
- **Phase 8 (Remaining MVP Flows):** Implementation complete (2026-07-13) — [PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md). All core and formerly cuttable items are built and mobile-tested.

Phase 7: In progress, not closeable (2 items deferred to Phase 10, not blocking). Phase 9: Planned.

**Phase 10 (iOS Device Parity, Remote Push Notifications, and Saved Scenarios):** Planned, added after this session — [PHASE-10-ios-parity-push-and-saved-scenarios.md](phases/PHASE-10-ios-parity-push-and-saved-scenarios.md). Not part of the original 9-phase MVP scope; gated on Phase 9 closing first and on an Apple Developer Program membership existing (paid, user-side prerequisite for iOS device builds outside Expo Go).

## Checks (Phase 3, verified locally with Docker, prior session — `eada339`)

| Check                                                   | State     | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker version` / `docker ps`                          | ✅ Passes | Docker Desktop 4.81.0, daemon healthy.                                                                                                                                                                                                                                 |
| `supabase start`                                        | ✅ Passes | Failed on first attempt (`created_at` typo in `calculation_runs` index) — fixed, then passed clean.                                                                                                                                                                    |
| `supabase db reset`                                     | ✅ Passes | All 11 migrations (10 table + 1 new grants migration) apply cleanly from scratch.                                                                                                                                                                                      |
| `supabase test db` (pgTAP)                              | ✅ Passes | 68/68 assertions, all 3 files. Two real fixes required: missing `GRANT`s (new migration `20260712000011_grants.sql`) and 20 pgTAP assertions using an invalid nested data-modifying CTE (rewritten as top-level `WITH`).                                               |
| `pnpm run supabase:gen-types` (run twice)               | ✅ Passes | `apps/mobile/src/core/supabase/database.types.ts` committed (667 lines); byte-identical on regeneration — diff-clean.                                                                                                                                                  |
| `pnpm run check`                                        | ✅ Passes | format, lint, typecheck, depcruise (156 modules/329 deps, 0 violations), test:packages (121/121), test:app (64/64). Required adding the generated types file to lint/format ignores and `.claude/` to `.prettierignore` (pre-existing gap, unrelated to Phase 3 code). |
| GitHub Actions (live run, `eada339`, run `29163810390`) | ❌ Fails  | Both jobs: zero steps, ~1s, immediate failure — same pre-existing account-level condition as prior sessions, confirmed still present via the REST API. External blocker, not a code defect.                                                                            |

## Checks (Phase 4 closure pass, this session — full repo)

| Check                                                           | State                     | Notes                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run format:check`                                         | ✅ Passes                 | All matched files use Prettier code style.                                                                                                                                                                                                                                                                                                            |
| `pnpm run lint` (`eslint . --max-warnings=0`)                   | ✅ Passes                 | Whole repo.                                                                                                                                                                                                                                                                                                                                           |
| `pnpm run typecheck`                                            | ✅ Passes                 | Was failing on `demo-payment-repository.test.ts` passing raw `Id`s instead of lazy factories — fixed this session.                                                                                                                                                                                                                                    |
| `pnpm run depcruise`                                            | ✅ Passes                 | 342 modules / 952 deps, 0 violations — confirms supabase-js stays confined to infrastructure (exit criterion 7).                                                                                                                                                                                                                                      |
| `pnpm --filter @eltizamati/domain test`                         | ✅ Passes                 | 119/119.                                                                                                                                                                                                                                                                                                                                              |
| `pnpm --filter @eltizamati/demo-data test`                      | ✅ Passes                 | 45/45.                                                                                                                                                                                                                                                                                                                                                |
| `pnpm run test:app` (mobile, 27 suites)                         | ✅ Passes                 | 160/160 — includes the new auth screens, ErrorState, and all 6 demo contract-suite invocations.                                                                                                                                                                                                                                                       |
| `pnpm --filter @eltizamati/finance-engine test`                 | ⚠ Flaky exit              | 118/118 tests pass; vitest throws a worker-teardown timeout after the slow property tests, causing a non-zero exit despite every assertion passing. Pre-existing (Phase 6), reproduces in isolation, no Phase 4 file touches this package. Not fixed here — flagged for Phase 6/7 owner.                                                              |
| `pnpm run test:integration` (live local Supabase, 8 tests)      | ✅ Passes                 | Full write/read round-trip across all 7 repositories, cross-user isolation, sign-out/sign-in session restore, plus new coverage: rate-period append-only, payment obligation-scoping, insight markRead, consent version-bump append, obligation archive/delete.                                                                                       |
| Account-deletion Edge Function, manual end-to-end               | ✅ Passes (prior session) | 401 on invalid token, 200 on real user, confirmed post-deletion sign-in fails.                                                                                                                                                                                                                                                                        |
| Per-repository contract suites (exit criterion 2)               | ✅ Passes                 | All 6 (consent/obligation/payment/rate-period/insight/calculation-run) exist, parameterized, exercised by Phase 5's demo repos. Not directly runnable against Supabase (RLS incompatibility, documented in [PHASE-4-COMPLETION.md](completions/PHASE-4-COMPLETION.md) §4) — Supabase-side behavioral coverage added to the integration suite instead. |
| Auth UI (SCR-AUTH-SIGNIN/SIGNUP/RESET, onboarding account step) | ✅ Built                  | `apps/mobile/app/auth/*`, wired from `onboarding/mode.tsx`; `OnboardingGuard.tsx` updated to exempt the `/auth/*` route group.                                                                                                                                                                                                                        |
| Offline/error UI components (exit criterion 6)                  | ✅ Built                  | `ErrorState` primitive consumes `toErrorUiState()`; used by all 3 auth screens; own component test.                                                                                                                                                                                                                                                   |

## Current task

Phase 8's implementation is done and mobile-verified (see the top addendum and [PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md)).
Phase 7's own 2 remaining exit-criteria items (TV-104/TV-601 finance sign-off,
AR/EN airplane-mode walkthrough recording) are **deferred to Phase 10** per the owner's prior
2026-07-13 decision — Phase 7 stays formally open, unaffected by Phase 8's closure. Phase 9 may proceed.

## Blockers

- **TV-104 / TV-601 expected values** — finance-team sign-off requested (question set sent 2026-07-13);
  deferred to Phase 10, not gating Phase 8/9.

- **GitHub Actions still executes zero steps on every run** (last confirmed at `eada339`, not re-checked this session — no network/gh access here) — needs the repository owner to check GitHub's Settings → Actions and Billing for this repo/account. Not blocking phase closure: local verification (Docker-based) is comprehensive.
- Node LTS install on the dev machine — needed for expo-doctor/EAS reliability (unrelated to Phase 3/4).

## Pending decisions (owner: user / finance team)

- **GitHub Actions infrastructure** (see above) — owner: user, needs a GitHub account/repo settings check outside this session's reach.
- RES-003 (PDPL/data-residency) — gates real personal data in personal mode (synthetic/test accounts until cleared).
- TV-104 / TV-601 expected values — finance-team sign-off requested; deferred to Phase 10 (owner
  decision 2026-07-13), no longer gating Phase 8/9.
- DOC-ISSUE items recorded in [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md) (Percentage upper bound, delinquency due-date/payment-matching heuristic, calculationIncomplete signaling mechanism) — none block Phase 3 or 4.
- The finance-engine test-runner exit-code flake (§ Checks above) — should be diagnosed before it's relied on in CI; not a Phase 4 item.

## Next phase readiness

**Phase 8: implementation complete — see [PHASE-8-COMPLETION.md](completions/PHASE-8-COMPLETION.md).**
All formerly cuttable items are now implemented. The restoration pass verified mobile formatting,
lint, typecheck, dependency-cruiser (467 modules / 1,459 dependencies, zero violations), and 203
tests across 40 suites; Phase 9 owns physical-device evidence.

**Phase 7: implementation done and verified; formally stays open on 2 deferred items (see the
2026-07-13 "owner decision" addendum below), both pushed to Phase 10.** Unaffected by Phase 8's
closure. Phase 1–3/4/6's own completion-report claims (CI, device/RTL evidence, etc.) were not
re-verified in full depth this session beyond what's noted above — see the independent audit for
the itemized gap list.
