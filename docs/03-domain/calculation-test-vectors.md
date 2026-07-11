# Calculation Test Vectors

**Format & process:** vectors are JSON files in `packages/finance-engine/vectors/`, loaded by the test suite. Each vector: `id, formulaId, version, description, inputs, asOf, expected, tolerance, source ('analytical' | 'finance-team' | 'bank-schedule'), reviewedBy`.
**`asOf` field (required):** all vectors carry an explicit `asOf: LocalDate` so the engine never reads the system clock and tests are reproducible on any date. For TV-30x (demo-seed vectors), `asOf` equals the fixed `demoDate` constant declared in `packages/demo-data/src/constants.ts` — finance teammates **must use this same date** in their spreadsheets. Changing `demoDate` is a breaking change requiring a vector version bump and new teammate sign-off.
**Integrity rule:** the engine must never be the source of its own expected values. Expected values come from (a) closed-form analytical results, or (b) independent spreadsheet computation by finance teammates, or (c) real bank schedules (RES-004). Vectors marked `PENDING-FINANCE` below ship as structure with expectations to be filled by teammates before the engine's caveat can be softened.

## Family TV-1xx — `amortization.v1` analytical anchors (source: analytical)

| ID     | Inputs                                   | Expected                                                                      | Why it's trustworthy                            |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| TV-101 | P=12,000 JOD, r=0%, n=24                 | M=500.000 exactly; total cost 0; schedule closes to 0                         | INV-4 closed form                               |
| TV-102 | P=10,000 JOD, r=12%, n=1                 | Single payment 10,100.000 (10,000 + 1 month at 1%)                            | One-period closed form                          |
| TV-103 | P=1,000 JOD, r=12%, n=12                 | M=88.849 (HALF_UP 3dp); textbook annuity value                                | Standard textbook case: `1000·0.01/(1−1.01⁻¹²)` |
| TV-104 | P=20,000 JOD, r=7.5%, n=84               | `PENDING-FINANCE` (M ≈ 307 JOD region; exact value from teammate spreadsheet) | Demo seed loan pre-reprice                      |
| TV-105 | Rounding-drift case: P=1,000, r=7%, n=36 | Final payment absorbs drift; schedule closes to exactly 0 (BR-CALC-008)       | Property + explicit final-period check          |

## Family TV-2xx — `variableProjection.v1`

| ID     | Scenario                                                      | Expected assertions                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-201 | TV-103 loan, rate 12%→12% "change" at month 6 (no-op reprice) | Schedule identical to TV-103 (regression guard)                                                                                                                                                                              |
| TV-202 | P=10,000, r=8%→10% at month 13 of 60, policy `recalculated`   | New installment from month 13 amortizes remaining balance over remaining 48 periods; maturity unchanged; residual = 0                                                                                                        |
| TV-203 | Same as TV-202, policy `unchanged`                            | Residual at maturity > 0; equals analytically-computed remaining balance after 60 periods at old installment (`PENDING-FINANCE` exact value); `residualDetection.v1` fires with cause `rateIncreaseWithUnchangedInstallment` |
| TV-204 | Rate _decrease_, policy `unchanged`                           | Loan closes early (payoff before maturity); residual = 0; INV-3 family check                                                                                                                                                 |
| TV-205 | Effective date mid-period (day 14)                            | Applied at next period boundary; assumption note `CONV-4` present in result                                                                                                                                                  |

## Family TV-3xx — Demo seed loan (⭐ the numbers judges will see; source: finance-team)

Seed: P=20,000 JOD, 84 months, start 2024-01-15, r=7.5% (months 1–14) → 9.25% (effective month 15), installment unchanged, 30 months elapsed at demo date, all installments paid on time.
**`asOf` for this family: `packages/demo-data/src/constants.ts → DEMO_DATE`** (a fixed `LocalDate` constant — **canonical value `2026-07-01`**; an earlier revision of this document said `2026-07-10`, which never matched the code and was corrected 2026-07-11 during the ADR-0017 reconciliation — no vector had been signed against either date, so nothing needs re-validation _yet_). Finance teammates use this exact date in their spreadsheets. Tests call `buildDemoSeed({ demoDate: DEMO_DATE })` before running the engine. **Changing `DEMO_DATE` later requires re-signing all TV-30x expected values** — no vector may be signed against an ambiguous date.

| ID     | Assertion                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-301 | Outstanding balance at month 30 (estimate) = `PENDING-FINANCE`                                                                              |
| TV-302 | Projected residual at maturity = `PENDING-FINANCE` (must exceed detection threshold — seed was chosen so it does)                           |
| TV-303 | "≈ X JOD less of each installment reduces principal" figure = `PENDING-FINANCE` (old vs new first-period principal share)                   |
| TV-304 | Scenario +50 JOD/month from month 31 ⇒ residual → `PENDING-FINANCE` (seed chosen so residual ≈ 0, months saved > 0) — the demo's money shot |
| TV-305 | Estimated added total cost from repricing = `PENDING-FINANCE`                                                                               |

**Gate:** M3 milestone (engine) is not "done" until TV-30x expectations are filled and passing — this is the hackathon's financial defensibility (Definition of Done link).

## Family TV-4xx — `allocationEstimate.v1` & payments

TV-401 unknown split mid-loan → cost = balance·i, labeled estimated · TV-402 overpayment beyond balance → overpayment state, no negative balance (INV-1) · TV-403 payment before a repricing boundary recomputes across periods (US-005 edge).

## Family TV-5xx — `murabahaProgress.v1` (source: analytical — subtraction only)

TV-501 seed: total 18,600, 22 payments of 310 ⇒ paid 6,820.000, outstanding 11,780.000, progress 36.67% (2dp display) — INV-7 exactness · TV-502 completed financing ⇒ outstanding 0, status `completed`.

## Family TV-6xx — `cardPayoff.v1` (stretch)

TV-601 balance 2,350, APR 24%, min 3% floor 10 ⇒ months + total charges `PENDING-FINANCE`; monotonicity vs fixed-100 path (INV-3) · TV-602 payment 40 < first charge 47 ⇒ `neverPaysOff` · TV-603 APR 0 ⇒ months = ceil(balance/payment), charges 0 (INV-4).

## Family TV-7xx — `aggregates.v1`

TV-701 demo seed set ⇒ total outstanding = loan est. + murabaha official + card official, labeled `includes estimates` (BR-PROV-004) · TV-702 one obligation with no balance ⇒ excluded + named (BR-PROV-005).

## Property-test charter (fast-check, runs alongside vectors)

Generators: principal 100–1,000,000 JOD (3dp), rate 0–30%, term 1–480, up to 5 rate periods, payment sequences with jitter. Properties: INV-1…INV-7 (see calc spec §8). Seeded runs for reproducibility; failures minimized and committed as new fixed vectors (ratchet).
