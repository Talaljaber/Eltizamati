# Eltizamati Current Implementation State

> **Note (added 2026-07-11, same day, after the documentation reorganization):** this audit is a frozen snapshot taken _before_ the phase-plan reorganization. References to `docs/10-implementation/status.md` now resolve to **[status-m0-session-log.md](status-m0-session-log.md)** (renamed; content preserved). The live status is **[STATUS.md](STATUS.md)**; the execution plan is [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md); §9–§11's recommendations have been incorporated into that plan. The SQLite recommendations in §9/§11 are superseded by [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md) (Supabase-first; no SQLite in MVP).

**Audit date:** 2026-07-11
**Auditor:** Claude (factual current-state audit, no implementation performed)
**Scope:** honest engineering snapshot of the local working tree, compared against `origin/main` and against the documentation set. This is not a plan and not a phase breakdown.

---

## 1. Executive Summary

The repository is in **early M0 (Foundation)**, interrupted mid-session, with the interruption's own progress **entirely uncommitted**. The last pushed/committed state (`2147685`, on `origin/main`) is a bare monorepo scaffold with a broken navigation shell (old `dashboard`/`simulator` tabs that don't match the approved IA) and a domain package with an invented, non-conforming `ObligationStatus` enum.

On top of that commit, the working tree contains a large, coherent, but still uncommitted cleanup pass: the navigation shell was rewritten to match the approved Home/Obligations/Learn IA, the domain model's `ObligationStatus` enum was corrected to match the spec, several real pre-existing build/lint/typecheck bugs were fixed, and a small but well-built design-system primitive set was added. **None of this is committed or pushed** — `git status` shows staged deletions, unstaged modifications, and untracked new files, all on top of a HEAD that is identical to `origin/main`.

Verified this session:

- `pnpm run typecheck` — **passes** (packages + mobile app).
- `pnpm run lint` — **passes** clean, 0 warnings.
- `pnpm run depcruise` — **passes**, 0 boundary violations (88 modules, 131 dependencies).
- `pnpm run test:packages` (domain + finance-engine + demo-data, Vitest) — **passes**, 31/31 tests green.
- `pnpm run format:check` (Prettier) — **fails**, 101 files flagged (see §3 — likely a Windows CRLF checkout issue, not a real formatting regression, but it is a genuine `pnpm check` failure as things stand).
- `pnpm run test:app` (mobile Jest/RNTL) — **fails**: "No tests found" — the harness is wired up but zero test files exist for the mobile app.
- `pnpm run check` (the combined gate) would therefore **fail** at the first (`format:check`) step.
- `npx expo-doctor` — **failed to run** (Node v23.8.0 in this environment produces a silent non-zero exit from the underlying `expo config` command; Expo SDK 52 tooling is not verified compatible with Node 23). No expo-doctor diagnostics were obtained.

There is no local persistence layer, no Supabase artifact, no CI workflow, and no application/state layer (TanStack Query, Zustand, repositories, services) anywhere in the repository — all of `apps/mobile/src` is currently limited to `core/design-system`, `core/formatting`, and `i18n`. The finance engine is a metadata-only scaffold: all 8 documented formulas exist as registry entries with descriptions and assumptions, but **zero have executable calculation logic**. Demo data is a two-constant placeholder package with no seed builders and no consumer anywhere in the app.

**Overall assessment: early foundation, M0 in progress but not honestly complete.** The parts that exist (domain value objects, error taxonomy, design-system primitives, navigation shell, dependency boundaries) are genuinely solid and spec-conformant where implemented. The gaps are not implementation bugs so much as entire layers (persistence, application services, finance calculations, demo data wiring) that have not been started yet.

---

## 2. Repository and Working Tree State

### Pushed baseline

- Remote: `https://github.com/Talaljaber/Eltizamati.git`
- Local branch `main` is tracking `origin/main`, and **`git rev-parse HEAD` == `origin/main`** (`2147685ff749ed61f2d1d53e8b11c8926d27202c`) — `git rev-list --left-right --count origin/main...HEAD` returns `0 0`. **There are no local commits ahead of or behind `origin/main`.**
- Last 10 commits (`git log --oneline --decorate -n 10`):
  ```
  2147685 (HEAD -> main, origin/main) feat: scaffold monorepo, domain packages, and bilingual mobile shell
  4eed7bf Merge pull request #2 from Talaljaber/claude/eltizamati-analysis-review-onnwbq
  f671bca Merge pull request #1 from Talaljaber/main
  443926a feat: resolve design review findings for local-profile identity, asOf test vectors, card-simulator scope, and provider separation
  73968d2 (origin/claude/eltizamati-analysis-review-onnwbq, origin/HEAD) docs: SRC-3/4 delta-audit; expand MVP for 3-week build
  d47f4af (origin/Main) docs: architecture, data/API, security, quality, delivery plan, ADRs, and governance
  26fbee5 docs: source audit, product foundation, requirements, UX, and domain specifications
  ```
- `2147685` is the **only implementation commit** in the repo's history — everything before it is documentation. It introduced the monorepo skeleton, the domain package with (at the time) a non-conforming `ObligationStatus` enum, and a two-tab (`dashboard`/`simulator`) mobile shell that did not match the approved IA.
- There is also an unrelated remote branch, `origin/claude/eltizamati-analysis-review-onnwbq`, one commit ahead of where `main` diverged from it (`f671bca`) — not merged into `main`'s current tip, not otherwise relevant to this audit's scope.

### Local commits not pushed

**None.** `main` and `origin/main` are identical at the commit level. Every change described below is uncommitted working-tree state.

### Staged changes

`git diff --cached --stat` — 36 files, 1,882 deletions, 0 insertions. **All of it is deletion of previously-committed generated/build artifacts** being untracked via `git rm --cached` (files still exist on disk, per `docs/10-implementation/status.md`'s own account of this cleanup):

- `apps/mobile/app/**/*.d.ts(.map)` (route type-declaration files)
- `apps/mobile/src/i18n/index.d.ts(.map)`
- `packages/{demo-data,domain,finance-engine}/vitest.config.d.ts(.map)`
- `packages/finance-engine/coverage/**` (full HTML lcov report + `lcov.info`)
- `tsconfig.tsbuildinfo`

This matches an updated `.gitignore` (see below) that now excludes these patterns going forward.

### Unstaged changes

`git diff --stat` — 21 files, 443 insertions, 492 deletions:

- `.gitignore` — rewritten; status.md reports the previous version was corrupted (null-byte-separated last line) and silently ignored nothing. New patterns added: `*.tsbuildinfo`, `*.d.ts.map`, `apps/mobile/app/**/*.d.ts`, `apps/mobile/src/**/*.d.ts`, `packages/*/vitest.config.d.ts`, `coverage/`.
- `apps/mobile/app.json` — asset paths, plugin registration (`expo-sqlite` config plugin auto-added), `typedRoutes` disabled.
- `apps/mobile/app/(tabs)/_layout.tsx` — tabs re-registered to `index`/`obligations`/`learn`.
- `apps/mobile/app/(tabs)/dashboard.tsx`, `apps/mobile/app/(tabs)/simulator.tsx`, `apps/mobile/app/index.tsx` — **deleted** (old non-conforming shell).
- `apps/mobile/package.json` — dependency version bumps (`expo install --fix`), added `@babel/runtime` as an explicit dependency, added a `typecheck` script.
- `apps/mobile/src/i18n/translations/{ar,en}.json` — new key namespaces (`tabs.*`, `home.*`, `obligations.*`, `learn.*`, `settings.*`, `notFound.*`, `currency.jod`, `provenance.*`, `common.loading`); old `dashboard.*`/`simulator.*` keys removed.
- `docs/10-implementation/status.md` — rewritten this session to reflect actual verified state (superseding a previously stale version).
- `eslint.config.mjs` — switched `parserOptions.project` to `projectService: true` so typed linting resolves per-file tsconfig across the monorepo (fixes 17 previously-failing files under `apps/mobile`).
- `package.json` (root) — fixed `test:app` script (was calling a nonexistent `jest` script name on the mobile package).
- `packages/domain/src/entities/obligation.ts` — `ObligationStatus` enum corrected to the documented 10-value set; `LoanPurpose` added as a proper union; `Sourced<T>` wrappers added to `ConventionalLoanDetails` fields.
- `packages/domain/src/errors/app-error.ts` — added `DomainInvariantError` class.
- `packages/domain/src/index.ts` — barrel export updates.
- `packages/domain/src/services/derive-obligation-status.ts` — stub now returns `'unknown'` instead of a removed invented value.
- `packages/domain/src/value-objects/id.ts`, `money.ts`, `money.test.ts` — repointed at `DomainInvariantError`; `Money.of()` now guards unsafe float input.
- `pnpm-lock.yaml` — lockfile churn from dependency version bumps.
- `tsconfig.json` — added `"apps"` to `exclude` so root `tsc --build` (packages-only composite build) stops walking into `apps/mobile`.

### Untracked files

`git ls-files --others --exclude-standard` — 6 new paths (some directories with multiple files):

- `apps/mobile/app/(tabs)/index.tsx` — new Home tab route
- `apps/mobile/app/(tabs)/learn/index.tsx` — new Learn tab route
- `apps/mobile/app/(tabs)/obligations/index.tsx` — new Obligations tab route
- `apps/mobile/app/settings/index.tsx` — new non-tab Settings route
- `apps/mobile/assets/{adaptive-icon,favicon,icon,splash}.png` — placeholder brand assets (generated locally this session; `app.json` referenced files that didn't exist before)
- `apps/mobile/src/core/design-system/**` (tokens, use-theme, primitives × 5, barrel) and `apps/mobile/src/core/formatting/format-money.ts` — the new design-system layer

### Is the working tree clean?

**No.** `git status` shows 36 staged deletions, 21 unstaged modifications/deletions, and 6 untracked new paths/directories — all on top of a HEAD that matches `origin/main` exactly. **The GitHub repository does not reflect any of the M0 cleanup, navigation fix, or design-system work described in this report** — all of it exists only in this local working tree.

---

## 3. Verification Results

All commands run from the repo root (`c:\Users\hp\.m2\Eltizamati`) against the current, unmodified working tree. No formatting, installs beyond a frozen-lockfile verification, or generation commands were run.

| Command                                                                       | Result                                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                              | **Passed**                                | "Lockfile is up to date, resolution step is skipped." Pruned 45 extraneous packages from `node_modules` to match the lockfile (normal, non-destructive to lockfile/source).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm run format:check` (`prettier --check .`)                                | **Failed**                                | Exit 1. **101 files** flagged, spanning nearly every doc and source file in the repo, including files that were not touched this session. Given `git diff` shows CRLF-conversion warnings on every touched file (`warning: in the working copy of 'X', LF will be replaced by CRLF...`) and `.prettierrc.json` pins `endOfLine: "lf"`, this strongly suggests a **Windows checkout line-ending mismatch** (git `core.autocrlf` converting to CRLF on checkout while Prettier demands LF) rather than 101 individually malformed files. Not independently confirmed by re-running Prettier with a diff, per the "do not run formatting across the repository" constraint on this audit — flagged as the most likely cause, not a certainty. |
| `pnpm run lint` (`eslint . --max-warnings=0`)                                 | **Passed**                                | Exit 0, no output beyond the script header — 0 errors, 0 warnings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm run typecheck` (`tsc --build` + mobile `tsc --noEmit`)                  | **Passed**                                | Exit 0, clean, both the packages composite build and the Expo app's own typecheck.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm run depcruise` (`.dependency-cruiser.cjs` against `apps`+`packages`)    | **Passed**                                | "no dependency violations found (88 modules, 131 dependencies cruised)."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm run test:packages` (Vitest: domain, finance-engine, demo-data)          | **Passed**                                | 31/31 tests green (25 domain + 4 finance-engine + 2 demo-data). Finance-engine coverage report shows 100% on the registry metadata file itself, but this is coverage of scaffolding, not of any calculation logic (none exists — see §5, Finance Engine).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm run test:app` (mobile Jest/RNTL)                                        | **Failed**                                | Exit 1: `No tests found, exiting with code 1` — 32 files checked, 0 matched `testMatch`. The Jest/`jest-expo`/RNTL harness is correctly configured (`apps/mobile/jest.config.js`, relevant devDependencies present), but **zero test files exist** anywhere under `apps/mobile`.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm run test` (= `test:packages && test:app`)                               | **Failed**                                | Fails at the `test:app` step, as above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm run check` (= `format:check && lint && typecheck && depcruise && test`) | **Would fail**                            | Not re-run standalone since it is a strict chain of the commands above and the first step (`format:check`) already fails — re-running would add no new information. **`pnpm check` is not green.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `npx expo-doctor`                                                             | **Failed to run — no usable diagnostics** | Exits with code 1 with **no stdout/stderr text** on this machine, from both Bash and PowerShell, with and without redirection. Isolated the failure to the underlying `expo config --json --full` call inside `expo-doctor`, which also exits 1 silently. This environment runs **Node v23.8.0**; Expo SDK 52 tooling's supported Node range is 18/20-line LTS, and a silent CLI crash is consistent with an unsupported Node major version. **Not resolved or worked around** (would require changing the Node version, outside this audit's scope) — expo-doctor's findings are simply unavailable this session.                                                                                                                         |
| Mobile scripts / safest non-destructive Expo validation                       | **Not run this session**                  | The prior session (documented in `status.md`) verified Metro could bundle the Android JS entry point via a direct HTTP request (200 OK) after fixing a missing `@babel/runtime` dependency. This audit did not start Metro or re-verify bundling, to honor "do not leave Metro running" and to avoid any state-changing action beyond the read-only verification matrix requested. **No claim is made here about current bundling status** — treat it as unverified since the last confirmed check.                                                                                                                                                                                                                                        |
| Android/iOS device or emulator validation                                     | **Not performed, not available**          | No Android SDK, no `adb`, no emulator in this environment (confirmed by `status.md` and not contradicted by anything found this session). No physical-device, emulator, RTL-on-device, persistence, or offline validation can be claimed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

---

## 4. Current Milestone Assessment

### M0 — Foundation

**Intended outcome** (`docs/08-delivery/hackathon-plan.md`): monorepo scaffolded, Expo app boots, i18n+RTL working, design tokens + `Screen`/`Text`/`Button`/`Card`/`Amount` (placeholder) primitives, SQLite+Drizzle with migration 0001, CI green, Sentry wired, README quickstart verified. Exit bar: a bilingual "hello dashboard" shell.

**Completed work:**

- pnpm monorepo with correct workspace boundaries (`apps/mobile`, `packages/{domain,finance-engine,demo-data}`), enforced by a working `.dependency-cruiser.cjs` (0 violations).
- TypeScript strict build across all packages + the mobile app typechecks clean.
- ESLint clean (0 warnings) across the whole repo, including typed linting on `apps/mobile`.
- Navigation shell corrected to the approved 3-tab IA (Home/Obligations/Learn), with Settings reachable as a non-tab route (though not yet linked from anywhere) and Simulator correctly absent as a tab.
- i18n: i18next configured, EN/AR translation files with identical key structure, device-locale detection, RTL switching wired (with the documented RN reload requirement respected).
- Design-system primitives (`Screen`, `Text`, `Button`, `Card`, `Amount`) built to spec-level quality (logical properties, required provenance on `Amount`, accessibility props on interactive primitives) — but **zero component tests exist**, which M0's own exit bar and `first-slice-prompt.md` require.
- Domain package's `ObligationStatus` enum, `LoanPurpose`, and `Sourced<T>` provenance wrappers corrected to match `domain-model.md`.

**Incomplete work (explicitly still open, not started at all):**

- Local persistence: no `expo-sqlite`/Drizzle schema, no migration files, no migration runner, no repositories, no domain↔row mappers — despite `expo-sqlite`/`drizzle-orm` being installed as dependencies. **0% of this M0 requirement exists.**
- CI: no `.github/workflows/` directory at all.
- Sentry: not found anywhere in the repo (no `@sentry/*` dependency, no init code).
- README quickstart: still says "Implementation starts at M0; once it lands this section will contain the verified commands" — not updated despite the commands now existing (many of them failing, per §3).
- `+not-found.tsx` still uses hardcoded English strings instead of the already-added `notFound.*` i18n keys.
- `settings` route is not registered in the root `Stack` layout and is not linked from any screen — reachable only by direct URL.

**Exit gate status:** **not met.** The "bilingual hello dashboard shell" bar requires a working, tested, CI-verified shell; what exists is an untested, uncommitted shell with no persistence and no CI.

**Blockers:** none technical — this is unfinished work, not blocked work. The clearest structural blocker is that `pnpm check` cannot go green until the Prettier/CRLF issue is resolved and mobile tests exist.

**Honestly complete?** **No.** `docs/10-implementation/status.md` (self-authored this session) already states this explicitly and accurately: "mid-M0, interrupted... do not treat any item... as done until it has been committed and re-verified." This audit's independent verification (§3) confirms that self-assessment is accurate and, if anything, slightly optimistic (status.md's own test:packages/typecheck/lint claims held up on re-run, but `format:check` — not run in the prior session — turns out to fail).

### M1–M8

**Not started — documented only.** No demo-data seed builders, no `ImportService`, no onboarding flow, no finance-engine formula bodies, no manual-entry screens, no Supabase artifacts of any kind, no notifications, no hardening pass exist anywhere in the repository. `docs/08-delivery/hackathon-plan.md` fully specifies intended outcomes for each; none have corresponding code to audit.

### Overall estimate

**Early foundation — M0 partial, uncommitted.** The foundation layer (tooling, boundaries, domain VOs, design-system primitives, navigation shell) is real and largely spec-conformant, but the milestone is not honestly closeable yet: no persistence, no CI, no component tests, and the entire cleanup pass sits uncommitted on the local machine only.

---

## 5. Implementation Inventory

### Repository Foundation

- **pnpm workspace:** `pnpm-workspace.yaml` → `apps/*`, `packages/*`. Matches the 3-package + 1-app layout the docs describe. **Implemented.**
- **TypeScript strictness:** root `tsconfig.json` uses project references to the 3 packages, `apps` now excluded from the composite build (fixed this session) with its own `tsc --noEmit` script. **Implemented**, verified via passing `pnpm run typecheck`.
- **Linting:** flat ESLint config (`eslint.config.mjs`) using `projectService: true` for cross-monorepo typed linting (fixed this session — previously failed on 17 files). **Implemented**, verified clean.
- **Formatting:** Prettier configured (`endOfLine: lf`, no semicolons, single quotes) but **currently failing** across 101 files, very likely a Windows CRLF checkout artifact rather than genuine style drift. **Broken** as measured, cause not fully diagnosed within this audit's constraints.
- **dependency-cruiser:** `.dependency-cruiser.cjs` enforces `packages/{domain,finance-engine,demo-data}` → never importing from `apps/`, `domain`/`finance-engine` → never importing `react-native`/`expo`/`expo-sqlite`/`drizzle`/`@supabase`, and route files → never importing storage directly. **Implemented and enforced**, 0 violations currently (trivially, since there's little cross-layer code yet to violate it).
- **Lockfile:** `pnpm-lock.yaml` present, `pnpm install --frozen-lockfile` succeeds without modification. **Implemented.**
- **Scripts:** root `package.json` scripts (`dev`, `format`, `format:check`, `lint`, `typecheck`, `depcruise`, `test`, `test:packages`, `test:app`, `check`) are all present and mostly correct; `test:app` was fixed this session (previously called a nonexistent `jest` script name). **Implemented.**
- **Generated-file hygiene:** `.gitignore` was corrupted (silently ignored nothing, due to a stray-null-byte last line) and has been rewritten this session (uncommitted) to correctly exclude `*.tsbuildinfo`, `*.d.ts.map`, route `.d.ts` files, `vitest.config.d.ts`, and `coverage/`. Previously-committed generated artifacts are staged for untracking (`git rm --cached`) but still exist on disk. **Partial** — the fix is correct but uncommitted, so the broken `.gitignore` is still what's on GitHub.
- **Committed build/coverage artifacts:** `packages/finance-engine/coverage/**` (a full lcov HTML report) and various `.d.ts`/`.d.ts.map`/`.tsbuildinfo` files were committed in `2147685` and are only being removed from tracking in this uncommitted session. **On GitHub right now, these generated artifacts are still tracked.**
- **Environment/secret handling:** no `.env` files, no secret-looking committed files were found. No secrets scanning (gitleaks) is configured in CI because no CI exists.

### Mobile Shell

- **Expo SDK 52** (`expo: ~52.0.32`), **React Native 0.76.9**, **Expo Router ~4.0.17**, React 18.3.1 (`apps/mobile/package.json`).
- **Root layout** (`app/_layout.tsx`): registers only `(tabs)` and `+not-found` in the `Stack`. **`settings` is not registered** — reachable by URL convention only, not via any in-app navigation entry point. **Partial.**
- **Tab structure** (`app/(tabs)/_layout.tsx`): exactly 3 tabs registered — `index` (Home), `obligations` (Obligations), `learn` (Learn), each titled via i18n. **Matches the approved IA exactly.** Confirmed: **Simulator is not a tab** (and has no route file at all currently — it was deleted with the old shell and not replaced), **Settings is not a tab** (a route exists but is unlinked), **Insights is not a tab** (no route exists for it yet). **Implemented** for the tab-registration requirement specifically.
- **Screens:** all four routes (`(tabs)/index.tsx`, `(tabs)/obligations/index.tsx`, `(tabs)/learn/index.tsx`, `settings/index.tsx`) are thin **route-only placeholders** — title + subtitle text via design-system primitives and i18n, no lists, no data, no business logic. `settings/index.tsx` is the only one with any interactivity (a language-toggle button). `+not-found.tsx` is a **pre-existing, un-migrated stub** — plain RN components, hardcoded English strings, ignoring the `notFound.*` i18n keys and design-system primitives that already exist for it. **Scaffold only** across the board.
- **Android configuration:** package `com.eltizamati.app`, adaptive icon configured, `expo-sqlite` config plugin auto-registered. **Scaffold only** (no runtime behavior depends on it yet, unverified on-device).
- **iOS configuration:** bundle identifier set, `supportsTablet: true`. **Scaffold only**, unverified (no iOS validation performed or claimed).
- **Assets:** all four required files (`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`) exist in `apps/mobile/assets/` — but they are **flat placeholder PNGs generated locally this session** (`favicon.png` is only 123 bytes), explicitly not real brand assets. **Scaffold only.**
- **Plugins:** `expo-router`, `expo-localization`, `expo-font`, `expo-sqlite` registered in `app.json`; no font-loading code exists anywhere despite the `expo-font` plugin being present (dead configuration).
- **Safe-area support:** `Screen` primitive wraps content in `SafeAreaView` via `react-native-safe-area-context`. **Implemented** at the primitive level; unverified on-device.
- **Development-build readiness:** `typedRoutes` experiment disabled this session (was producing a stale, CI-unreproducible generated file); Metro bundling was verified via direct HTTP request in the prior session only (not re-verified this audit). **Unverified** as of this audit.

### Internationalization and RTL

- **English/Arabic translations:** `apps/mobile/src/i18n/translations/{en,ar}.json` have **identical key structure**, 1:1, across all 9 top-level namespaces. **Implemented.**
- **i18next setup** (`src/i18n/index.ts`): device-locale detection via `expo-localization`, restricted to `en`/`ar`, fallback `en`. **Implemented.**
- **Locale detection:** works from `getLocales()` at init. **Implemented.**
- **Persisted language preference:** **Not implemented.** No MMKV/AsyncStorage read/write — an explicit user language override does not survive an app restart; it's re-derived from device locale every cold start. **Scaffold only / Broken relative to spec** (`first-slice-prompt.md` explicitly requires a persisted-locale language screen at first launch).
- **RTL switching:** `changeLanguage()` calls `I18nManager.allowRTL`/`forceRTL` and attempts `Updates.reloadAsync()`, correctly noting in-code that RN requires a full reload for RTL layout to apply, with a dev-mode fallback warning if reload fails. **Implemented** at the code level.
- **Reload behavior:** present in code, **not verified end-to-end on a running app** this session (no device/emulator available).
- **Hardcoded strings:** exactly one file violates the i18n-only rule — `app/+not-found.tsx` (two hardcoded English strings, ignoring already-defined `notFound.*` keys). Everywhere else, strings go through `t()`.
- **Logical vs. left/right styles:** `Text`'s `align` prop is `'start'|'end'|'center'` only, resolved to physical `left`/`right` via `I18nManager.isRTL` internally — never exposes `left`/`right` at the public API. **Implemented correctly.**
- **Arabic validation evidence:** **none.** No screenshot, no on-device/emulator RTL flip has been performed or can be claimed. Initialization and code-level RTL wiring exist; **full RTL behavior is unverified**, consistent with the classification rule that "initialization alone is not full RTL implementation."

### Design System

- **Tokens** (`tokens.ts`): light/dark `ColorScheme` (19 semantic colors each, including distinct `estimate`/`official` colors), 4pt spacing scale, radius scale, 9 typography variants (including 3 amount-specific tabular-numeral variants), motion duration, 44pt minimum touch target. **Implemented**, matches `design-system.md §1` closely.
- **`Screen`:** safe-area + gutter + optional scroll + loading/skeleton slot. **Implemented.**
- **`Text`:** variant-driven, tabular numerals for amount variants, logical `align` only. **Implemented.**
- **`Button`:** 4 variants, loading state with `accessibilityState.busy`, disabled state, 44pt minimum height, `accessibilityRole="button"` + label. **Implemented**, full a11y coverage.
- **`Card`:** surface + padding, optional `onPress` → becomes accessible `Pressable`. **Implemented.**
- **`Amount`:** `provenance` is a **required** (non-optional) prop — a type error to omit it, matching the doc's explicit intent. Renders via `format-money.ts`, folds provenance into `accessibilityLabel`. Does not yet wire the `SCR-EXPLAIN` deep-link (acknowledged as deliberately deferred). **Implemented** for the M0 scope (design-system.md's fuller `Amount` spec, e.g. abbreviation ≥100k, is not yet built).
- **Inputs, badges (`ProvenanceBadge`, `StatusChip`, etc.):** **not started** — none of the doc's other primitives (`ProgressBar`, `InsightBanner`, `TimelineItem`, `FieldRow`, `EmptyState`, `Skeleton`, form-field family, `SectionHeader`, `ListRow`, `Sheet`, `DemoBanner`) exist yet. Not expected at M0 per `first-slice-prompt.md` (which scopes M0 to `Screen`/`Text`/`Button`/`Card`, `Amount` as placeholder) — so this is **on-track for M0 scope**, not a gap against M0 itself, but a large remaining surface for M1+.
- **Accessibility defaults:** present on `Button` and `Card` (role, label, state); `Text` has no explicit accessibility role (relies on RN defaults) — **partial**.
- **Component tests:** **none exist.** Test directories (`__tests__/`) were scaffolded under both `design-system/` and `formatting/` but contain zero files. This directly contradicts M0's own exit requirement (RNTL tests + a11y assertions per primitive) and `design-system.md`'s DS-4 rule. **Scaffold only** for testing — the primitives themselves are well-built, but "done" per this project's own Definition of Done requires the tests.

### Domain

Compared field-by-field against `docs/03-domain/domain-model.md` (full detail in agent research; summarized here):

- **Obligation union:** `ConventionalLoan | MurabahaFinancing | CreditCard | GenericFacility | IjaraFinancing | DiminishingMusharakahFinancing` — matches the doc's kind coverage including all 3 P1 stub types. **Implemented** at the union-shape level.
- **Common base fields:** `id, userId, kind, nickname, institutionName, currency, openedDate, closedDate?, notes?, createdAt, updatedAt`. **Mismatches:** doc wants a structured `institution {name, id?}` object (code has flat `institutionName` only, no id); doc wants record-level `provenance` on every obligation (code has none — only field-level `Sourced<T>`). **Partial.**
- **`ConventionalLoan`:** matches on `originalPrincipal`, `outstandingBalance`, `installment`, `rateType`, `termMonths`, `startDate`, `maturityDate`, `paymentFrequency`, `purpose`, `firstPaymentDate`, `contractualBalloon`. **Missing: `ratePeriods: RatePeriod[]`** (doc-required, ≥1 entry, BR-OBL-002) — no `RatePeriod` entity exists anywhere in the codebase. This is a **known, deliberately deferred gap**, explicitly flagged as `ASSUMPTION:` in `status.md` and scoped to M2. **Partial.**
- **`MurabahaFinancing`:** fields present, but the doc's cross-field invariant (`assetCost + disclosedProfit = totalSalePrice`, BR-OBL-003) is **not enforced anywhere in code** — no validation function checks it. `termMonths` is a plain `number` here vs. `Sourced<number>` on the parallel loan field (inconsistent, not doc-violating). **Partial.**
- **`CreditCard`:** field renamed (`minPaymentRule` vs. doc's `minimumPaymentRule`); the rule's discriminated union differs in tag names, uses raw `percent: number` instead of a `Percentage` VO, makes `floor` required instead of optional, and **is missing the `unknown` variant** the doc requires. `fees?: FeeItem[]` is **entirely absent**, no `FeeItem` type exists. **Partial**, several concrete spec deviations.
- **Value objects present:** `Money`, `Rate`, `Id<T>`, `LocalDate`, `Sourced<T>`/`Provenance`. **Missing:** a dedicated `Percentage` VO (doc §2 requires one; code uses raw numbers instead) and a dedicated domain-level `Confidence` VO (doc wants `'official'|'high'|'medium'|'low'`; the closest analog, `CalculationConfidence`, lives in `packages/finance-engine` instead of domain, with different values `'HIGH'|'MEDIUM'|'LOW'|'REFUSED'`). **Partial.**
- **`ObligationStatus` enum:** `onTrack | dueSoon | overdue | delinquent | attentionRequired | dataStale | calculationIncomplete | notStarted | completed | unknown` — **exact match** to the doc, in the same order. This was corrected this session (previously an invented, non-conforming enum). **Implemented.**
- **`deriveObligationStatus`:** a **pure stub** — ignores its input and unconditionally returns `'unknown'`. Its input type (`{ obligation: Obligation }`) doesn't yet carry `payments`, `insights`, or `today`, so even the function signature doesn't match the doc's `deriveObligationStatus(obligation, payments, insights, today)` yet. None of the BR-STAT-001 precedence chain is implemented. **Scaffold only.**
- **`Payment`, `RatePeriod`, `ScheduleEntry`, `CalculationRun`, `Insight`, `ConsentRecord`, `UserProfile`:** **none of these entities exist anywhere in `packages/domain/src`.** This is the single largest gap in the domain package relative to the doc — **not started.**
- **`AppError`/`Result`:** complete and well-implemented. `AppErrorCode` taxonomy (15 codes) fully mapped in `ERROR_CATALOGUE` with severity/retryable/userMessageKey for every code; a two-track error model (`DomainInvariantError` thrown for VO construction invariants, `Result<T,E>` returned for service-level failures — added this session as a genuine pre-existing bug fix). **Implemented.**
- **`Money`:** decimal.js-backed throughout, no native float arithmetic on any operation, `Money.of()` guards unsafe float input (throws unless `Number.isSafeInteger`), currency-aware HALF_UP rounding at JOD's 3dp, currency-mismatch guards. Tested explicitly for the `0.1 + 0.2 = 0.3` exact-decimal case and the unsafe-input guard. **Implemented**, well-tested.
- **Validation/invariants:** VO-level invariants (currency mismatch, negative/unsafe values, rate range) are enforced via `DomainInvariantError`. Cross-entity business-rule invariants (BR-OBL-002 rate-period non-overlap, BR-OBL-003 Murabaha price sum) are **not implemented** because the entities/fields they'd validate (`ratePeriods`) don't exist yet, or no validation function was written (Murabaha).

### Finance Engine

- **Engine isolation:** confirmed clean — `packages/finance-engine` depends only on `@eltizamati/domain` and `decimal.js`; zero React Native/SQLite/Supabase imports; zero consumers anywhere in `apps/mobile` yet (only declared as an unused dependency). **Implemented** (trivially, since there's minimal logic yet to violate the boundary).
- **Formula registry:** `FORMULA_REGISTRY: Record<FormulaId, FormulaMetadata>` populated with all 8 documented formula ids, each carrying `version` (fixed at `1`), `description`, and `assumptions`. **Metadata only — `FormulaMetadata` has no `execute`/`calculate` function field at all.**
- **Every formula, classified:**

  | Formula                   | Status                                                           |
  | ------------------------- | ---------------------------------------------------------------- |
  | `amortization.v1`         | **Scaffold only** — metadata/description only, no implementation |
  | `variableProjection.v1`   | **Scaffold only**                                                |
  | `residualDetection.v1`    | **Scaffold only**                                                |
  | `allocationEstimate.v1`   | **Scaffold only**                                                |
  | `murabahaProgress.v1`     | **Scaffold only**                                                |
  | `extraPaymentScenario.v1` | **Scaffold only**                                                |
  | `cardPayoff.v1`           | **Scaffold only**                                                |
  | `aggregates.v1`           | **Scaffold only**                                                |

  All 8 are self-documented in code as such: `src/index.ts` states "M0: Registry scaffold only. Formula implementations land in M3." No formula is blocked by finance-team validation yet, because none has been attempted — the `TV-30x`/`TV-104`/`TV-203`/`TV-601` test vectors that finance teammates need to sign off are themselves still marked `PENDING-FINANCE` in the spec document, so even once code is written, M3 cannot honestly close until those vectors are filled.

- **Deterministic input handling, explicit `asOf`, decimal arithmetic, rounding, confidence, refusal behavior:** **none of this can be evaluated** — there is no calculation function signature anywhere in the package yet to carry an `asOf` parameter or exercise rounding/refusal logic. The `CalculationConfidence` type includes a `'REFUSED'` value, signaling intent, but no code can currently refuse anything.
- **Property tests, calculation vectors:** **not started.** `fast-check` is an installed devDependency but unused; no `vectors/` directory exists under `packages/finance-engine`.
- **Coverage thresholds / actual passing coverage:** the package's Vitest config runs with `--coverage` and reports **97.5% statements**, but this is coverage of the registry-metadata scaffold only (`formula-registry.ts` is 100% covered because it's pure data) — it is not meaningful coverage of any calculation logic, and the test file's own header comment says as much ("Coverage gate (≥95%) will only apply once formula implementations land"). **Not a real coverage signal yet.**

### Demo Data

- **`DEMO_DATE`:** `packages/demo-data/src/constants.ts` — `toLocalDate('2026-07-01')`. **Mismatch vs. docs** — see §6.
- **`DEMO_SEED_VERSION`:** `'v1'`, present.
- **Seed builders, demo loan, demo Murabaha, demo card, payments, rate history, provenance:** **none exist.** `packages/demo-data/src/index.ts` is a 7-line file re-exporting only the two constants above, with an explicit comment: "M0 placeholder... Full seed factories arrive in M1." **Not started.**
- **`ImportService` integration:** **does not exist anywhere in the repo.** No consumer imports `@eltizamati/demo-data` from `apps/mobile` at all (grep-confirmed) — it's a declared, unused dependency.
- **Reset behavior, connection to financial vectors:** **not started** (nothing to reset or connect; no seed data exists).
- **Can the app currently display demo data?** **No.** There is no data layer, no `ImportService`, and no consumer wiring of any kind between `packages/demo-data` and `apps/mobile`.

### Local Persistence

- **Expo SQLite / Drizzle:** both listed as dependencies in `apps/mobile/package.json` and `expo-sqlite` is registered as a config plugin in `app.json`, but there is **zero usage in code anywhere in the repo** — confirmed by repo-wide grep. **Scaffold only** (installed dependency, not implemented functionality, per this audit's own classification rule).
- **Schema, migration files, migration runner:** **not started.** No `drizzle/` schema directory, no migration files, no runner.
- **Local profile identity:** **not started.** `ADR-0006` documents the intended MMKV-stored `localProfileId` design; MMKV isn't even an installed dependency yet.
- **Ownership fields, tables, repositories, row/domain mapping, round-trip tests:** **not started** — none of this can exist without the schema/migration layer above.
- **Reset and erasure, user preferences, provenance storage:** **not started.**

### Supabase

- **`supabase/` directory:** **does not exist anywhere in the repo.**
- **Migrations, schema parity, RLS, policies, pgTAP tests, generated types:** **not started** — none found.
- **Client configuration:** `@supabase/supabase-js` is **not a dependency anywhere** and is never imported.
- **Authentication:** **not started** — no sign-in/sign-up screens, no session handling code anywhere in `apps/mobile`.
- **Consent:** the `ConsentRecord` type exists only as a description in `domain-model.md`; there is no corresponding type in `packages/domain/src` and no consent flow/screen/service anywhere.
- **Account linking, sync, cloud repositories, Edge Functions:** **not started** — none found.
- This entire domain is fully **documented only**, per `ADR-0016`'s M6 scope — nothing here is a gap against M0, but it is a complete list of everything still ahead for that milestone.

### Application Services and State

- **Composition root, repository interfaces, application services (`ImportService`, obligation/payment/rate/consent services):** **not started** — none found anywhere in `apps/mobile` or `packages/*`.
- **TanStack Query, Zustand:** **not started** — neither is even installed as a dependency; zero usage in code.
- **Query hooks, mutation flows, error mapping, offline behavior:** **not started** — there is no data-fetching layer of any kind yet. `apps/mobile/src` currently contains only `core/design-system`, `core/formatting`, and `i18n` — no `src/features/`, `src/services/`, or `src/data/` directories exist.

### Screens and Flows

| Screen/route                                 | Route only                                           | Visible UI                                                                          | Business logic                     | Data integration | Persistence                   | Tests | End-to-end usable                                        |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- | ---------------- | ----------------------------- | ----- | -------------------------------------------------------- |
| Language selection                           | —                                                    | Folded into Settings toggle, not a dedicated onboarding screen                      | No                                 | No               | No (no persistence of choice) | No    | No                                                       |
| Onboarding (SCR-ONB-*)                       | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Home (`(tabs)/index.tsx`)                    | Yes                                                  | Static title/subtitle only                                                          | No                                 | No               | No                            | No    | No                                                       |
| Obligations (`(tabs)/obligations/index.tsx`) | Yes                                                  | Static title/subtitle only (doesn't even use its own defined `emptyTitle` i18n key) | No                                 | No               | No                            | No    | No                                                       |
| Learn (`(tabs)/learn/index.tsx`)             | Yes                                                  | Static title/subtitle only                                                          | No                                 | No               | No                            | No    | No                                                       |
| Settings (`settings/index.tsx`)              | Yes                                                  | Language-toggle button (only interactive screen)                                    | Minimal (calls `changeLanguage()`) | No               | No (preference not persisted) | No    | Reachable only by direct URL, not linked from any screen |
| Demo loading                                 | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Obligation details                           | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Rate impact                                  | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Loan simulator                               | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Card simulator                               | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Add obligation                               | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Log payment                                  | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Insights                                     | Not started (not even a route/tab, correctly per IA) | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Data-source status                           | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |
| Authentication                               | Not started                                          | —                                                                                   | —                                  | —                | —                             | —     | No                                                       |

Every screen that exists is a route-only placeholder with static UI. Nothing in the app currently reads, writes, or displays real or demo data.

### Testing and CI

- **Domain tests:** 2 files, 25 tests (`app-error.test.ts`, `money.test.ts`) — good coverage of `Money`/`Rate` VO behavior and `Result`/error-taxonomy correctness. No tests for `obligation.ts` type guards, `provenance.ts`, `id.ts`, or `derive-obligation-status.ts`.
- **Finance-engine tests:** 1 file, 4 tests — registry-shape verification only (all 8 ids present, all version 1, no empty assumptions, a react-native-boundary smoke check). Zero tests exercise any calculation, because none exists.
- **Demo-data tests:** 1 file, 2 trivial constant-equality tests.
- **Property tests:** **not started** — `fast-check` installed, unused.
- **Mobile component tests:** **none exist.** Empty scaffolded `__tests__/` directories under `design-system/` and `formatting/`.
- **Persistence tests, migration tests:** **not started** (no persistence layer to test).
- **Navigation tests, RTL tests:** **not started.**
- **Supabase/RLS/pgTAP tests:** **not started** (no Supabase artifacts exist).
- **End-to-end tests (Maestro/Detox/Playwright):** **not started** — no config or spec files of any kind found.
- **GitHub Actions:** **not started** — no `.github/workflows/` directory exists at all.
- **Skipped/empty tests:** the mobile Jest run reports "No tests found" (32 files checked, 0 test matches) rather than skipped tests — there is simply no test suite yet, not a disabled one.
- **Test counts:** 31 passing package tests total (25 + 4 + 2); 0 mobile tests; 0 E2E tests.

### Documentation Accuracy

- `docs/10-implementation/status.md` was **rewritten this session** specifically to correct a previously stale version (which described the old `dashboard`/`simulator` shell and an unimplemented design system). The current version of `status.md` is **accurate** against this audit's independent findings on every claim checked: the 31/31 package test count, the `pnpm run typecheck`/`lint` pass results, the deliberately-deferred `ratePeriods` gap, and the "not started" status of local persistence, Supabase, and CI were all independently confirmed true. The one gap in `status.md`'s own account: it does not mention `format:check` at all ("Not run this session") — this audit found that command **fails**, which `status.md` could not have caught since it wasn't run.
- `README.md`'s "Current status" section (dated 2026-07-10) says "Phase: engineering knowledge base complete — implementation not yet started," which is **now stale** — implementation has started (`2147685` plus this session's uncommitted work) and the README's own quickstart section still defers to "once M0 lands" without listing any commands, even though most of the `pnpm` commands now exist and were runnable (2 of 8 verification commands pass cleanly, several others fail).
- No other stale or incorrect claims were found in the milestone/ADR documentation itself — the specification set is internally consistent and was not found to materially disagree with itself except where already self-flagged (see §6).

---

## 6. Specification Mismatches

1. **`DEMO_DATE` value mismatch.** `docs/03-domain/calculation-test-vectors.md:30` states the constant is "currently `2026-07-10`." The actual code (`packages/demo-data/src/constants.ts:13`) sets it to `2026-07-01`. Both dates are documented as "changing this requires re-signing all TV-30x vectors" — since no TV-30x vectors are filled in yet (they're marked `PENDING-FINANCE` in the spec itself) and no seed data yet depends on this constant, this is low-impact today but will need reconciling before M3 vector sign-off.
2. **`ObligationBase` provenance:** doc requires record-level `provenance` on every obligation in addition to field-level `Sourced<T>` wrappers; code has only the latter.
3. **`ObligationBase` institution field:** doc wants `institution: {name, id?}`; code has a flat `institutionName: string` with no id.
4. **`ConventionalLoan.ratePeriods`:** doc-required (`RatePeriod[]`, ≥1, BR-OBL-002); entirely absent from code, and `RatePeriod` doesn't exist as a type anywhere. Explicitly self-flagged as an `ASSUMPTION:` deferred to M2 — not a silent gap, but still a real mismatch against the current doc.
5. **`MurabahaFinancing` invariant BR-OBL-003** (`assetCost + disclosedProfit = totalSalePrice`): specified in the doc, not enforced anywhere in code.
6. **`CreditCard.minPaymentRule`:** doc's field name is `minimumPaymentRule` with a 3-variant union (`percent`/`fixed`/`unknown`, using a `Percentage` VO, optional `floor`); code has `minPaymentRule` with only 2 variants (`percentFloor`/`fixed`, raw `percent: number`, required `floorAmount`), missing the `unknown` case entirely.
7. **`CreditCard.fees`:** doc-specified (`FeeItem[]`); entirely absent from code, and `FeeItem` doesn't exist as a type.
8. **Missing `Percentage` value object:** doc lists it as a distinct VO (§2); code uses raw `number` wherever a percentage/utilization value is needed.
9. **`Confidence` VO location and values:** doc places `Confidence` (`'official'|'high'|'medium'|'low'`) in the domain package; the closest implemented analog, `CalculationConfidence`, lives in `packages/finance-engine` instead with different values (`'HIGH'|'MEDIUM'|'LOW'|'REFUSED'`, different casing, adds `REFUSED`, drops `official`).
10. **Missing entities:** `Payment`, `RatePeriod`, `ScheduleEntry`, `CalculationRun`, `Insight`, `ConsentRecord`, `UserProfile` are all specified in `domain-model.md` and none exist in code yet. (Expected at this stage of M0 per the milestone plan, but worth stating plainly as the largest single gap between doc and code.)
11. **Persisted language preference:** `first-slice-prompt.md` requires a language screen whose choice is persisted (and RTL flips from that persisted choice on relaunch); the current implementation re-derives locale from the device every cold start with no persistence — an explicit user override does not survive an app restart.
12. **Domain package internal structure:** doc implies status derivation lives under `packages/domain/src/status/`; code places it under `services/` instead. Cosmetic, not a behavioral mismatch.
13. **Screen-inventory / hackathon-plan traceability gap** (pre-existing in the docs, not a code issue): `hackathon-plan.md`'s M6 traceability matrix references `SCR-AUTH-*`, `SCR-CONSENT`, `SCR-CONNECT` screen ids that don't exist in `screen-inventory.md`, and separately cites `US-014`/`US-015` for auth/mock-connect work that collides with two _already-defined, unrelated_ stretch stories of the same ids in `user-stories.md` (local reminders and export, respectively). Flagged here because a future agent implementing M6 off the traceability matrix alone would hit undefined/conflicting ids.

---

## 7. Broken or Unverified Claims

- **`pnpm run format:check` fails** (101 files) — not previously known/reported anywhere in the docs; likely a CRLF checkout artifact given the `git diff` LF→CRLF warnings on every touched file, but not conclusively diagnosed within this audit's read-only constraints.
- **`pnpm run test:app` fails** ("No tests found") — the mobile Jest/RNTL harness is configured but empty; this was already flagged as unverified in `status.md` and is now confirmed to actively fail, not merely be unverified.
- **`pnpm run check` cannot be claimed green** by anyone until both of the above are fixed.
- **`npx expo-doctor` could not be run** — silent non-zero exit on this machine (Node v23.8.0), no diagnostics obtained. Any future claim about Expo config health should be treated as unverified until this is re-run on a supported Node version.
- **Metro/Android bundling** was verified via HTTP request in the prior session but **not re-verified this audit** — treat as stale/unconfirmed rather than currently broken.
- **No physical-device, emulator, RTL-on-device, persistence, or offline validation has ever been performed** in this repository's history, per both this audit and the prior session's own environment-constraint notes (no Android SDK/emulator available). Any claim of the app "working on Android or iPhone" would be false.
- **`README.md`'s "implementation not yet started" framing is stale** relative to the actual (uncommitted) code state — see §5, Documentation Accuracy.

---

## 8. Current Risks and Blockers

- **Everything described as "fixed" or "corrected" in this report is uncommitted.** If this working tree were lost (machine failure, accidental `git clean`/`reset`, etc.) before a commit, the repository would revert to the broken `2147685` state (invented status enum, non-conforming nav shell, corrupted `.gitignore`) with no record of this session's work. This is the single largest practical risk right now — not a code defect, a process one.
- **`pnpm check` is not green**, and has apparently never been run clean end-to-end by anyone (status.md's own account: "`pnpm run check` — Not run this session — do not report this as green anywhere until it has actually been executed end-to-end"). This audit is the first confirmed end-to-end run, and it fails at two independent steps.
- **No CI exists**, so nothing prevents a future regression in any of the currently-passing checks (lint, typecheck, depcruise, package tests) from being merged unnoticed.
- **Windows-only development environment with no Android SDK.** All mobile validation to date has been Metro-bundle-over-HTTP at best; genuine Android-first validation (a stated project constraint) has never happened.
- **`expo-doctor` is currently unusable in this environment** (Node v23 incompatibility suspected) — a real gap in the verification toolchain until resolved.
- **Two independent "unblocked but unstarted" layers gate almost everything downstream:** local persistence (blocks any real obligation-list/detail screen, blocks demo-data from being consumable) and finance-engine formula bodies (blocks rate-impact/simulator screens, blocks TV-3xx sign-off). Both are pure engineering work, not blocked by any external decision — but nothing else meaningful can be demoed until at least the first lands.

---

## 9. Recommendations

**What should we do now before asking Fable to create the full implementation phases?**

### Immediate Corrections

1. **Commit the current working tree state.**
   - Reason: this is the single highest-risk item — a session's worth of real, spec-conformant fixes (status enum correction, nav-shell fix, `.gitignore` fix, design-system primitives, several pre-existing build bugs) exists only on local disk.
   - Evidence: §2 (Local commits not pushed: none; all changes uncommitted).
   - Affected: entire working tree.
   - Dependency: none — this is a git operation, not a code change; requires explicit user approval per this session's operating constraints (this audit did not commit anything).
   - Size: XS. Risk: Low (assuming the user reviews the diff, which is large but coherent).
   - Verification required: `git status` clean afterward; `git log` shows the new commit; nothing unintended swept in (e.g., double-check no `.env`/secret file is present — none was found in this audit).

2. **Diagnose and fix the `format:check` failure.**
   - Reason: `pnpm check` cannot be green while this fails; 101 flagged files suggests a systemic (likely CRLF) cause rather than 101 real style violations, so the fix is probably a `.gitattributes` / `core.autocrlf` change, not 101 manual edits.
   - Evidence: §3 verification table; `git diff` LF→CRLF warnings on every touched file.
   - Affected: repo-wide (`.gitattributes`, git config, possibly `.prettierrc.json`).
   - Dependency: none.
   - Size: S. Risk: Low.
   - Verification required: `pnpm run format:check` exits 0 without any source-level rewrites beyond line-ending normalization.

3. **Write mobile test files (even minimal ones) so `test:app` stops hard-failing.**
   - Reason: "No tests found" is a harder failure than "0 tests passed" — it blocks the `pnpm check` chain entirely regardless of how good the untested code is.
   - Evidence: §3 verification table.
   - Affected: `apps/mobile/src/core/design-system/__tests__/`, `apps/mobile/src/core/formatting/__tests__/`.
   - Dependency: none — the Jest/RNTL harness is already correctly configured.
   - Size: M (RNTL tests with a11y assertions for 5 primitives, per M0's own exit bar). Risk: Low.
   - Verification required: `pnpm run test:app` passes; each primitive has at least one accessibility-assertion test per `design-system.md` DS-4 and `first-slice-prompt.md`.

### Finish the Current Milestone

4. **Local persistence: expo-sqlite + Drizzle schema, migration 0001, one round-trip integration test.**
   - Reason: this is M0's largest remaining scoped item and gates M1 (demo data has nothing to write into without it).
   - Evidence: §5 Local Persistence (0% implemented despite dependencies being installed); `docs/05-data-api/database-schema.md`; `docs/09-decisions/ADR-0006-local-persistence.md`.
   - Affected: new `apps/mobile/src/core/storage/` directory (already carved out as an allowed import boundary in `.dependency-cruiser.cjs`).
   - Dependency: domain model should be reasonably stable first (not necessarily 100% — but the mismatches in §6, especially `ratePeriods`, will affect the schema).
   - Size: M. Risk: Medium (schema/migration mistakes are costly to unwind later; get the class-table-inheritance shape from `database-schema.md` right the first time).
   - Verification required: migration runs clean on a fresh SQLite file; round-trip test (write obligation → read back → matches); `pnpm run depcruise` still green (storage stays behind the boundary).

5. **Wire up CI (`.github/workflows/ci.yml`).**
   - Reason: M0's own exit bar requires it; nothing currently prevents silent regressions.
   - Evidence: §5 Testing and CI (not started); `docs/07-quality-operations/ci-cd-environments.md`.
   - Affected: new `.github/workflows/ci.yml`.
   - Dependency: items 2 and 3 above (no point wiring CI around a red `pnpm check`).
   - Size: S. Risk: Low.
   - Verification required: a PR triggers the workflow and it goes green on the current (post-fix) `pnpm check`.

6. **Finish the navigation loose ends:** rewrite `+not-found.tsx` off the existing `notFound.*` keys and design-system primitives; register `settings` in the root `Stack` and link it from a header icon (per `information-architecture.md`'s "Settings is a header icon, never a tab").
   - Reason: small, already-scoped gaps explicitly called out in `status.md` itself.
   - Evidence: §5 Mobile Shell.
   - Affected: `apps/mobile/app/+not-found.tsx`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx` or a shared header component.
   - Dependency: none.
   - Size: XS. Risk: Low.
   - Verification required: manual navigation to `/settings` via a real UI affordance, not just a typed URL; `+not-found.tsx` renders via `t()` in both languages.

### Next Logical Implementation Domain

7. **Demo data seed builders + `ImportService` + minimal obligation-list read path (M1 scope).**
   - Reason: this is the next domain that turns the current static shell into something that shows real content, and it's the natural consumer of the persistence layer once it lands. It's also the fastest path to a demoable artifact.
   - Evidence: §5 Demo Data (2-constant placeholder, zero consumers); `docs/05-data-api/seed-demo-data.md`; `docs/09-decisions/ADR-0009-provider-abstraction.md`.
   - Affected: `packages/demo-data/src/`, new `apps/mobile/src/services/` (composition root, `ImportService`), `apps/mobile/app/(tabs)/obligations/`, `apps/mobile/app/(tabs)/index.tsx`.
   - Dependency: **hard dependency on item 4 (local persistence)** — there's nowhere to import demo data into without it.
   - Size: L (spans domain, persistence-consumer, and two screens). Risk: Medium — first real use of `ImportService`/provider abstraction pattern, worth getting the shape right since it's meant to be shared with future real providers.
   - Verification required: `pnpm run test:packages` covers new seed-builder logic; a manual/Metro-bundled check that Home/Obligations render the 3 documented demo obligations; `pnpm run depcruise` stays green.

### Later Work

8. **Finance-engine formula implementations (M3 scope) — explicitly not next.** Real math is high-value but has a hard dependency on the persistence + demo-data path landing first (nothing to calculate against yet), and on finance-team sign-off of the `TV-30x` vectors that are currently `PENDING-FINANCE` in the spec itself. Size: L. Risk: High (money math, needs property tests + signed vectors before trust). Do this once item 7 lands.
9. **Supabase/auth/M6 backend work.** Explicitly documented as off the critical demo path (`ADR-0016`) and should stay that way — no reason to start this before the local-first spine (persistence → demo data → engine → simulator UI) is demoable end-to-end.
10. **Remaining design-system primitives** (`ProvenanceBadge`, `StatusChip`, `ProgressBar`, `InsightBanner`, form fields, etc.) — build incrementally as the screens that need them get built (M1/M2), not in a batch ahead of demand.

---

## 10. Exact Next Task

**Objective:** Make `pnpm check` pass end-to-end from a clean shell, without changing any application behavior — pure verification-gate repair, so every subsequent session has a trustworthy green baseline to build on.

**Likely files:**

- `.gitattributes` (new, or fix existing git line-ending handling) — root cause of the `format:check` failure.
- `apps/mobile/src/core/design-system/__tests__/*.test.tsx` (new — `Screen`, `Text`, `Button`, `Card`, `Amount`, one file each).
- `apps/mobile/src/core/formatting/__tests__/format-money.test.ts` (new).
- Possibly `apps/mobile/jest.config.js` if any config adjustment is needed to discover the new tests (should already work — 32 files were already being scanned).

**Acceptance criteria:**

- `pnpm run format:check` exits 0 with no manual per-file edits beyond line-ending normalization (confirm via `git diff --stat` showing no unexpected content changes, only line-ending metadata).
- `pnpm run test:app` exits 0 with ≥1 passing test per design-system primitive, each including at least one accessibility assertion (e.g., `getByRole`/`accessibilityLabel` check) per `design-system.md` DS-4.
- `pnpm run check` exits 0 end-to-end from a fresh shell at the repo root.

**Tests:** the new RNTL test files themselves are the deliverable; no other test changes required for this task.

**Commands to run:**

```
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run depcruise
pnpm run test
pnpm run check
```

**Stop condition:** stop as soon as `pnpm run check` exits 0. Do not proceed to local persistence, demo data, or any new feature work in the same session — this task is scope-limited to making the gate green.

**What not to implement yet:** no SQLite/Drizzle work, no demo-data seed builders, no finance-engine formulas, no new screens, no Supabase work, no CI workflow file (that's the very next task after this one, but keep them separate — CI should be wired around an already-green gate, not simultaneously with fixing it).

---

## 11. Handoff Input for Fable 5

### Verified baseline

- pnpm monorepo (`apps/mobile` + `packages/{domain,finance-engine,demo-data}`), TypeScript strict, ESLint clean, dependency-cruiser boundaries enforced (0 violations).
- Domain: `Money`/`Rate` value objects (decimal.js-backed, no float arithmetic, unsafe-input guarded), `AppError`/`Result` taxonomy, `ObligationStatus` enum (10 values, spec-exact), `Sourced<T>` provenance wrapper — all with passing tests (25 domain tests green).
- Finance-engine: formula registry scaffold (8 formula ids, metadata-complete, zero calculation logic) — boundary-clean, isolated from React Native/SQLite/Supabase.
- Mobile shell: Expo Router with the approved 3-tab IA (Home/Obligations/Learn), i18next EN/AR with matching key sets, RTL-switch code path (reload-based, per RN's requirement).
- Design system: `Screen`/`Text`/`Button`/`Card`/`Amount` primitives, token system, logical (start/end) styling throughout, required-provenance `Amount` — untested but implementation-complete for M0 scope.

### Work currently in progress

All of the above "verified baseline" for the navigation-shell fix, status-enum fix, and design-system layer is **uncommitted, local-only working-tree state** — see §2. `origin/main` still has the old broken 2-tab shell and invented status enum. This must be committed before any further work builds on top of it, or the next session risks losing it.

### Remaining implementation domains

- **Local persistence** (SQLite/Drizzle schema, migrations, repositories, mappers) — 0% implemented.
- **Demo data** (seed builders, `ImportService`, provider abstraction) — 2-constant placeholder only.
- **Finance engine calculations** (all 8 formulas) — metadata scaffold only, zero logic.
- **Application/state layer** (composition root, TanStack Query, Zustand, application services) — not started at all.
- **Screens with real behavior** (obligation list/detail, rate impact, simulators, add-obligation, log-payment, insights) — all route-only or entirely absent.
- **Testing** (mobile component tests, property tests, integration tests, E2E) — near-zero coverage outside 3 domain-adjacent package test files.
- **CI/CD** — nonexistent.
- **Backend** (Supabase, auth, consent, RLS) — fully documented-only, correctly deferred to M6 off the critical demo path.

### Hard dependencies

- Domain model stability (esp. `ratePeriods`, Murabaha invariant) before finalizing the persistence schema — a schema built against the current domain gaps will need a migration to add rate-history support later; better to decide now whether to add `RatePeriod` before or after the first schema lands.
- Schema/migrations before repositories.
- Repositories before any data-driven screen (obligation list/detail, home aggregates).
- Demo data + `ImportService` before those screens can show anything meaningful without waiting on manual entry.
- Signed `TV-1xx`/`TV-2xx`/`TV-30x` vectors before finance-engine formulas can be considered "done," not just "implemented" — the spec itself gates this, independent of code.
- Finance engine (`amortization.v1`, `variableProjection.v1`, `residualDetection.v1` at minimum) before rate-impact UI or any simulator screen — those screens have nothing to render without real calculation output.
- Local demo-mode spine fully working before any Supabase integration work begins — per `ADR-0016`, the scripted demo must stay airplane-mode-safe throughout, so Supabase must never become load-bearing for it.

### Critical demo path

The minimum path to a credible hackathon demo, in dependency order: **domain model (ratePeriods decision) → SQLite schema + migration 0001 → demo-data seed builders + `ImportService` → Home/Obligations screens rendering real seeded data → `amortization.v1` + `variableProjection.v1` + `residualDetection.v1` implemented and vector-verified → rate-impact screen → `extraPaymentScenario.v1` + loan simulator screen.** Everything else (card simulator, notifications, insights center beyond the minimum rule set, manual entry, Supabase/auth) is additive polish on top of that spine, not required for the spine itself to be demoable.

### Parallelizable work

- Mobile test-writing (item 3, §9) can happen in parallel with the persistence-layer build — different files, no shared state.
- Design-system primitive expansion (`ProvenanceBadge`, `StatusChip`, `ProgressBar`, etc.) can proceed in parallel with schema/persistence work, since the primitives only depend on the domain types that already exist.
- Finance-engine formula implementation can start in parallel with the persistence/demo-data track, since the engine is intentionally decoupled (pure functions over domain types) — it doesn't need SQLite to exist, only realistic input shapes to test against (which the demo-data seed builders will also need to produce, so close coordination is still valuable even though the code paths are independent).
- CI wiring (item 5, §9) can happen any time after the gate is green (item 1–3, §9) — independent of feature work.

### Cuttable work

- Card simulator (`cardPayoff.v1` + UI) — explicitly stretch/M7 in the doc set already; cut first if time-constrained.
- Notifications, duplicate-payment detection, user-defined thresholds (M7) — cut before touching the core spine.
- The mock CRIF/Open Banking "connect" flow and everything in M6 (Supabase/auth/consent/biometric lock) — `hackathon-plan.md` itself names this as the first thing to drop under time pressure, then the whole milestone if needed.
- Full remaining design-system primitive set beyond what specific in-progress screens need — build just-in-time, not speculatively.

### Validation gates

- Before any milestone is marked done: `pnpm run check` green (all 5 sub-checks, not just typecheck/lint as has happened before), plus the milestone-specific Definition of Done items in `DEFINITION_OF_DONE.md` (physical-device Android demo, Arabic walkthrough, `pnpm check` green, docs/ids updated in the same PR).
- Before finance-engine formulas are considered complete: matching `TV-*` vectors filled (not `PENDING-FINANCE`) and signed off (`reviewedBy` populated) by a finance teammate, plus property-test invariants (INV-1..7) passing.
- Before any schema/migration change ships: both local and (when M6 starts) Supabase migrations updated together, plus a round-trip/migration test.
- Before M6 work starts at all: confirm the local demo-mode spine still runs fully offline with the new surface area present but inert (per `DEFINITION_OF_DONE.md`'s "(Backend/auth milestones) the scripted demo spine still runs in airplane mode" gate).

### Constraints that must remain unchanged

- Expo and React Native (no framework swap).
- One Android/iOS codebase (Expo Router, no platform forks).
- Android-first validation (even though this development environment currently lacks an Android SDK/emulator — that's an environment gap to fix, not a license to skip Android validation permanently).
- Local-first, airplane-mode-safe scripted demo — non-negotiable per `ADR-0013`/`ADR-0016`.
- Supabase must never become a dependency of the staged/scripted demo.
- Pure, deterministic finance engine — no I/O, no system clock, explicit `asOf` only.
- No unsafe JavaScript `number` arithmetic on money — `Money`/`Rate` VOs only, already enforced and tested at the VO level; must stay enforced as new call sites appear.
- No financial calculations in UI components/hooks/routes — engine/domain-service only.
- Field-level provenance for material values (`Amount` primitive already enforces this at the type level for anything using it — keep using it, don't bypass it).
- Both Arabic and English, added together for every new string, RTL via the existing persisted-locale + reload pattern once persistence is added.
- Honest mock-provider labeling (demo/mock data must never render as if it were live).
- `docs/10-implementation/status.md` (or its successor) updated after every completed phase — this has proven valuable this session for catching drift between claimed and actual state, and should continue.

---

## Appendix A — Commands Run

Git/inspection (no working-tree mutation):

```
git branch --show-current
git rev-parse HEAD
git status --short
git status
git log --oneline --decorate -n 10
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
git fetch --dry-run
git remote -v
git rev-list --left-right --count origin/main...HEAD
git diff --stat origin/main...HEAD
git diff --stat origin/main
```

Verification (read-only w.r.t. source; `pnpm install --frozen-lockfile` only touches `node_modules`):

```
pnpm --version
node --version
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run depcruise
pnpm run test        (= test:packages && test:app)
npx expo-doctor       (failed to produce output; underlying `expo config --json --full` also isolated and re-run directly, same silent failure)
```

Not run: `pnpm run check` (standalone) — not re-run because it is a strict superset of the commands above and the first sub-step (`format:check`) is already confirmed failing; re-running would add no new information while taking several more minutes. No formatting, migration-generation, or install/upgrade commands beyond the frozen-lockfile verification were run. No files were modified, staged, committed, or pushed by this audit. No Metro server, emulator, or device session was started.

## Appendix B — Files Inspected

Root governance: `README.md`, `AI_AGENT_RULES.md`, `CODE_REVIEW_CHECKLIST.md`, `DEFINITION_OF_DONE.md`, `CONTRIBUTING.md`, `package.json`, `pnpm-workspace.yaml`, `.dependency-cruiser.cjs`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json`.

Docs (full read, directly or via research agents): `docs/INDEX.md`, `docs/10-implementation/status.md`, `docs/10-implementation/Implement.md` (empty), and every file under `docs/00-audit/`, `docs/00-product/`, `docs/01-requirements/`, `docs/02-ux/`, `docs/03-domain/`, `docs/04-architecture/`, `docs/05-data-api/`, `docs/06-security-privacy/`, `docs/07-quality-operations/`, `docs/08-delivery/`, `docs/09-decisions/` (all 16 ADRs + template).

Code — `packages/domain/src/**` (all entities, value objects, services, errors, and their test files); `packages/finance-engine/src/**` (registry, types, tests); `packages/demo-data/src/**` (constants, index, tests); `apps/mobile/app.json`, `apps/mobile/package.json`, `apps/mobile/app/**` (all route files including untracked and deleted-in-working-tree ones), `apps/mobile/src/i18n/**` (setup + both translation files), `apps/mobile/src/core/design-system/**` (all primitives, tokens, theme hook), `apps/mobile/src/core/formatting/format-money.ts`; repo-wide greps for Supabase/CI/testing/persistence/state-management usage across `apps/` and `packages/` excluding `node_modules`.

No `docs/10-implementation/milestones/M0-foundation.md` exists (confirmed via glob) — referenced by the audit brief as "if present"; it is not present, consistent with `status.md`'s own statement that this completion report was deliberately not created because M0 is not complete.
