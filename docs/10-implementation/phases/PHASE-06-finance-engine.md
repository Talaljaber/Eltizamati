# Phase 6 — Finance Engine and Financial Validation

## Status

Planned

## Objective

Every MVP formula is implemented as a pure, deterministic function with explicit `asOf`, decimal arithmetic, spec'd rounding, assumptions/confidence/refusal handling — verified by analytical vectors, property-test invariants (INV-1..7), and a **real** ≥95% coverage gate — and calculation runs persist through the repository layer.

## Why This Phase Exists

The engine is the product's defensibility ("every number can defend itself") and its highest-risk work. It runs on Track B: pure functions over Phase-2 domain types — no UI, no Supabase dependency — so it may start in parallel with Phases 3–5 once Phase 2 closes (formula work may even begin during Phase 5; CalculationRun persistence integration lands once 4/5 repositories exist).

## Preconditions

Phase 2 complete (final domain types incl. `CalculationRun`, `Percentage`, `Confidence`). For the persistence-integration slice: Phase 4 or 5 repositories available. Finance teammates engaged for vector sign-off (TV families currently `PENDING-FINANCE` block *exit*, not start).

## In Scope

1. **Engine contracts:** calculation input/result types; explicit `asOf: LocalDate` on every entry point; no clock/network/randomness; canonical input serialization + `inputsHash`; assumptions list + confidence per result; **refusal** (`Refused { missing: FieldRef[], partial? }`) per BR-CALC-016.
2. **Formulas (all against financial-calculation-spec.md §4, registry-versioned):**
   - `amortization.v1` (level payment, i=0 branch, final-period rounding absorption BR-CALC-008)
   - `variableProjection.v1` (installmentPolicy recalculated/unchanged/explicit; negative-amortization flagging BR-CALC-011; `projectedResidualAtMaturity`)
   - `residualDetection.v1` (threshold + cause classification BR-CALC-012/013)
   - `allocationEstimate.v1` (BR-CALC-010)
   - `murabahaProgress.v1` (arithmetic only, BR-CALC-020, INV-7 exactness)
   - `aggregates.v1` (FR-CALC-006; missing-excluded-and-named BR-PROV-005; mixed-provenance flag BR-PROV-004)
   - `extraPaymentScenario.v1` (INV-3)
   - `cardPayoff.v1` (charge cap 600 periods; `neverPaysOff`) — **MVP-conditional with its UI (cut #2), but cheap here; implement unless time-cut is invoked**
3. **Rounding/decimal rules:** decimal.js precision, HALF_UP at 3dp boundaries only (BR-CALC-003/004), tolerances CONV-5.
4. **Vectors:** `packages/finance-engine/vectors/` JSON per calculation-test-vectors.md format; TV-1xx/2xx/4xx/5xx/7xx analytical families implemented and passing; TV-30x/TV-104/TV-203/TV-601 wired and marked pending until finance sign-off; **vector integrity rule: expectations never engine-generated.**
5. **Property tests (fast-check):** INV-1..7 with fixed CI seeds + documented unfixed-seed mode; minimized counterexamples become permanent vectors.
6. **Coverage gate:** ≥95% lines enforced in CI as a real gate over real formula code.
7. **CalculationRun persistence integration:** application-service slice invoking the engine and persisting runs (FR-CALC-005) through the Phase-4/5 repositories; consistency-check notice (BR-CALC-017).
8. **Insight rule primitives** (pure rule evaluation for RATE_INCREASED / INSTALLMENT_UNCHANGED_AFTER_INCREASE / RESIDUAL_RISK with dedup keys) — the *rules*; their center UI is Phase 7.

## Out of Scope

All screens (Phase 7 renders this) · notifications/threshold-settings UI (Phase 8) · Islamic early-settlement simulation, day-count proration, fee capitalization, penalty interest, payment holidays, multi-currency (spec §10 never-MVP) · SQLite.

## Architecture Decisions Applied

ADR-0007 (isolation, coverage gate) · ADR-0017 (persistence via repositories) · financial-calculation-spec.md (authoritative) · calculation-test-vectors.md · AI_AGENT_RULES #5/6/7 (Money/Rate only; engine-only math; version+vector+ADR-note on formula change).

## Required Implementation Work

- **Domain/engine:** everything above in `packages/finance-engine/src`; registry entries gain executable implementations (metadata already exists).
- **Application services:** `CalculationService` (`projectionFor`, `scenario`, `explain`, `aggregates`) persisting runs.
- **Testing:** vectors, property tests, refusal-path tests, determinism (double-run hash equality), coverage.
- **Documentation:** mark spec sections implemented; record any spec ambiguity as `DOC-ISSUE:`; STATUS.md; completion report.

## Expected Files and Packages

`packages/finance-engine/src/formulas/*.ts` · `src/refusal.ts`, `src/hashing.ts` (suggested) · `packages/finance-engine/vectors/*.json` · `packages/finance-engine/src/**/*.test.ts` + `*.property.test.ts` · `apps/mobile/src/services/calculation-service.ts`. (Suggested paths.)

## Public Interfaces Produced

Typed engine API (inputs → `Result<CalculationOutcome | Refused>`) · CalculationService · insight-rule evaluators — everything Phase 7 renders.

## Testing Requirements

All analytical vector families green · INV-1..7 property suites green · every refusal condition tested · ≥95% line coverage enforced · determinism test · demo-data fixtures as the only test-data source.

## Verification Commands

```
pnpm --filter @eltizamati/finance-engine test   # runs with --coverage; gate enforced
pnpm run check
```

## Manual Validation

Finance-teammate spreadsheet cross-check workflow started for TV-30x (sign-off itself gates Phase 7 exit, not Phase 6 — but the handoff package to finance must leave this phase).

## Exit Criteria

1. All 8 formulas implemented, versioned, registry-complete with executable bodies.
2. TV-1xx/2xx/4xx/5xx/7xx passing; TV-6xx passing if cardPayoff implemented; pending families wired and clearly marked.
3. INV-1..7 property tests green in CI.
4. Coverage gate ≥95% enforced and passing over real formula code.
5. Refusal behavior: engine refuses (never invents) on each spec'd missing-input case, with tests.
6. CalculationRuns persist through repositories with `inputsHash`/`asOf`/confidence/assumptions.
7. `pnpm check` + CI green; completion report filed.

## Exit Demo

Reviewer picks any vector JSON, reads its expected value, runs the suite, and sees it pass; runs the property suite; asks "what if APR is missing?" and sees a typed refusal, not a number.

## Required Documentation Updates

`financial-calculation-spec.md` (implemented markers/ambiguity fixes) · `calculation-test-vectors.md` (statuses) · STATUS.md · completion report.

## Known Risks

- Highest-value, highest-subtlety code in the project (RISK-001). Mitigation is the whole phase design: vectors-first, invariants, refusal, coverage.
- `PENDING-FINANCE` vectors may stall — escalate via STATUS.md pending-decisions early; analytical families keep the phase closable.

## Cuttable Work

`cardPayoff.v1` implementation may defer to Phase 8 alongside its UI if cut #2 is invoked — record the decision.

## Handoff to Next Phase

Phase 7 may rely on: the full engine API, CalculationService, insight-rule evaluators, passing vectors, refusal semantics.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-6-COMPLETION.md` — per-formula status, vector pass matrix (incl. pending list), coverage report, property-test seeds, `DOC-ISSUE:` log.
