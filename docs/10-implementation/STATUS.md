# STATUS — Live Implementation Source of Truth

> Read this first, then the active phase file. Update this file at every session end and every phase state change. Pre-plan history: [status-m0-session-log.md](status-m0-session-log.md) (the mid-M0 session log) and [CURRENT_STATE.md](CURRENT_STATE.md) (independent audit, 2026-07-11). Master plan: [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

**Date updated:** 2026-07-11

## Active phase

**Phase 1 — Stabilize and checkpoint the current foundation** → [PHASE-01-stabilize-foundation.md](phases/PHASE-01-stabilize-foundation.md)
**Phase status:** In Progress (entered mid-flight: substantial Phase-1 work already exists **uncommitted** from the pre-plan M0 session — it counts toward Phase 1 only after verification + commit; Phase 1 is NOT complete)

## Repository position

- **Branch:** `main` · **Commit:** `2147685` (= `origin/main`; no unpushed commits)
- **Working tree:** NOT clean — staged deletions (generated-artifact untracking), unstaged modifications (nav fix, domain status-enum fix, tooling fixes, `.gitignore` rewrite, 2026-07-11 documentation reorganization), untracked paths (3 tab screens + settings route, placeholder assets, design-system + formatting modules, new planning docs). Full pre-reorg inventory: [CURRENT_STATE.md §2](CURRENT_STATE.md).
- **⚠ Highest current risk:** everything above exists only on this machine. First action of the next session: review + commit (Phase 1, task 1 — user approval required).

## Completed phases

None. Phases 2–9: Planned. (Old M0 was never completed; it maps onto Phase 1 minus the SQLite items removed by ADR-0017 — see IMPLEMENTATION_PLAN §1.)

## Completed deliverables so far (verified 2026-07-11, uncommitted)

- 3-tab navigation matching the approved IA (Home/Obligations/Learn; settings as non-tab route)
- Domain: spec-exact `ObligationStatus`, `LoanPurpose`, `Sourced<T>` on loan fields, `DomainInvariantError`, guarded `Money.of()`
- Design-system primitives `Screen/Text/Button/Card/Amount` + tokens + `format-money` (implementation-complete, **untested**)
- Tooling: eslint `projectService`, root tsconfig `apps` exclusion, fixed `test:app` script, rewritten `.gitignore`
- Passing: `pnpm run lint` · `pnpm run typecheck` · `pnpm run depcruise` · `pnpm run test:packages` (31/31)
- Documentation reorganization (this change): ADR-0017, IMPLEMENTATION_PLAN, 9 phase files, STATUS/roadmap docs, supersession banners

## Failing checks (must be green to close Phase 1)

| Check | State | Cause |
|---|---|---|
| `pnpm run format:check` | ❌ 101 files | Likely CRLF checkout vs Prettier `endOfLine: lf` — needs `.gitattributes`/line-ending policy |
| `pnpm run test:app` | ❌ "No tests found" | Zero mobile test files exist (harness configured, `__tests__/` dirs empty) |
| `pnpm run check` | ❌ | Fails at the first step above |
| `npx expo-doctor` | ❌ silent exit | Node v23.8.0 on dev machine; Expo SDK 52 expects LTS (18/20) |
| CI | — absent | `.github/workflows/` does not exist |

## Current task

Phase 1, task 1: review + commit the existing working tree (user approval required), then line-ending policy → `format:check` green.

## Blockers

None technical. Process: commits/pushes require explicit user approval; Node LTS switch needs the user (machine-level change).

## Pending decisions (owner: user / finance team)

- RES-003 (PDPL/data-residency) — gates real personal data in Phase 4 (synthetic/test accounts until cleared).
- TV-30x / TV-104 / TV-203 / TV-601 expected values — finance-team sign-off; gates Phase 7 exit (analytical families gate Phase 6).
- Supabase project provisioning (account/org/region) — needed at Phase 3 start; agents must not create cloud projects unilaterally.
- Node LTS install on the dev machine — needed for expo-doctor/EAS reliability (Phase 1).

## Exact next task

Per [PHASE-01](phases/PHASE-01-stabilize-foundation.md) work breakdown: (1) review & commit existing work → (2) line-ending policy (`.gitattributes`) + `format:check` green → (3) RNTL tests for the 5 primitives + `format-money` → (4) `pnpm check` green end-to-end from a clean shell → (5) nav loose ends (`+not-found` i18n, settings header entry, persisted language preference) → (6) `.github/workflows/ci.yml` → (7) README quickstart with verified commands → completion report `completions/PHASE-1-COMPLETION.md`.

## Next phase readiness

**Phase 2 ready to begin: No** — blocked on Phase 1 exit criteria (green `pnpm check` from clean shell, committed tree, CI green on a PR, completion report filed).
