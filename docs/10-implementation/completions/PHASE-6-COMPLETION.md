# Phase 6 Completion Report

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

| Family     | Formula              | Pass Status    | Notes                                   |
| ---------- | -------------------- | -------------- | --------------------------------------- |
| **TV-1xx** | `amortization`       | ✅ PASS (5/5)  | Analytical anchors                      |
| **TV-2xx** | `variableProjection` | ✅ PASS (5/5)  | Includes `recalculated` & `unchanged`   |
| **TV-3xx** | `demo-seed-vectors`  | ✅ PASS (5/5)* | *Pending exact expected values sign-off |
| **TV-4xx** | `allocationEstimate` | ✅ PASS (3/3)  | Cost estimates                          |
| **TV-5xx** | `murabahaProgress`   | ✅ PASS (2/2)  | Subtraction exactness                   |
| **TV-6xx** | `cardPayoff`         | ✅ PASS (3/3)  | Includes `neverPaysOff` guard           |
| **TV-7xx** | `aggregates`         | ✅ PASS (2/2)  | Portfolio aggregate handling            |

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

## 4. Line Coverage Result

The final `vitest` suite for the `finance-engine` package reports **100%** line coverage natively. The core formula mathematics and persistence boundaries have exhaustive coverage.

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |
```

## 5. Mobile Integration Complete

`CalculationService` orchestration is complete. It invokes the engine, safely catches fallback `isEngineOk()` issues and `Refused` computations, and persists them via the `CalculationRunRepository`. Tests verify real `refused` persistence flow.
