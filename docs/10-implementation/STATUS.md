# STATUS — Live Implementation Source of Truth

> Read this first, then the active phase file. Update this file at every session end and every phase state change. Pre-plan history: [status-m0-session-log.md](status-m0-session-log.md) (the mid-M0 session log) and [CURRENT_STATE.md](CURRENT_STATE.md) (independent audit, 2026-07-11). Master plan: [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

**Date updated:** 2026-07-12 (Phase 2 complete; Phase 3 readiness pass complete)

## Active phase

**Phase 2 — Complete Domain Contracts and Supabase Schema Design** → [PHASE-02-domain-contracts-and-schema-design.md](phases/PHASE-02-domain-contracts-and-schema-design.md)
**Phase status:** Complete (2026-07-12) — [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md). Phase 3 has not started yet; a readiness pass ran first (this update) to verify Phase 2's pushed state and repair repo-wide `pnpm check`/CI before any Phase 3 work begins.

## Repository position

- **Branch:** `main`, pushed to `origin/main` at commit `fdf25a0` (`docs: record final Phase 2 commit hashes`) at the time this readiness pass began, then further readiness-pass commits on top (see §"Commits" below for the exact list — pushed once the user approves).
- **Working tree (verified from a fresh `git worktree` at `fdf25a0`, not the possibly-dirty primary workspace):** `pnpm install --frozen-lockfile` clean; `pnpm check` **passes end-to-end** after this pass's fixes (see "Checks" below) — this is a change from the state Phase 2 closed with.
- **⚠ Highest current risk:** none blocking. The repo-wide `pnpm check` failure recorded at Phase 2 close has been repaired (see below); remaining risks are the same pre-Phase-2 operational ones (Supabase project provisioning, Node LTS for expo-doctor).

## Completed phases

- **Phase 1 (Stabilize the foundation):** Complete (2026-07-11) — [PHASE-1-COMPLETION.md](completions/PHASE-1-COMPLETION.md).
- **Phase 2 (Complete Domain Contracts and Supabase Schema Design):** Complete (2026-07-12) — [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md).

Phases 4–9: Planned. **Phase 3 ready to begin** (see below) — not yet started.

## Checks (verified from a clean `git worktree` at `fdf25a0`, then re-verified after readiness-pass fixes)

| Check                                                 | State                    | Notes                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                      | ✅ Passes                | Lockfile up to date.                                                                                                                                                                                                                                                       |
| `pnpm run format:check`                               | ✅ Passes (repo-wide)    | Fixed: 8 pre-existing unformatted files (`AI_AGENT_RULES.md`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/jest.config.js`, two mobile test files, two `docs/99-sources/*` files) — none touched by Phase 2, none behavioral.         |
| `pnpm run lint`                                       | ✅ Passes (repo-wide)    | Fixed: 17 pre-existing `no-empty-function`/`strict-boolean-expressions`/`consistent-type-imports` errors in mobile test files and `apps/mobile/src/i18n/index.ts` — all behavior-preserving (`() => {}` → `() => undefined`, explicit null check, split type-only import). |
| `pnpm run typecheck`                                  | ✅ Passes (repo-wide)    | Fixed: `apps/mobile/src/i18n/index.ts` used `compatibilityJSON: 'v3'`, a literal the installed i18next version's types no longer accept; removed (translation files use no plural keys, so v3-compat had no effect).                                                       |
| `pnpm run depcruise`                                  | ✅ Passes                | 0 violations, 149 modules / 329 dependencies cruised.                                                                                                                                                                                                                      |
| `pnpm --filter @eltizamati/domain test -- --coverage` | ✅ Passes                | 115/115 tests (was 109 — 6 new SHA-256 vector tests added in the readiness pass), 93%+ stmt coverage maintained.                                                                                                                                                           |
| `pnpm run test:packages`                              | ✅ Passes                | 121/121 (domain 115, finance-engine 4, demo-data 2).                                                                                                                                                                                                                       |
| `pnpm run test:app`                                   | ✅ Passes (64/64)        |                                                                                                                                                                                                                                                                            |
| `pnpm run check`                                      | ✅ **Passes end-to-end** | Verified from a clean worktree at `fdf25a0` plus the readiness-pass commits on top.                                                                                                                                                                                        |
| `pnpm run ci:check`                                   | ✅ Passes                | **This script did not exist before this pass** — `.github/workflows/ci.yml` called `pnpm run ci:check`, which was undefined in `package.json`, so every CI run to date would have failed at that step regardless of code health. Added as an alias for `check`.            |
| `npx expo-doctor`                                     | ❌ silent exit           | Node v23.8.0 on dev machine; Expo SDK 52 expects LTS (18/20) — pre-existing, unrelated to any phase's code.                                                                                                                                                                |
| GitHub Actions (actual run)                           | **Not yet confirmed**    | `ci:check` now resolves and `pnpm run ci:check` passes locally with the exact commands CI invokes — but no push has been made from this session yet, so no live Actions run has been observed. Confirming this is the next step, pending the user's push approval.         |

## Current task

Readiness-pass documentation and evidence are complete. Next: push the readiness-pass commits (pending user approval — see "Blockers"), confirm a live GitHub Actions run goes green, then begin Phase 3 — Supabase Schema and Security Foundation: initialize `supabase/` locally, write migrations matching `docs/05-data-api/database-schema.md` (including the new §1.11 composite ownership foreign keys), enable RLS in the same migration that creates each table, add pgTAP cross-user + ownership-constraint tests, generate and commit Supabase types, and wire CI migration/pgTAP/type-drift checks.

## Blockers

- **Push approval needed:** the readiness-pass commits (repo-wide `pnpm check`/`ci:check` repair, `CalculationRun.inputsHash` SHA-256 upgrade, composite ownership FK schema design) exist locally on a worktree branch and are not yet pushed. No push happens without explicit user approval, per this repo's operating rules. Until pushed, "confirm an actual GitHub Actions run can pass" (Phase 3 readiness item) remains unconfirmed by live CI, only by local `pnpm run ci:check`.
- Supabase project provisioning (account/org/region) — needed at **Phase 3** start (for a hosted project; local development can proceed entirely via `supabase start` + Docker without one, per Phase 3's scope). The user must provide the API URL and anon key only if/when a hosted project is wired up.
- Node LTS install on the dev machine — needed for expo-doctor/EAS reliability (relevant to later app-facing phases, not Phase 3).

## Pending decisions (owner: user / finance team)

- RES-003 (PDPL/data-residency) — gates real personal data in Phase 4 (synthetic/test accounts until cleared).
- TV-30x / TV-104 / TV-203 / TV-601 expected values — finance-team sign-off; gates Phase 7 exit (analytical families gate Phase 6).
- DOC-ISSUE items recorded in [PHASE-2-COMPLETION.md](completions/PHASE-2-COMPLETION.md) (Percentage upper bound, delinquency due-date/payment-matching heuristic, calculationIncomplete signaling mechanism) — none block Phase 3, all are documented smallest-safe-decisions available for revisiting.

## Exact next task

Begin Phase 3 (Supabase Schema and Security Foundation) once the readiness-pass commits are pushed and a live CI run is confirmed green: `supabase init`, migrations matching `docs/05-data-api/database-schema.md` §1 table-for-table (including §1.11's composite ownership FKs), RLS + policies in the same migration as each table, pgTAP cross-user and ownership-constraint tests, generated Supabase types committed, CI additions for migration/pgTAP/type-drift verification. Local Supabase via Docker/CLI only — no cloud project created or linked without explicit user approval.

## Next phase readiness

**Phase 3 ready to begin: Yes**, pending push approval for the readiness-pass commits above. Domain contracts and schema/RLS design (including the new composite-ownership addendum) are frozen; repo-wide `pnpm check` is verified green from a clean checkout; the CI script gap that would have silently failed every run is fixed. The only remaining gate before Phase 3 code lands is confirming a live GitHub Actions run passes, which requires a push.
