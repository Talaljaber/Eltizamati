# Phase 6 Completion Report

> **2026-07-12 remediation note:** an independent post-merge audit found this
> report's original claims did not hold up: the merged code did not
> typecheck (`pnpm run check` was never actually green — 11 real `tsc`
> errors in `calculation-run.contract.ts`), the registry's `execute(inputs:
any)` gave zero compile-time protection against a formula/input mismatch,
> and — most seriously — `CalculationService` cast `Money`/`Rate`/
> `Percentage` values (which store their amount in JS `#` private fields)
> directly to `CanonicalJsonValue`, so **financially distinct
> `CalculationRun` inputs hashed identically** (proven: principal 1,000 JOD
> @10% and 2,000 JOD @20% produced the same SHA-256 `inputsHash`). There was
> also no test — unit or integration — for the Supabase `CalculationRun`
> repository at all. All of the above have since been fixed (see §6) and
> this report's numbers below are updated to match. The original,
> unqualified "✅ PASS" / "100%" / "exhaustive coverage" claims in this
> report were not accurate at merge time; do not trust historical copies of
> this file from before 2026-07-12.

## 1. Formulas Exposed

The `finance-engine` API exposes the following exact formulas via its registry and core exports:

- `amortization` (v1)
- `variableProjection` (v1)
- `residualDetection` (v1)
- `extraPaymentScenario` (v1)
- `allocationEstimate` (v1)
- `cardPayoff` (v1)
- `aggregates` (v1)
- `murabahaProgress` (v1)

## 2. Test Vector Pass Matrix

All analytical test vectors pass against the core engine and orchestrating `CalculationService`:

| Family     | Formula              | Pass Status               | Notes                                                                                                                                                                                                                                                                     |
| ---------- | -------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TV-1xx** | `amortization`       | ✅ PASS (5/5)             | Analytical anchors                                                                                                                                                                                                                                                        |
| **TV-2xx** | `variableProjection` | ✅ PASS (5/5)             | Includes `recalculated` & `unchanged`                                                                                                                                                                                                                                     |
| **TV-3xx** | `demo-seed-vectors`  | ⚠ WIRED / PENDING-FINANCE | Structurally verified against the real demo-seed fixture (schedule shape, residual > threshold, extra-payment scenario saves months/cost) — **exact numeric expected values are not yet finance-team signed off**, per `calculation-test-vectors.md`. Not a numeric PASS. |
| **TV-4xx** | `allocationEstimate` | ✅ PASS (3/3)             | Cost estimates                                                                                                                                                                                                                                                            |
| **TV-5xx** | `murabahaProgress`   | ✅ PASS (2/2)             | Subtraction exactness                                                                                                                                                                                                                                                     |
| **TV-6xx** | `cardPayoff`         | ✅ PASS (3/3)             | Includes `neverPaysOff` guard                                                                                                                                                                                                                                             |
| **TV-7xx** | `aggregates`         | ✅ PASS (2/2)             | Portfolio aggregate handling                                                                                                                                                                                                                                              |

## 3. Property Tests (Invariants)

All fast-check invariant tests pass seamlessly across generator limits (rates 0–30%, 1–480 months).

| Invariant | Test                                       | Status  |
| --------- | ------------------------------------------ | ------- |
| **INV-1** | Balances ≥ 0; no negative payments         | ✅ PASS |
| **INV-2** | P + C = M (within tolerance)               | ✅ PASS |
| **INV-3** | Higher payment ⇒ monotonic payoff behavior | ✅ PASS |
| **INV-4** | Zero rate ⇒ principal paid exactly         | ✅ PASS |
| **INV-5** | Determinism (Input hash yields identical)  | ✅ PASS |
| **INV-6** | Sum of schedule P = Original P (± CONV-5)  | ✅ PASS |
| **INV-7** | Murabaha arithmetic exactness              | ✅ PASS |

## 4. Coverage Result

The `finance-engine` package's own `vitest --coverage` run (2026-07-12, post-remediation) reports:

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   99.89 |    95.43 |     100 |   99.89 |
```

This clears the configured gate (lines/statements/functions ≥95%, branches ≥90%). It is **not** exhaustive across the whole persistence path — this number covers `packages/finance-engine` only. `CalculationService`, the demo `CalculationRunRepository`, and the Supabase `CalculationRunRepository`/mapper are each in separate packages with their own, separately-run test suites (see §6); no single coverage figure spans all of them, and none previously claimed to.

## 5. Mobile Integration

`CalculationService` orchestrates formula execution and persistence via `CalculationRunRepository`. As of the 2026-07-12 remediation it correctly serializes `Money`/`Rate`/`Percentage` through `toCanonicalJsonValue()` before hashing/persisting (the original merge cast them directly to `CanonicalJsonValue`, which silently discarded every JS `#`-private-field amount — see the note at the top of this document). `runCalculation<K extends FormulaId>` now ties the `inputs` parameter's type to the specific formula via `FormulaInput<K>`, so a formula/input mismatch is a compile error, not a runtime risk.

## 6. Persistence Evidence (added 2026-07-12)

- **Domain package:** 119/119 tests pass (`pnpm --filter @eltizamati/domain test`), including new regression coverage for `toCanonicalJsonValue` (distinct Money/Rate inputs never collide to the same hash; key-order-independent hashing; rejection of unsupported class instances / `undefined`).
- **Demo `CalculationRunRepository`:** covered by `runCalculationRunContractTests` (scope matching, latest-by-`calculatedAt` ordering, aggregate-vs-scoped isolation) — passes.
- **Supabase `CalculationRunRepository`:** previously had **no test at all**, unit or integration. The shared `runCalculationRunContractTests` suite was imported into `personal-mode.integration.test.ts` but never invoked, and is not directly reusable against Supabase as-is — `calculation_runs` has a real `(obligation_id, user_id)` foreign key onto `obligations`, so the contract suite's synthetic obligation IDs would fail on insert. Added real, live-Supabase round-trip coverage instead (`pnpm run test:integration`, run against a local Docker Supabase stack, 2026-07-12): successful-outcome persist + read-back with deep equality on `inputsSnapshot`/`outcome`/`assumptions`, refused-outcome persist + read-back (missing fields + partial snapshot preserved), and scope isolation (an obligation-scoped `latestFor` never returns the aggregate/unscoped run). All 3 integration tests pass.
- **Formula ID naming:** the registry, `CalculationService`, and the demo/contract tests consistently use the plain key (`'amortization'`, `'aggregates'`, etc.) as the persisted `formulaId`, with `formulaVersion` as a separate integer field. The one exception found was `personal-mode.integration.test.ts`, which used the doc-comment notation `'amortization.v1'` as if it were the real persisted value — corrected to `'amortization'` during this remediation.
