# Phase 5 — Demo Mode and the First Data-Driven Experience

## Status

Planned

## Objective

A fresh install can onboard (language → intro → disclaimer → mode selection), load the three canonical demo obligations from bundled deterministic builders into in-memory repositories, and browse a populated bilingual Home dashboard and Obligations list — **fully offline, no auth, no Supabase, resettable.**

## Why This Phase Exists

This is the first vertical slice users/judges can see, and the foundation of the critical demo path (IMPLEMENTATION_PLAN §7). It runs on Track B: it needs Phase 2 (domain + repository interfaces) but **not** Phases 3–4 — demo mode has zero Supabase dependency (ADR-0017 §2), so it may proceed in parallel with the backend track.

## Preconditions

Phase 2 complete. If Phase 4 has produced the repository contract-test suite, demo repositories must pass it; if Phase 4 hasn't started, this phase writes the contract suite first (coordinate via STATUS.md to avoid duplication).

## In Scope

1. **Seed builders** (`packages/demo-data`): `buildDemoLoan/buildDemoMurabaha/buildDemoCard/buildDemoSeed({ demoDate })` producing the canonical mvp-scope §4 content — 20,000 JOD variable loan (7.5%→9.25% at month 15, installment unchanged, 30 months elapsed, on-time payment history, rate periods), Murabaha (15,000+3,600=18,600, 60m, 22×310 paid), card (4,000 limit / 2,350 balance / 3% min floor 10 / 24% APR) — all with `demo` provenance + `seedVersion`, anchored to `DEMO_DATE = 2026-07-01`. Pre-seeded insights per seed-demo-data.md §2.4. Fixture vocabulary (`aLoan({overrides})`…) for tests.
2. **Demo repositories:** in-memory implementations of every Phase-2 repository interface; `DemoSeedProvider` + `ImportService` populate them through the real import pipeline (ADR-0009 — the demo rehearses the real path); **never writes to Supabase**.
3. **Reset demo** (FR-SET-005): re-run builders; deterministic result.
4. **Onboarding flow:** SCR-ONB-LANG (uses Phase-1 persisted locale) → SCR-ONB-INTRO → SCR-ONB-CONSENT (local acknowledgment, versioned) → SCR-ONB-DATA (demo / manual / account step per FR-ONB-006 — account path routes to Phase-4 screens if present, else honestly disabled "coming in this build" without faking).
5. **Mode selection & demo banner:** `dataMode` in key-value storage; persistent demo banner (FR-ONB-005); demo/personal exclusivity.
6. **SCR-HOME:** populated dashboard — totals (via `aggregates.v1` if Phase 6 has landed it; otherwise a clearly-marked domain-service placeholder computing nothing in UI and refusing rather than faking — no financial math in components either way), status chips (`deriveObligationStatus` — real from Phase 2), next payment, insights preview, obligation cards, demo banner; all states (L/E/ER/D/limited).
7. **SCR-OBL-LIST:** cards, filters, empty states.
8. **Initial obligation detail:** minimal read-only detail route `/obligation/[id]` showing stored fields with provenance badges (full subtype-rich details are Phases 7–8) — enough that tapping a card isn't a dead end.
9. **Design-system additions just-in-time:** `StatusChip`, `ProvenanceBadge`, `EmptyState`, `Skeleton`, `ListRow`, `DemoBanner` (with RNTL tests per DS-4).
10. **Offline verification:** the whole flow with all networking disabled.

## Out of Scope

Supabase anything · finance formula implementations (Phase 6) · rate impact/scenario/explanation screens (Phase 7) · manual entry forms (Phase 8) · Murabaha/card rich detail (Phase 8) · SQLite (never).

## Architecture Decisions Applied

ADR-0017 §2 (demo mode contract) · ADR-0009 (provider/ImportService) · seed-demo-data.md · mvp-scope §4/§5a · information-architecture.md · design-system.md.

## Required Implementation Work

- **Domain/demo-data:** builders + fixtures + tests (values hand-verifiable; TV-30x coupling via `DEMO_DATE`).
- **Application/state:** ImportService, demo repositories, query hooks over them, `dataMode` store (Zustand permitted per ADR-0004).
- **Mobile UI:** onboarding screens, Home, Obligations list, minimal detail, banner — EN+AR, logical styles, all states.
- **Testing:** below.
- **Documentation:** STATUS.md; screen-inventory state-matrix confirmations; completion report.

## Expected Files and Packages

`packages/demo-data/src/{builders,fixtures}.ts` · `apps/mobile/src/services/repositories/demo/*.ts` · `apps/mobile/src/services/import-service.ts` · `apps/mobile/src/features/{onboarding,home,obligations}/` · `apps/mobile/app/onboarding/*`, `(tabs)/index.tsx`, `(tabs)/obligations/*`, `app/obligation/[id].tsx` · new primitives under `core/design-system/`. (Suggested paths.)

## Public Interfaces Produced

Working demo repository family + ImportService · seed builders/fixtures (the test vocabulary for all later phases) · onboarding/mode infrastructure · list/detail navigation shell Phases 7–8 extend.

## Testing Requirements

- Builders: deterministic output for fixed `demoDate` (double-run equality); values match mvp-scope §4.
- Demo repositories: pass the shared repository contract suite.
- ImportService pipeline integration test (provider → validate → map → persist → events).
- RNTL: onboarding steps, Home states (incl. empty + demo banner), list; new primitives with a11y assertions.
- i18n key coverage for all new namespaces (EN+AR).

## Verification Commands

```
pnpm run check
pnpm --filter @eltizamati/demo-data test
pnpm run test:app
```

## Manual Validation

**Airplane-mode walkthrough (mandatory):** fresh state → onboarding → demo dashboard → browse all three obligations → reset demo → repeat — with networking disabled; evidence recorded. Arabic walkthrough of the same flow. (No physical-device claim unless one was actually used — Metro/emulator evidence labeled as such.)

## Exit Criteria

1. Fresh install reaches a populated bilingual dashboard via onboarding in demo mode with zero network.
2. All three canonical obligations render with correct values, provenance badges, and status chips.
3. Reset-demo restores exact deterministic state.
4. Demo repositories pass the contract suite; ImportService test green.
5. No Supabase import anywhere in the demo path (depcruise/grep evidence).
6. All states implemented per matrix; EN+AR complete; `pnpm check` + CI green.
7. Completion report filed.

## Exit Demo

Airplane mode on: onboard in Arabic → populated dashboard with demo banner → open the loan → reset demo. Reviewer sees identical numbers on every run.

## Required Documentation Updates

STATUS.md · seed-demo-data.md (implemented status) · completion report.

## Known Risks

- Aggregate figures before Phase 6: must refuse/placeholder honestly rather than compute in UI — reviewers should see "pending engine" rather than invented sums (BR-CALC-016 spirit).
- In-memory state loss on process death: acceptable (ADR-0017); reset-demo is the recovery; note it in the demo runbook.

## Cuttable Work

The minimal obligation-detail route may ship fields-only (no derived figures) — it will anyway until Phase 6/7. Nothing else.

## Handoff to Next Phase

Phases 6–7 may rely on: builders/fixtures as the only test-data vocabulary, populated demo repositories, navigation shell, list/detail routes, new primitives.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-5-COMPLETION.md` — airplane-mode evidence, AR walkthrough evidence, determinism proof, contract-suite results.
