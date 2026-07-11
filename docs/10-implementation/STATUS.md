# STATUS — Live Implementation Source of Truth

> Read this first, then the active phase file. Update this file at every session end and every phase state change. Pre-plan history: [status-m0-session-log.md](status-m0-session-log.md) (the mid-M0 session log) and [CURRENT_STATE.md](CURRENT_STATE.md) (independent audit, 2026-07-11). Master plan: [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

**Date updated:** 2026-07-11 (Phase 3 verified for real with Docker locally available — `db reset`, pgTAP, and generated types all genuinely pass; GitHub Actions infrastructure issue remains unresolved and is now the only open item, tracked as an external blocker)

## Active phase

**Phase 4 — Authentication, Repositories, and Application Integration** → [PHASE-04-auth-repositories-and-integration.md](phases/PHASE-04-auth-repositories-and-integration.md)
**Phase status:** Not started — Phase 3 is now Complete (see below); Phase 4's first concrete step (adding `@supabase/supabase-js`, TanStack Query, SecureStore adapter) needs user approval per Phase 4's own precondition and AI_AGENT_RULES §12 before implementation begins.

## Repository position

- **Branch:** `main`, at `eada339` (matches `origin/main`).
- **Working tree:** `pnpm check` passes end-to-end (format, lint, typecheck, depcruise, all test suites) — verified genuinely, with Docker available, in this session.
- **Docker now available locally** (Docker Desktop 4.81.0) — this session ran the full local Supabase stack for real and closed out every gate that was previously blocked on Docker's absence.
- **⚠ GitHub Actions infrastructure issue — still unresolved, confirmed still present at `eada339` in this session via the GitHub Actions REST API:** both CI jobs (`supabase`, `build-and-test`) on run `29163810390` completed in ~1 second with **zero steps executed** and an immediate `failure` conclusion. This is the same pre-existing, account-level condition first flagged in the prior session (also present on `fdf25a0` and `964c8ea`, predating Phase 2/3 entirely). Docker being installed locally and GitHub sign-in do not affect this — it requires the repository owner to check GitHub Settings → Actions and Billing for this repo/account. **Not a code defect; local Docker-based verification in this session is comprehensive enough that Phase 3 is being marked Complete despite this open item** (see Phase 3 completion report §6 for the full gate-by-gate evidence).

## Completed phases

- **Phase 1 (Stabilize the foundation):** Complete (2026-07-11) — [PHASE-1-COMPLETION.md](completions/PHASE-1-COMPLETION.md).
- **Phase 2 (Complete Domain Contracts and Supabase Schema Design):** Complete (2026-07-12) — [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md).

- **Phase 3 (Supabase Schema and Security Foundation):** Complete (2026-07-11) — [PHASE-3-COMPLETION.md](completions/PHASE-3-COMPLETION.md). Two real bugs found and fixed during first genuine Docker-based verification: a typo'd index column (`created_at` → `calculated_at` in `calculation_runs`) and missing table-level `GRANT`s for `authenticated` (RLS policies alone don't grant table access — every table was unreachable until fixed). All local gates now genuinely green; GitHub Actions remains blocked by the unresolved external infrastructure issue (not a code defect).

Phases 5–9: Planned.

## Checks (verified locally with Docker, this session — `eada339`)

| Check                                                   | State     | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker version` / `docker ps`                          | ✅ Passes | Docker Desktop 4.81.0, daemon healthy.                                                                                                                                                                                                                                 |
| `supabase start`                                        | ✅ Passes | Failed on first attempt (`created_at` typo in `calculation_runs` index) — fixed, then passed clean.                                                                                                                                                                    |
| `supabase db reset`                                     | ✅ Passes | All 11 migrations (10 table + 1 new grants migration) apply cleanly from scratch.                                                                                                                                                                                      |
| `supabase test db` (pgTAP)                              | ✅ Passes | 68/68 assertions, all 3 files. Two real fixes required: missing `GRANT`s (new migration `20260712000011_grants.sql`) and 20 pgTAP assertions using an invalid nested data-modifying CTE (rewritten as top-level `WITH`).                                               |
| `pnpm run supabase:gen-types` (run twice)               | ✅ Passes | `apps/mobile/src/core/supabase/database.types.ts` committed (667 lines); byte-identical on regeneration — diff-clean.                                                                                                                                                  |
| `pnpm run check`                                        | ✅ Passes | format, lint, typecheck, depcruise (156 modules/329 deps, 0 violations), test:packages (121/121), test:app (64/64). Required adding the generated types file to lint/format ignores and `.claude/` to `.prettierignore` (pre-existing gap, unrelated to Phase 3 code). |
| GitHub Actions (live run, `eada339`, run `29163810390`) | ❌ Fails  | Both jobs: zero steps, ~1s, immediate failure — same pre-existing account-level condition as prior sessions, confirmed still present via the REST API. External blocker, not a code defect.                                                                            |

## Current task

**Begin Phase 4** (auth, repositories, TanStack Query, composition root, account deletion, offline/error states). First concrete step needs **user approval to add dependencies** (`@supabase/supabase-js`, TanStack Query, a SecureStore adapter) per Phase 4's own precondition and AI_AGENT_RULES §12 — not yet requested.

## Blockers

- **GitHub Actions still executes zero steps on every run** (confirmed still present at `eada339`) — needs the repository owner to check GitHub's Settings → Actions and Billing for this repo/account. Not blocking Phase 4: local verification is comprehensive (Docker-based `db reset`/pgTAP/type-gen all genuinely green).
- Node LTS install on the dev machine — needed for expo-doctor/EAS reliability (unrelated to Phase 3/4).

## Pending decisions (owner: user / finance team)

- **GitHub Actions infrastructure** (see above) — owner: user, needs a GitHub account/repo settings check outside this session's reach.
- **Phase 4 dependency approval** — `@supabase/supabase-js`, TanStack Query, SecureStore adapter — owner: user.
- RES-003 (PDPL/data-residency) — gates real personal data in Phase 4 (synthetic/test accounts until cleared).
- TV-30x / TV-104 / TV-203 / TV-601 expected values — finance-team sign-off; gates Phase 7 exit (analytical families gate Phase 6).
- DOC-ISSUE items recorded in [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md) (Percentage upper bound, delinquency due-date/payment-matching heuristic, calculationIncomplete signaling mechanism) — none block Phase 3 or 4.

## Exact next task

1. **User:** approve Phase 4 dependencies (`@supabase/supabase-js`, TanStack Query, SecureStore adapter) so implementation can begin.
2. **User (separately, not blocking):** check GitHub repo/account Settings → Actions and Billing to find why every run executes zero steps.
3. Begin Phase 4 implementation per [PHASE-04-auth-repositories-and-integration.md](phases/PHASE-04-auth-repositories-and-integration.md).

## Next phase readiness

**Phase 4 ready to begin: Yes** — Phase 3 is genuinely verified (real Docker-based `db reset`, pgTAP, and type generation, all green). Blocked only on user approval for Phase 4's new dependencies.
