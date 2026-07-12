# STATUS — Live Implementation Source of Truth

> Read this first, then the active phase file. Update this file at every session end and every phase state change. Pre-plan history: [status-m0-session-log.md](status-m0-session-log.md) (the mid-M0 session log) and [CURRENT_STATE.md](CURRENT_STATE.md) (independent audit, 2026-07-11). Master plan: [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

**Date updated:** 2026-07-12 (Phase 4 closure pass — backend/data layer complete and verified against live local Supabase; auth UI screens remain unbuilt, so Phase 4 is **INCOMPLETE**, not closed)

## Active phase

**Phase 4 — Authentication, Repositories, and Application Integration** → [PHASE-04-auth-repositories-and-integration.md](phases/PHASE-04-auth-repositories-and-integration.md)
**Phase status:** INCOMPLETE. Backend/data layer done and verified for real (client, env, SecureStore adapter, auth service, all 7 Supabase repositories + mappers, composition root, account-deletion Edge Function, AppError→UI-state mapping, one reference query/mutation hook) — but the three auth screens (SCR-AUTH-SIGNIN/SIGNUP/RESET), the onboarding account step wiring, and the offline/error UI _components_ (the mapping logic exists; the components that render it do not) are unbuilt. Per explicit instruction, this work is not postponed to mark the phase complete — no completion report has been filed. See [PHASE-04-auth-repositories-and-integration.md](phases/PHASE-04-auth-repositories-and-integration.md) "Moved to Phase 8" for the one piece of UI genuinely rehomed (settings account-section button, already claimed by Phase 8).

## Repository position

- **Branch:** `main`. Phase 4 foundation commits (`a007c70`..`e8dd63b`) plus this session's backend-completion commit are on top of Phase 3's `eada339`.
- **Working tree:** a concurrent session is actively building Phase 5 (demo mode/onboarding/home screens) in the same working tree — those files are untracked/unstaged and intentionally left alone by this session. Scoped to this session's own Phase 4 files: format check, lint, typecheck, and depcruise all pass clean; full `pnpm run test` (270 tests across all packages + the mobile app) passes. Whole-repo `pnpm run check`'s `format:check` step currently fails only on the concurrent session's untracked `docs/10-implementation/completions/PHASE-5-COMPLETION.md` — not this session's work, not modified here.
- **Docker now available locally** (Docker Desktop 4.81.0) — this session ran the full local Supabase stack for real and closed out every gate that was previously blocked on Docker's absence.
- **⚠ GitHub Actions infrastructure issue — still unresolved, confirmed still present at `eada339` in this session via the GitHub Actions REST API:** both CI jobs (`supabase`, `build-and-test`) on run `29163810390` completed in ~1 second with **zero steps executed** and an immediate `failure` conclusion. This is the same pre-existing, account-level condition first flagged in the prior session (also present on `fdf25a0` and `964c8ea`, predating Phase 2/3 entirely). Docker being installed locally and GitHub sign-in do not affect this — it requires the repository owner to check GitHub Settings → Actions and Billing for this repo/account. **Not a code defect; local Docker-based verification in this session is comprehensive enough that Phase 3 is being marked Complete despite this open item** (see Phase 3 completion report §6 for the full gate-by-gate evidence).

## Completed phases

- **Phase 1 (Stabilize the foundation):** Complete (2026-07-11) — [PHASE-1-COMPLETION.md](completions/PHASE-1-COMPLETION.md).
- **Phase 2 (Complete Domain Contracts and Supabase Schema Design):** Complete (2026-07-12) — [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md).

- **Phase 3 (Supabase Schema and Security Foundation):** Complete (2026-07-11) — [PHASE-3-COMPLETION.md](completions/PHASE-3-COMPLETION.md). Two real bugs found and fixed during first genuine Docker-based verification: a typo'd index column (`created_at` → `calculated_at` in `calculation_runs`) and missing table-level `GRANT`s for `authenticated` (RLS policies alone don't grant table access — every table was unreachable until fixed). All local gates now genuinely green; GitHub Actions remains blocked by the unresolved external infrastructure issue (not a code defect).

- **Phase 5 (Demo Data & Foundation UX):** Complete (2026-07-12) — [PHASE-5-COMPLETION.md](completions/PHASE-5-COMPLETION.md).
- **Phase 6 (Core Financial Engine & Mobile Integration):** Merged 2026-07-12, but an independent post-merge audit the same day found the merge did not actually typecheck (`pnpm run check` was never green), had a P0 defect (Money/Rate/Percentage amounts silently lost during `CalculationRun` hashing/serialization — distinct financial inputs hashed identically), and had zero tests for the Supabase `CalculationRunRepository`. All three were fixed and re-verified for real the same day (typecheck clean, 350/350 tests across domain/finance-engine/mobile, finance-engine coverage 99.89/95.43/100/99.89 against a 95/90/95/95 gate, live Supabase round-trip for both successful and refused outcomes) — see [PHASE-6-COMPLETION.md](completions/PHASE-6-COMPLETION.md) §6. Also note: this merge landed while **Phase 4 was still marked INCOMPLETE** below, out of the sequence this document otherwise describes ("Phase 6: Not ready" until Phase 4 closes) — that sequencing question is unresolved and is the user's call, not something corrected here.

Phases 7–9: Planned.

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

## Checks (Phase 4 closure pass, this session, scoped to this session's own files)

| Check                                                           | State        | Notes                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prettier --check` (Phase 4 files)                              | ✅ Passes    | Scoped to this session's repositories/mappers/composition-root/errors/hooks/Edge Function.                                                                                                                                                                              |
| `eslint` (Phase 4 files, then whole repo)                       | ✅ Passes    | `--max-warnings=0`, both scoped and whole-repo.                                                                                                                                                                                                                         |
| `tsc --noEmit` (whole mobile app)                               | ✅ Passes    | No errors, including the concurrent Phase 5 files present in the tree.                                                                                                                                                                                                  |
| `pnpm run depcruise`                                            | ✅ Passes    | 240 modules / 606 deps, 0 violations — confirms supabase-js stays confined to infrastructure (exit criterion 7).                                                                                                                                                        |
| `pnpm run test` (packages + mobile app)                         | ✅ Passes    | 270/270 tests (115 domain, 4 finance-engine, 45 demo-data, 106 mobile app).                                                                                                                                                                                             |
| `pnpm run test:integration` (new, against live local Supabase)  | ✅ Passes    | 3/3: full write/read round-trip across all 7 repositories, cross-user isolation, sign-out/sign-in session restore. Not part of `pnpm check` (needs Docker/Supabase running).                                                                                            |
| Account-deletion Edge Function, manual end-to-end               | ✅ Passes    | Served locally, tested with an invalid token (401) and a real signed-up user (200 `{"deleted":true}`, confirmed post-deletion sign-in fails with 400).                                                                                                                  |
| `pnpm run check` (whole repo, unscoped)                         | ❌ Fails     | Only on `format:check`, only on the concurrent Phase 5 session's untracked `docs/10-implementation/completions/PHASE-5-COMPLETION.md` — not this session's file, not touched by this session.                                                                           |
| Per-repository unit/contract test suite (exit criterion 2)      | ⚠ Partial    | Only `user-profile-repository`/`user-profile-mapper` have dedicated unit tests (Phase 4 foundation slice); the 6 new repositories/mappers are covered only by the integration suite, not by a parameterized contract suite Phase 5's demo repos could also run against. |
| Auth UI (SCR-AUTH-SIGNIN/SIGNUP/RESET, onboarding account step) | ❌ Not built | No screens exist. This is the reason Phase 4 is not being marked complete.                                                                                                                                                                                              |
| Offline/error UI components (exit criterion 6)                  | ⚠ Partial    | `toErrorUiState()` mapping logic exists and is tested; the actual retry/offline banner components that render it do not exist yet.                                                                                                                                      |

## Current task

**Close out remaining Phase 4 scope**: build SCR-AUTH-SIGNIN/SIGNUP/RESET screens, wire the onboarding account step (FR-ONB-006), and build the offline/error UI components that consume `toErrorUiState()`. Once those exist and pass their own tests, re-run the full exit-criteria check and file `PHASE-4-COMPLETION.md`.

## Blockers

- **GitHub Actions still executes zero steps on every run** (confirmed still present at `eada339`) — needs the repository owner to check GitHub's Settings → Actions and Billing for this repo/account. Not blocking Phase 4: local verification is comprehensive (Docker-based `db reset`/pgTAP/type-gen all genuinely green).
- Node LTS install on the dev machine — needed for expo-doctor/EAS reliability (unrelated to Phase 3/4).

## Pending decisions (owner: user / finance team)

- **GitHub Actions infrastructure** (see above) — owner: user, needs a GitHub account/repo settings check outside this session's reach.
- RES-003 (PDPL/data-residency) — gates real personal data in Phase 4 (synthetic/test accounts until cleared).
- TV-30x / TV-104 / TV-203 / TV-601 expected values — finance-team sign-off; gates Phase 7 exit (analytical families gate Phase 6).
- DOC-ISSUE items recorded in [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md) (Percentage upper bound, delinquency due-date/payment-matching heuristic, calculationIncomplete signaling mechanism) — none block Phase 3 or 4.

## Exact next task

1. Build SCR-AUTH-SIGNIN / SCR-AUTH-SIGNUP / SCR-AUTH-RESET screens against the already-implemented `SupabaseAuthService`, with loading/error/offline/verification-pending states per screen-inventory.md.
2. Wire the onboarding optional account step (FR-ONB-006) to those screens.
3. Build the offline/error/retry UI components that consume `toErrorUiState()` (`apps/mobile/src/core/errors/error-ui-state.ts`) — the mapping logic is done; the components are not.
4. Add EN+AR strings for all of the above.
5. Add per-repository unit/contract tests for the 6 repositories currently covered only by the integration suite (consent, ratePeriod, payment, insight, calculationRun, obligation), ideally as the parameterized contract suite Phase 5's demo repositories can also run against (exit criterion 2).
6. Re-run every Phase 4 exit criterion and file `PHASE-4-COMPLETION.md` only once all of the above pass — not before.
7. **User (separately, not blocking):** check GitHub repo/account Settings → Actions and Billing to find why every run executes zero steps.

## Next phase readiness

**Phase 6: Not ready.** Phase 4 is not complete — do not start Phase 6 until the items in "Exact next task" above are done and `PHASE-4-COMPLETION.md` is filed.
