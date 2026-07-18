# Phase 9: Hardening, Devices, Security, and Release

**Status:** Code/config subset implemented and gated green. **Not complete** — every
physical-device, paid-account, and rehearsal item from the phase's own Exit Criteria remains open.
**Date:** 2026-07-18

## Why this is a partial completion report, not a full one

[PHASE-09-hardening-and-release.md](../phases/PHASE-09-hardening-and-release.md) formally gates on
Phase 8.5's exit review (not yet closed — Workstream 5 hasn't started, the Arabic reviewer is
still TBD) and its scope is overwhelmingly manual: physical Android device runs, an EAS account
and build, a Sentry project and DSN, the actual dress rehearsal, and tagging a release. The owner
asked to start it anyway, explicitly scoped to **code and config only** — no account creation, no
spend, no device access available in this environment. This report documents exactly that subset;
see "Still open" below for everything the phase doc still requires before it can close.

## Objectives Achieved (code/config subset)

1. **Sentry wiring (ADR-0015).** `@sentry/react-native` installed; `src/core/observability/sentry.ts`
   calls `Sentry.init` only when both `!__DEV__` and `EXPO_PUBLIC_SENTRY_DSN` are set — fully inert
   otherwise, so it's safe in every current build. `sendDefaultPii: false`, a `beforeSend` scrubber
   (drops `user`/`request`, strips any C2/C3-shaped key from `extra`/`tags`), and a
   `beforeBreadcrumb` scrubber that keeps only the destination screen name for navigation
   breadcrumbs, never route params. `Sentry.wrap` added around the root layout. 7 unit tests on the
   scrubbers (`src/core/observability/__tests__/sentry.test.ts`).
2. **Structured logger module (security-controls.md §2 "Logging" row).** `src/core/logging/logger.ts`
   is now the app's one sanctioned `console.*` call site — every prior raw `console.*` call across
   the mobile app (`i18n/index.ts`, `providers.tsx`, `obligation/add.tsx`,
   `ensure-authenticated-user-profile.ts`, `prepare-personal-entry.ts`, `use-entry-completion.ts`,
   `user-profile-repository.ts`, `consent-repository.ts`) was migrated to it. In dev builds it
   prints to console; in release builds it forwards `warn`/`error` to `Sentry.captureMessage` and
   `info`/`debug` to `Sentry.addBreadcrumb` instead (closing a real gap: previously these
   diagnostics were dev-only and invisible in a release build, including real save failures).
   `safeMetadata` is checked against a C2/C3 key-name denylist before it can reach the console or
   Sentry — dev throws immediately on a violation (via `DomainInvariantError`, per ADR-0014), release
   silently drops the offending key rather than crash the app. 19 unit tests
   (`src/core/logging/__tests__/logger.test.ts`).
3. **Deep-link route allow-list (ADR-0005; security-controls.md §2 "Deep links" row).**
   `src/core/security/deep-link-allowlist.ts` is an explicit, testable allow-list of every real
   route under `apps/mobile/app/` — anything else (including fuzz-style malformed paths: path
   traversal, SQL-injection-shaped strings, `javascript:` URIs, oversized ids) is rejected. 38 unit
   tests, including a fuzz-style rejection table. `src/core/security/use-deep-link-guard.ts` wires
   it as a best-effort corrective redirect (Expo Router's own `Linking` handling isn't preemptable
   from userland, so this is defense in depth, not a hard barrier — documented in the module's own
   header comment). 3 unit tests. Existing destination-screen safe-fallback behavior
   (`obligation/[id].tsx`, `learn/[id].tsx` already show a not-found state for an unknown id) was
   verified, not rebuilt.
4. **`eas.json`** with `development`/`preview`/`production` build profiles (preview and dev build
   APKs per the phase doc's own `eas build -p android --profile preview` requirement; production
   builds an app bundle). No `eas.projectId` yet — that requires `eas login`/`eas init`, which
   needs a real EAS account.
5. **`.gitleaks.toml`** extending gitleaks' default ruleset, with an allowlist for the known-safe
   Supabase local-dev demo anon key (used in the integration test suite) and the existing
   `DEMO_ALLOWED_USER_IDS`/`DEMO_ALLOWED_EMAILS` fixture values already documented in
   `netlify.toml`. Not yet run against the real gitleaks binary (unavailable in this environment).
6. **4 Maestro flows** (`maestro/*.yaml`): `demo-spine-en.yaml` / `demo-spine-ar.yaml` (onboard ->
   dashboard -> loan -> rate impact -> scenario, per In Scope item 1), `add-obligation.yaml`,
   `log-payment.yaml`, `erase-reset.yaml`. Written against current testIDs/copy and validated as
   syntactically correct YAML (Prettier-parsed), **never run against a device or emulator** — no
   Maestro CLI or Android tooling in this environment. Each file's header comment says so
   explicitly; treat them as a scripted starting point for the first real rehearsal, not proof the
   flows work.
7. **`docs/10-implementation/runbooks/demo-runbook.md`** and **`reset-checklist.md`**: the 5-minute
   demo script (with a "what to say" / "fallback if it breaks" column) and the pre-stage reset
   procedure, both explicitly marked as unrehearsed drafts pending the first physical run.
8. **Verification:** full local gate green on this session's final commit — `pnpm run typecheck`,
   `pnpm run lint` (`eslint . --max-warnings=0`), `pnpm run depcruise` (880 modules / 2,556
   dependencies, 0 violations), `pnpm run format:check` (scoped to touched files), and the mobile
   test suite: **84 suites / 486 tests passing**.

## Still open (needs the owner, physical hardware, or a funded account)

None of these can be closed from this environment. Listed in the phase doc's own Exit Criteria
order:

1. Maestro spine actually run, green, in EN **and** AR — the YAML exists but has never executed.
2. Demo script performed on a physical Android device: normal, airplane-mode, and Arabic runs,
   with recorded evidence.
3. Performance budget numbers (cold start ≤2.5s, scenario ≤300ms, dashboard jank-free) — not
   measurable without a device.
4. Security checklist items that need runtime evidence: gitleaks run against the real binary,
   `pnpm audit` reviewed, a release-build config diff against an actual EAS build, deep-link fuzz
   testing on-device (the allow-list module and its unit tests exist; an actual fuzz _campaign_
   against a running app has not happened).
5. Sentry receiving a real event from a preview build — needs a Sentry project + DSN
   (`EXPO_PUBLIC_SENTRY_DSN` is currently unset everywhere, so Sentry stays fully inert).
6. Preview APK built (`eas build -p android --profile preview`) and installed on two devices ≥48h
   before judging; `demo-v1` tag (needs owner approval); GitHub release with the APK attached
   (needs owner approval). None of this can happen without `eas login`/`eas init` against a real
   Expo account.
7. Accessibility pass with a real screen reader; Arabic native-quality review (RES-009); font-scale
   1.5× check — all need a device.
8. The rehearsal itself (script ×3, once airplane-mode, once Arabic) and the fallback recording.
9. Final documentation closing items that depend on the above: README final pass, STATUS.md closed
   out (this report updates STATUS.md's running notes but Phase 9 is not marked complete there),
   risk register re-score.

## Not part of this phase (pre-existing, unrelated)

- The GitHub Actions CI pipeline was removed entirely in a separate, prior change this session
  (account-level billing lock, unrelated to Phase 9) — not a Phase 9 concern, noted here only so
  its absence isn't mistaken for a Phase 9 gap.
- Phase 8.5's own remaining workstream/review items are tracked in its own phase doc, not
  duplicated here.

## Next Steps

Do not mark Phase 9 complete. When device access, an EAS account, and a Sentry project become
available: run the Maestro flows for real and fix whatever they surface, do the physical-device
rehearsals in the runbook, wire a real Sentry DSN and confirm a test event arrives, run
`eas login`/`eas init` and produce the actual preview APK, then close out the remaining checklist
items above before writing a follow-up completion report that supersedes this one.
