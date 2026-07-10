# Testing Strategy

**Stack (ADR-0011):** Vitest + fast-check for pure packages (`domain`, `finance-engine`, `demo-data`) · Jest (jest-expo) + React Native Testing Library for the app · Maestro for E2E on Android · pgTAP for RLS (P1).
**Philosophy:** the test pyramid is weighted where the product's risk lives — the finance engine and domain rules get the depth; UI gets targeted behavior tests; E2E covers the demo spine only.

## 1. Pyramid & budgets

| Layer | Tooling | Coverage target | What lives here |
|-------|---------|-----------------|-----------------|
| Engine + domain unit/property | Vitest, fast-check | **≥95% lines engine (CI gate)**; domain ~90% | All formulas vs vectors (TV-*), invariants INV-1..7, status derivation (BR-STAT), provenance rules (BR-PROV-001 conflict cases), Money/Rate VOs, zod schemas, error mapping |
| App unit | Jest | pragmatic | Services (with fake repos), mappers, insight rules (each FR-INS-001 rule: fires/dedups/why-line), formatters (money/date/RTL digits), i18n key coverage script |
| Component | Jest + RNTL | key components | Design-system primitives (incl. a11y labels + RTL), `Amount` provenance rendering (US-009 AC-1/3), forms validation, limited-view/refusal states |
| Integration | Jest + real SQLite (in-memory) | flows | Repo round-trips + migrations (NFR-REL-002), ImportService pipeline with demo provider, erase-all absence test, provider contract suite |
| E2E | Maestro | demo spine only | onboard→dashboard→loan→rate impact→scenario (EN + AR), add obligation, log payment, erase data |
| P1 | pgTAP, API tests | all tables | Cross-user RLS denial, consent gates, idempotency |

## 2. Financial verification (the part judges can challenge)
- Vector integrity rule: engine never sources its own expectations (`calculation-test-vectors.md`).
- `PENDING-FINANCE` vectors block milestone M3 completion (mvp-scope DoD) — teammate spreadsheet sign-off is a *test artifact*, committed with `reviewedBy`.
- Property tests run in CI with fixed seeds + a nightly/local unfixed-seed mode; minimized counterexamples become permanent vectors (ratchet).
- Determinism (INV-5) tested by hash comparison across double runs.

## 3. Test conventions
- Fixtures only from `packages/demo-data` builders — no hand-rolled entity literals in tests (one vocabulary).
- Tests colocated: `__tests__/` per feature; packages use `src/**/*.test.ts`.
- No snapshot tests of whole screens (brittle, low signal — CON-09); RNTL assertions target behavior (text, a11y, navigation calls).
- Every bug fix lands with a regression test (Definition of Done).
- Test names state the rule: `it('BR-OBL-002: rejects overlapping rate periods')` — traceability grep-able.

## 4. RTL & localization checks
- Automated: i18n key coverage (no missing AR keys), lint bans literal JSX strings + left/right styles.
- Manual gate per milestone: AR walkthrough of new screens on device (checklist in CONTRIBUTING).
- Maestro runs the demo spine in Arabic before demo freeze.

## 5. What we deliberately don't test (documented so nobody adds it "for coverage")
Expo/React Navigation internals, Drizzle query building (covered by integration round-trips), pixel-perfect visual regression (no infrastructure for it; revisit post-hackathon), third-party UI behavior.
