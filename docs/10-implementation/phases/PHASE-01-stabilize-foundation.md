# Phase 1 — Stabilize and Checkpoint the Current Foundation

## Status

**In Progress** (entered mid-flight — see [STATUS.md](../STATUS.md); substantial uncommitted pre-plan work exists and counts only after verification + commit)

## Objective

The repository reaches a trustworthy, committed, CI-guarded baseline: `pnpm check` green end-to-end from a clean shell, all existing local work committed, navigation/i18n loose ends closed — **zero new business features**.

## Why This Phase Exists

Every later phase builds on the uncommitted working tree; losing it reverts the repo to a broken scaffold (invented status enum, wrong tab shell, corrupted `.gitignore`). No phase can be verified while the combined gate (`pnpm check`) fails and no CI exists. This is the "inspect, verify, correct, test, checkpoint, commit" phase — explicitly **not** a rebuild.

## Preconditions

- Working tree as inventoried in [CURRENT_STATE.md](../CURRENT_STATE.md) (verify with `git status` before starting; reconcile any drift first).
- User available to approve the checkpoint commit(s) and (ideally) a Node LTS install.

## In Scope

1. **Review + commit existing local work** (staged deletions, unstaged modifications, untracked files, and the 2026-07-11 documentation reorganization) in small, coherent commits. Review `git status` for secrets/unintended files before each commit. **No push without explicit user approval.**
2. **Line-ending policy:** add `.gitattributes` (LF for source/docs), reconcile git checkout behavior with Prettier `endOfLine: lf` → `pnpm run format:check` exits 0 without content rewrites beyond line endings.
3. **Mobile component tests:** RNTL tests (with accessibility assertions, per design-system.md DS-4) for `Screen`, `Text`, `Button`, `Card`, `Amount`; unit tests for `format-money` → `pnpm run test:app` exits 0.
4. **Green gate:** `pnpm run check` passes end-to-end from a clean shell at repo root.
5. **Environment:** switch dev machine to a supported Node LTS (user action); then run `npx expo-doctor` and record results; verify Metro can bundle (`expo start` + bundle request, then stop Metro — never leave it running).
6. **Navigation loose ends:** `+not-found.tsx` rewritten on `notFound.*` i18n keys + design-system primitives; `settings` registered in the root `Stack` and reachable via a header icon (IA: settings is a header entry, never a tab).
7. **Persisted language preference:** store the user's explicit language choice in key-value storage (AsyncStorage or MMKV per ADR-0006 surviving clauses; justify the dependency choice in the PR) and honor it on cold start (FR-ONB-001). RTL flip keeps the existing reload pattern.
8. **CI:** `.github/workflows/ci.yml` per `ci-cd-environments.md §1` (install → format/lint/typecheck/depcruise → tests; gitleaks + audit warn-level).
9. **README quickstart:** replace the placeholder with the actually-verified commands only.

## Out of Scope

Any Supabase work · any domain entities beyond what exists · seed builders · finance formulas · any new screens · SQLite/Drizzle (removed from MVP — ADR-0017) · Sentry (Phase 9) · dependency upgrades beyond what the tasks above require.

## Architecture Decisions Applied

ADR-0001/0003/0005/0010 (stack, monorepo, router, i18n) · ADR-0017 (no SQLite anywhere in this phase) · ADR-0006 surviving clauses (key-value for preferences) · AI_AGENT_RULES (all).

## Required Implementation Work

- **Repo/tooling:** `.gitattributes`; possibly normalize existing checkouts (`git add --renormalize` — with user awareness); CI workflow; README.
- **Mobile UI:** `+not-found` rewrite; settings header entry in `(tabs)/_layout.tsx` or root layout; language-persistence wiring in `src/i18n/index.ts`.
- **Testing:** `apps/mobile/src/core/design-system/__tests__/*.test.tsx` (5 files), `apps/mobile/src/core/formatting/__tests__/format-money.test.ts`.
- **Documentation:** README quickstart; STATUS.md updates; completion report.

## Expected Files and Packages

`.gitattributes` (new) · `.github/workflows/ci.yml` (new) · `apps/mobile/src/core/design-system/__tests__/` + `formatting/__tests__/` (new tests) · `apps/mobile/app/+not-found.tsx`, `app/_layout.tsx`, `(tabs)/_layout.tsx`, `src/i18n/index.ts` (edits) · `README.md`. (Suggested paths; do not restructure.)

## Public Interfaces Produced

- A committed baseline commit (or series) later phases branch from.
- Stable, tested design-system primitive contracts (`Screen/Text/Button/Card/Amount` props).
- Persisted-locale read/write helper (used by Phase 5 onboarding).

## Testing Requirements

RNTL per primitive incl. ≥1 accessibility assertion each · `format-money` official/estimate formats · i18n: no missing AR keys for touched namespaces · all existing package tests stay green.

## Verification Commands

```
pnpm install --frozen-lockfile
pnpm run check          # must be green, from a clean shell, at repo root
npx expo-doctor         # after Node LTS switch; record output
```

## Manual Validation

- Metro bundles the Android entry (HTTP 200 on the bundle request); Metro stopped afterward.
- Language toggle: choice survives app reload (dev-client or documented equivalent evidence).
- `/settings` reachable via visible UI affordance, not just typed URL.
- No on-device claim may be made (no Android device/emulator in this environment) — record what was and wasn't validated.

## Exit Criteria (all binary)

1. `git status` clean; all pre-existing local work committed (nothing discarded).
2. `pnpm run check` exits 0 from a clean shell.
3. Five primitive test files + format-money tests exist and pass with a11y assertions.
4. `+not-found` uses i18n keys; settings has a UI entry point; language choice persists across restart.
5. CI workflow exists and passes on a PR (or on main, with user approval).
6. README quickstart contains only verified commands.
7. Completion report filed (see below).

## Exit Demo

From a fresh clone: `pnpm install && pnpm check` green; Metro bundles; reviewer sees the 3-tab bilingual shell code, passing primitive tests, and green CI run.

## Required Documentation Updates

`README.md` · [STATUS.md](../STATUS.md) · completion report. If any doc claim proved wrong during the work: fix the doc in the same change or file `DOC-ISSUE:`.

## Known Risks

- Line-ending normalization can create a large-but-content-neutral diff — isolate it in its own commit.
- `Updates.reloadAsync()` behavior in dev vs release differs; language-persistence evidence must state the environment used.
- Node version change may surface new warnings — record, don't chase unrelated upgrades.

## Cuttable Work

None — this phase is the floor.

## Handoff to Next Phase

Phase 2 may rely on: committed baseline; green `pnpm check` + CI; tested primitives; the domain package exactly as committed (status enum spec-exact; known gaps listed in CURRENT_STATE §6 remain open — they are Phase 2's job).

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-1-COMPLETION.md` — commits made (hashes), command outputs (check/CI), test counts, what was NOT validated (device/RTL), `ASSUMPTION:`/`DOC-ISSUE:` lines. Phase 1 may not be marked Complete without it.
