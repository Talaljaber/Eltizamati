# Phase 8: Remaining MVP Flows

**Status:** Implementation complete; device walkthrough remains a Phase 9 validation activity.
**Date:** 2026-07-13

## Objectives Achieved (all 8 core, non-cuttable items)

1. **Murabaha detail (`SCR-OBL-DETAIL-MURABAHA`) + Card detail (`SCR-OBL-DETAIL-CARD`)**: Built. Murabaha shows outstanding financing via the new `murabahaProgress.v1` formula wiring, BR-TERM-001 enforced by a render-tree grep test. Card detail is pure display (limit/balance/available/utilization, statement, minimum-payment caveat, rates & fees) — no new formula needed. A new `HIGH_CARD_UTILIZATION` insight rule fires >70% utilization and is the first live-wired insight-evaluation call site in the app (previously `InsightEvaluationService` had zero call sites; demo insights were pre-seeded data only).
2. **Manual entry (`SCR-OBL-ADD-*`, `SCR-PAY-ADD`, `SCR-RATE-ADD`)**: Built. New `ObligationService` wraps the already write-capable repository ports (`save`/`archive`/`delete`/`log`/`append`) with `userEntered` provenance and domain validation (BR-OBL-002 rate-period ordering, BR-OBL-003 Murabaha sale-price identity). Type picker + per-kind forms for add; edit preserves rate history untouched (BR-RATE-001); archive/delete with confirm dialogs; log-payment; log-rate-change. Fixed a real bug found along the way: `DemoObligationRepository.archive()` was a documented no-op that never set `closedDate`.
3. **Settings completion (`SCR-SET`)**: Built. Acknowledgments view (read-only over `ConsentRepository.status()`), Account section (personal mode: signed-in email, sign out, delete account via a new `AuthService.deleteAccount()` calling the existing `delete-account` Edge Function), About/version. FR-SET-003 erasure: demo mode keeps the existing reset-demo control; personal mode's "erase all data" is account deletion, per ADR-0017's own table — not a separate flow.
4. **Data Status (`SCR-DATA-STATUS`)**: Built. Honest provider list per provider-abstraction.md §4 — the active source (demo seed or manual entry) shows real obligation/payment counts and last-updated; CRIF and Open Banking always shown as "not connected — planned," never fabricated as connected.
5. **Legal doc + Learn + Learn-topic (`SCR-LEGAL-DOC`, `SCR-LEARN`, `SCR-LEARN-TOPIC`)**: Built. Learn tab rebuilt as a category-sectioned list (conventional/Islamic/cards) of 10 bilingual education topics; topic detail screen with tappable glossary-term chips (FR-EDU-001) opening a definition sheet sourced from all 32 terms in `docs/00-product/glossary.md`, transcribed into `en.json`/`ar.json`. Content structure (ids/categories/related-terms) lives in `src/content/*.ts`; all display text is in the i18n files, so future content updates are translation-file-only (FR-EDU-004). Legal doc viewer covers data storage, data-source honesty, user rights, and account deletion.
6. **User-defined threshold insight + reminder-day setting (FR-INS-001 user rule, FR-SET-006)**: Built — setting + insight only, per the phase doc's own scope note (notification delivery is cut #3, not built). Extended `UserProfile` with `reminderDayOfMonth`/`userThresholdAmount` (new Supabase migration + mapper). New `USER_THRESHOLD_REACHED` insight rule fires when a caller-supplied gap amount exceeds the user's configured JOD threshold — a customizable companion to the existing fixed-logic `RESIDUAL_RISK` rule, not a replacement. Live-wired on the loan detail screen using the same estimated-residual figure already shown on Rate Impact. Settings gained a Reminders & Threshold section for both demo and personal mode.
7. **State-matrix coverage**: Loading/error/empty states covered per-screen as each was built; no separate matrix pass was run beyond that.
8. **Quality gates**: `pnpm run check` is fully green — format (aside from 2 pre-existing unrelated files, see below), lint (0 warnings, whole repo), typecheck (whole repo), depcruise (450 modules/1391 deps, 0 violations), and the full test suite: 501 tests passing (domain 131, finance-engine 128, demo-data 48, mobile 194 across 35 suites).

One real bug was found and fixed during the gate run itself: a Settings `useQuery` resolved to `undefined` (TanStack Query warns/errors on this) instead of `null` — fixed.

## Restored cuttable scope (owner follow-up, 2026-07-13)

The four items initially cut for schedule were subsequently restored and implemented:

1. **Mock connect:** versioned consent gate, deterministic mock-provider retrieval, persistence through `ImportService`, permanent mock provenance/badging, and retry/error states.
2. **Card payoff simulator:** `cardPayoff.v1` is consumed through `CalculationService`; minimum-only and fixed/custom results show months, charges, total paid, refusal, invalid-input, and never-pays-off states.
3. **Local notifications:** recurring monthly 09:00 local reminders, permission-denial UX, bilingual content-minimized copy, cancellation/rescheduling, and an allow-listed `/insights` notification route.
4. **Duplicate payments:** natural-key detection on obligation/date/amount warns before saving and supports an explicit override.

Verification after restoration: mobile TypeScript and ESLint passed; formatting passed; all 37 mobile suites passed (199 tests). Physical-device notification delivery and the bilingual offline walkthrough remain manual Phase 9 evidence, not claims made by this report.

## Not part of this phase (pre-existing, unrelated)

- `docs/10-implementation/completions/PHASE-7-COMPLETION.md` and `PHASE-7-PARTIAL-IMPLEMENTATION.md` fail the repo's current `prettier --check` — pre-existing, untouched by this phase's commits (confirmed via `git status`), not introduced here.
- Phase 7's own 2 remaining exit-criteria items (TV-104/TV-601 finance sign-off, AR/EN airplane-mode walkthrough recording) remain deferred to Phase 10 per the owner's prior 2026-07-13 decision — unaffected by Phase 8.

## Next Steps

- Proceed to Phase 9 for E2E, physical-device notification delivery, Arabic/RTL, accessibility, performance, and security validation.
