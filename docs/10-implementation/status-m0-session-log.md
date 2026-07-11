# M0 Implementation Status (HISTORICAL — pre-phase-plan session log)

> **⚠ Historical document (renamed from `status.md` on 2026-07-11).** The live implementation status is **[STATUS.md](STATUS.md)**; the execution plan is [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md); the full independent audit of this session's claims is [CURRENT_STATE.md](CURRENT_STATE.md). The M0 milestone this file tracks was superseded by the phase plan (M0 ≈ Phase 1, minus the SQLite items removed by [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)). Content below is preserved verbatim as the record of the mid-M0 session.

This document reflects the actual, verified state of the repository as of this session. It supersedes the previous version of this file, which had gone stale relative to the code (it described a `dashboard`/`simulator` tab shell and an unimplemented design system, but did not reflect the cleanup and navigation work already merged in commit `2147685`).

**Session state: mid-M0, interrupted by the user before completion.** Nothing in this session has been committed to git yet — all changes described below are uncommitted working-tree changes on top of `2147685`. **Do not treat any item below as "done" until it has been committed and re-verified** — several fixes were verified once and then superseded by later edits in the same session without a final end-to-end re-run.

## 1. What was completed and verified this session

### 1a. Repository cleanup (AI_AGENT_RULES / cleanup checklist)

- **`.gitignore` was corrupted** — its last line (`tsconfig.tsbuildinfo`) had been written with a stray null byte between every character (visible as UTF-16-style spacing), so git silently ignored nothing. Rewrote `.gitignore` cleanly and added missing patterns: `*.tsbuildinfo`, `*.d.ts.map`, `apps/mobile/app/**/*.d.ts`, `apps/mobile/src/**/*.d.ts`, `packages/*/vitest.config.d.ts`, `coverage/`.
- **Untracked previously-committed build artifacts** (`git rm --cached`, files still exist on disk but no longer tracked): `tsconfig.tsbuildinfo`; `packages/{domain,finance-engine,demo-data}/vitest.config.d.ts(.map)`; `apps/mobile/app/**/*.d.ts(.map)` (routes); `apps/mobile/src/i18n/index.d.ts(.map)`; all of `packages/finance-engine/coverage/`.
- **Domain model corrected to match `docs/03-domain/domain-model.md`** (`packages/domain/src/entities/obligation.ts`):
  - `ObligationStatus` was an invented enum (`attentionNeeded`, `urgent`, `residualRisk`, `dataIncomplete`) that did not match the doc. Replaced with the exact documented values: `onTrack | dueSoon | overdue | delinquent | attentionRequired | dataStale | calculationIncomplete | notStarted | completed | unknown`.
  - `ConventionalLoanDetails` was missing `Sourced<T>` provenance wrappers required by the doc. `originalPrincipal`, `installment`, `termMonths`, `contractualBalloon` are now `Sourced<Money>`/`Sourced<number>`; `outstandingBalance` is now optional (doc: `outstandingBalance?: Sourced<Money>`).
  - Added `LoanPurpose = 'personal' | 'auto' | 'housing' | 'other'` (was a loose `string`) — confirms personal/auto/housing are `purpose` values on `ConventionalLoan`, not separate obligation kinds (ADR-0008), which was already correct in the union shape.
  - **Known gap, deliberately not addressed:** the doc also specifies `ratePeriods: RatePeriod[]` (≥1) as a required field of `ConventionalLoan`. This was not added — `RatePeriod` as an entity, plus BR-OBL-002 non-overlap validation, is rate-history modeling that belongs with the M2 rate-history feature, not M0 cleanup. Flagged here as `ASSUMPTION:` rather than silently added or silently skipped.
- **`Money.of()` accepted unsafe floating-point `number` input** with no guard (`packages/domain/src/value-objects/money.ts`). It now throws unless the number is `Number.isSafeInteger` (decimal strings remain the only path for fractional amounts — NFR-MNT-003). Added regression tests in `money.test.ts`.
- **Found and fixed a pre-existing compile bug**, not previously caught because `pnpm check` was not actually green (see §2): `id.ts` and `money.ts` called `AppError.validation(...)` as if `AppError` were a class with static factory methods, but `AppError` (`packages/domain/src/errors/app-error.ts`) is only an interface — there was no such method, and `id.ts` didn't even import it. Added a real `DomainInvariantError extends Error` class (carries the taxonomy `code`) for value-object invariant violations, and repointed all five call sites (`id.ts` ×2, `money.ts` ×5) at it. Exported from the package index.
- **`derive-obligation-status.ts` stub** now returns `'unknown'` (the correct "insufficient data" placeholder per the new enum) instead of the removed `'dataIncomplete'`.

### 1b. Build/tooling bugs found and fixed (all pre-existing, not introduced this session)

These were discovered because `pnpm check` had never actually been run clean — status.md previously claimed it was green; it was not.

- **Root `tsconfig.json`** had no `apps` exclusion, so `tsc --build` (a composite-project build restricted to `packages/*` via `references`) was also implicitly walking into `apps/mobile/**/*.tsx` with no JSX compiler option configured, failing on every route file. Added `"apps"` to `exclude`. Added a proper separate `typecheck` script to `apps/mobile/package.json` (`tsc --noEmit`, using its own Expo-based tsconfig), and chained it from the root `typecheck` script.
- **`eslint.config.mjs`** pinned `parserOptions.project` to the single root `tsconfig.json`, so every file under `apps/mobile` failed to parse for typed linting ("file not found in any of the provided project(s)") — `pnpm run lint` was failing on 17 files before this session touched anything. Switched to `parserOptions.projectService: true`, which lets typescript-eslint auto-discover the correct tsconfig per file across the monorepo.
- **Root `package.json`**: `test:app` script called `pnpm --filter @eltizamati/mobile jest`, but the mobile package has no script literally named `jest` (only `test`). Fixed to `pnpm --filter @eltizamati/mobile test`. **This fix was made but the corrected command was not re-run before the session was interrupted** — treat `pnpm run test:app` / the mobile Jest suite as unverified this session.
- **`apps/mobile/app.json`** referenced four asset files (`icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`) in a `./assets/` directory that **did not exist at all**. Generated four flat brand-teal placeholder PNGs (documented as a placeholder pending real brand identity, consistent with design-system.md's existing brand caveat) via a small local Node/zlib script (not committed — one-off).
- **`experiments.typedRoutes: true`** in `app.json` produced a stale, partially-generated `.expo/types/router.d.ts` that hard-failed `tsc` on legitimate route strings (e.g. `Link href="/"`), because Expo Router's typed-route generation only fully populates when a live Metro session serves an actual client bundle request — it is not reproducible from a fresh clone / headless CI. **Disabled `typedRoutes`** for M0 and deleted the stale generated file. `ASSUMPTION:` this trades away compile-time route-string checking; revisit once/if a CI step is added that runs `expo export` (or equivalent) before typecheck to regenerate routes deterministically.
- **`@babel/runtime` was missing** as a direct dependency of `apps/mobile` — it exists in the pnpm store (pulled in transitively by `babel-preset-expo`'s output) but pnpm's strict linking doesn't expose transitive deps, so Metro failed to bundle with "Unable to resolve `@babel/runtime/helpers/interopRequireDefault`". Added as an explicit dependency.
- Ran `npx expo install --fix`, which bumped `@expo/vector-icons`, `expo-updates`, `react-native`, `expo-sqlite` to the versions Expo SDK 52 expects, and auto-registered the `expo-sqlite` config plugin in `app.json`.
- **Verified end-to-end**, not just by typecheck: started the Metro dev server locally and requested the actual Android JS bundle (`.../expo-router/entry.bundle?platform=android&...`) — got a **200** after the asset + `@babel/runtime` fixes (was a hard `500`/`Unable to resolve` failure before). This confirms the app can actually bundle for Android, though it was not run on an emulator/device (none available in this environment — see §4).

### 1c. Navigation corrected to match `docs/02-ux/information-architecture.md`

The previous shell had two tabs, "Dashboard" and "Simulator" — neither matches the approved IA (Home/Obligations/Learn tabs; Simulator is contextual, never a tab; Settings is reached via a header icon, never a tab).

- Removed `app/(tabs)/dashboard.tsx`, `app/(tabs)/simulator.tsx`, and the top-level `app/index.tsx` redirect.
- Added `app/(tabs)/index.tsx` (Home), `app/(tabs)/obligations/index.tsx` (Obligations), `app/(tabs)/learn/index.tsx` (Learn) — matching the exact layout in `system-architecture.md §7`.
- Updated `app/(tabs)/_layout.tsx` to register `index`/`obligations`/`learn` tabs with i18n titles.
- Added `app/settings/index.tsx` as a **non-tab** route (placeholder; holds the language toggle moved from the old dashboard screen).
- Updated `en.json`/`ar.json` with new keys: `tabs.{home,obligations,learn}`, `home.*`, `obligations.*`, `learn.*`, `settings.*`, `notFound.*`, `currency.jod`, `provenance.*`, `common.loading`. Removed the obsolete `tabs.dashboard`/`tabs.simulator`/`dashboard.*`/`simulator.*` keys. EN and AR were edited together in every case.

**Not yet done (interrupted mid-task):**

- `app/+not-found.tsx` still has its original hardcoded English strings ("Oops!", "This screen doesn't exist.") and does not yet use the design-system primitives or the `notFound.*` i18n keys that were already added to the locale files. **This is a real gap against the "no hardcoded user-visible strings" rule.**
- `app/_layout.tsx` has not been updated to register the new `settings` route in the root `Stack` (it currently only knows about `(tabs)` and `+not-found`); navigating to `/settings` is unverified.

### 1d. Design-system primitives (`apps/mobile/src/core/design-system/`)

Created, and confirmed to typecheck + lint clean, but **not yet unit-tested** — the design-system task in `first-slice-prompt.md` explicitly requires RNTL tests with accessibility assertions for each primitive, and none exist yet. Treat this layer as incomplete until tests are added.

- `tokens.ts` — color (light/dark semantic scheme), 4-pt spacing scale, radius scale, typography variants, motion duration, min touch target (44pt) — per `design-system.md §1`.
- `use-theme.ts` — resolves light/dark `ColorScheme` from OS appearance.
- `primitives/Screen.tsx` — safe area (via `react-native-safe-area-context`) + gutter + optional scroll + a `loading`/`skeleton` slot.
- `primitives/Text.tsx` — variant-driven, tabular numerals for `amount*` variants, **logical alignment only**: `align: 'start'|'end'|'center'` is resolved to physical `left`/`right` via `I18nManager.isRTL` inside the component (RN's `TextStyle.textAlign` has no native `start`/`end` value, so the resolution has to happen here to keep the public contract logical).
- `primitives/Button.tsx` — `primary`/`secondary`/`ghost`/`destructive` variants, `loading` state (spinner + `accessibilityState.busy`), disabled state, 44pt minimum height, `accessibilityRole="button"` + `accessibilityLabel`.
- `primitives/Card.tsx` — surface + padding, optional `onPress` (becomes an accessible `Pressable` with `accessibilityRole="button"`).
- `primitives/Amount.tsx` — minimal placeholder per design-system.md §2: props `money: Money`, `provenance: Provenance` (**required, not optional** — matches "it is a type error to render an amount without provenance"), `precision?: 'official'|'estimate'`. Renders via a new `core/formatting/format-money.ts` (official: 3dp + thousands separators + currency suffix; estimate: `≈` prefix + whole-unit rounding), with the provenance source rendered as an i18n-keyed label and folded into the `accessibilityLabel`. Deliberately does **not** implement the full `SCR-EXPLAIN` deep-link wiring (`onPress` is an optional passthrough) — that screen doesn't exist yet.
- `core/formatting/format-money.ts` — new module (matches the "single home for formatMoney/formatDate" note in `system-architecture.md §7`); formats off `Money.toStorageString()` only, never converts to a JS `number` (avoids float precision loss for display).
- `index.ts` barrel export for the above.

No component library was added; everything is built on bare `react-native` + the two dependencies already in `package.json` (`react-native-safe-area-context`).

## 2. Verification actually run this session (with real output)

| Command                                                                                   | Result                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck` (root: `tsc --build` for packages + `tsc --noEmit` in `apps/mobile`) | **Pass**, clean, after all fixes in §1b/§1a                                                                                                                                                                                                                                                 |
| `pnpm run lint` (`eslint . --max-warnings=0`)                                             | **Pass**, clean, after the `projectService` fix                                                                                                                                                                                                                                             |
| `pnpm run test:packages` (vitest: domain, finance-engine, demo-data)                      | **Pass** — 25 + 4 + 2 = 31 tests green                                                                                                                                                                                                                                                      |
| `pnpm run test:app` (mobile Jest/RNTL)                                                    | **Not verified.** The script was broken (`jest` vs `test`) and was fixed, but the corrected command was not re-run before the session was interrupted. There are also no test files for the new design-system primitives yet, so even a clean run would not mean the primitives are tested. |
| `pnpm run format:check`                                                                   | **Not run this session.**                                                                                                                                                                                                                                                                   |
| `pnpm run depcruise`                                                                      | **Not run this session.**                                                                                                                                                                                                                                                                   |
| `pnpm run check` (the full combined gate)                                                 | **Not run this session** — do not report this as green anywhere until it has actually been executed end-to-end.                                                                                                                                                                             |
| `npx expo-doctor`                                                                         | **Not run.**                                                                                                                                                                                                                                                                                |
| Metro bundling (`expo start` + direct HTTP request for the Android bundle)                | **Pass** (`200`) after the `@babel/runtime` + asset fixes; confirmed via `curl`, not via an actual emulator/device render.                                                                                                                                                                  |

## 3. Not started (still open from the M0 scope)

- **Local persistence**: expo-sqlite connection, Drizzle schema, migration runner, migration `0001` (`obligations` + `loan_details`/`murabaha_details`/`card_details` + `user_preferences`), local profile identity (MMKV-stored `localProfileId`), domain↔row mappers, integration test. Nothing under this heading exists yet.
- **Supabase migration foundation** (`supabase/migrations/`, RLS-in-same-migration per table). Not started.
- **CI** (`.github/workflows/ci.yml`). Not started.
- **README quickstart update** with verified commands. Not started (and per the rules above, must only list commands that were actually run — several from §2 have not been).
- **Android validation**: no Android SDK/emulator is available in this environment (`ANDROID_HOME`/`ANDROID_SDK_ROOT` unset, no `adb`). Metro bundling was verified via direct HTTP request only; the app has **not** been launched, tabs have **not** been visually confirmed, language switching / RTL flip has **not** been exercised on a running app, and no restart-persistence or migration test has been run (persistence doesn't exist yet regardless).
- `docs/10-implementation/milestones/M0-foundation.md` completion report — not created. M0 is not complete; do not create a completion report claiming otherwise.

## 4. Known limitations / environment constraints

- This is a Windows development machine with no Android SDK installed and no emulator running. All mobile validation in this session was therefore limited to Metro bundling over HTTP; no on-device or on-emulator claims should be made until that tooling is available.
- The Bash tool's working directory persisted unexpectedly across a couple of calls this session (a `cd` into a package subdirectory silently affected a later `pnpm run` invocation, which ran inside `packages/domain` instead of the repo root and gave a misleadingly narrow "clean" result). Root-caused and worked around by always `cd`-ing to the absolute repo root before workspace-level `pnpm` commands; worth keeping in mind for future sessions.

## 5. Exact next task

1. Re-run `pnpm run test:app`, `pnpm run format:check`, `pnpm run depcruise`, and finally `pnpm run check` end-to-end from a clean shell at the repo root; fix whatever surfaces.
2. Finish the navigation layer: rewrite `+not-found.tsx` off the `notFound.*` i18n keys + design-system primitives; register `settings` in `app/_layout.tsx`.
3. Add RNTL tests (with accessibility assertions) for `Screen`, `Text`, `Button`, `Card`, `Amount` before considering the design-system layer done.
4. Then proceed to local persistence (expo-sqlite + Drizzle), Supabase migration foundation, CI, README, and only then attempt Android validation and the M0 completion report — in that order, per the original task brief.

## 6. Latest commit SHA

`2147685` (`feat: scaffold monorepo, domain packages, and bilingual mobile shell`) — **everything in this document above is uncommitted working-tree state on top of that commit.** Nothing from this session has been committed.

## 7. `ASSUMPTION:` / `DOC-ISSUE:` lines from this session

- `ASSUMPTION:` `ConventionalLoan.ratePeriods` (required by `domain-model.md §3.2`) was not added to the type this session — treated as M2 rate-history scope, not M0 cleanup. Flagging rather than silently adding or silently skipping.
- `ASSUMPTION:` Disabled `experiments.typedRoutes` in `app.json` rather than fixing typed-route generation for headless/CI use, because it depends on a live Metro/client session to fully populate and isn't reproducible from a fresh clone. Revisit if/when a CI step runs `expo export` (or equivalent) ahead of typecheck.
- `ASSUMPTION:` Generated placeholder brand-teal PNG assets locally (icon/adaptive-icon/splash/favicon) since `apps/mobile/assets/` did not exist and `app.json` referenced nonexistent files; this is consistent with `design-system.md`'s existing brand-placeholder caveat, not a new decision.
