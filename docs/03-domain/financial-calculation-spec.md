# Financial Calculation Specification

**Home in code:** `packages/finance-engine` (pure TypeScript; imports only `packages/domain`; no I/O, no Date.now(), no randomness — fully deterministic).
**Honesty boundary (read first):** everything below the "Conventions" section is a **generic mathematical model**, not a reproduction of any Jordanian institution's contract math (GAP-01). Every engine output is therefore an _estimate_ unless every input is official **and** the applicable convention is confirmed (which MVP cannot confirm). The engine encodes this as confidence + assumption notes on every result. Do not remove the estimate framing without RES-004 validation.

## 1. Number handling (BR-CALC-002…005)

| Rule        | Spec                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-CALC-002 | All money math via `Money` (decimal.js under the hood, 28-digit precision context). Binary floats never touch monetary values (non-negotiable §35.4).                                                       |
| BR-CALC-003 | Intermediate calculations keep full precision; **rounding happens only at defined boundaries**: (a) final per-period schedule values, (b) displayed aggregates. Never round-then-continue inside a formula. |
| BR-CALC-004 | Rounding mode: `HALF_UP` to 3 dp (JOD) at boundaries (ASM-009). Mode + dp are per-formula constants recorded in the formula registry, changeable only with an ADR + new formula version.                    |
| BR-CALC-005 | Rates stored/carried at ≥ 6 significant decimals; period-rate conversion happens inside the engine only.                                                                                                    |
| BR-CALC-001 | Financial dates are civil `LocalDate`s; no timezones in schedule math. "Today" is an explicit input parameter (`asOf`), never read from the clock inside the engine.                                        |

## 2. Modeling conventions (generic; each is an assumption note attached to results)

| ID     | Convention                                                                                                                                                                                                    | Basis                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CONV-1 | Payment frequency: monthly, in arrears (end of period).                                                                                                                                                       | ASM-008                                                                     |
| CONV-2 | Periodic rate = nominal annual rate ÷ 12 (monthly compounding of the nominal rate).                                                                                                                           | ASM-008                                                                     |
| CONV-3 | Day count: period-based (each month = one period); no intra-period day-count proration in MVP. Rate changes take effect at the **next period boundary** on/after the effective date (CONV-4).                 | ASM-008; avoids fabricating a day-count convention we can't verify (GAP-01) |
| CONV-4 | Rate effective-date handling: applied from the first schedule period whose start ≥ effectiveFrom. Mid-period proration is out of MVP scope; assumption note emitted whenever an effective date is mid-period. | Honesty over fake precision                                                 |
| CONV-5 | Rounding tolerance for validation checks: 0.005 JOD per period, 0.5 JOD per schedule.                                                                                                                         | Engineering judgment                                                        |
| CONV-6 | Overdue grace window: 3 days after due date before `overdue`.                                                                                                                                                 | ASM; UX kindness, not contract claim                                        |
| CONV-7 | "Due soon" horizon: 7 days.                                                                                                                                                                                   | Product choice                                                              |
| CONV-8 | Fees: MVP models fees only as user-entered one-off additions to balance (loan) or line items (card); no capitalization logic invented. Unknown fees ⇒ assumption note + confidence cap at `medium`.           | GAP-01                                                                      |

## 3. Formula registry & versioning (BR-CALC-006/007)

- Every calculation has a `formulaId` + integer `version` in `finance-engine/src/registry.ts`: e.g. `amortization.v1`, `variableProjection.v1`, `residualDetection.v1`, `extraPaymentScenario.v1`, `cardPayoff.v1`, `aggregates.v1`, `allocationEstimate.v1`.
- Changing math ⇒ **new version**, updated test vectors, and an ADR note; old versions stay callable so persisted `CalculationRun`s remain reproducible (FR-CALC-005).
- Each run persists: formulaId, version, canonicalized input snapshot + hash, result, confidence, assumption notes, `asOf`, engine package version.

## 4. Formulas

### 4.1 `amortization.v1` — level-payment schedule (fixed rate)

Inputs: principal `P`, annual rate `r`, term `n` (months), startDate, installment override optional.

- Periodic rate `i = r/12` (CONV-2). If `i = 0`: payment `= P/n` (BR: zero rate ⇒ zero cost, INV-4).
- Level payment: `M = P·i / (1 − (1+i)^−n)` — computed at full precision, rounded per BR-CALC-004; **final period absorbs cumulative rounding drift** so the schedule closes to exactly 0 (BR-CALC-008).
- Per period: `cost_t = balance_{t−1}·i`; `principal_t = M − cost_t`; `balance_t = balance_{t−1} − principal_t`.
- Output: `ScheduleEntry[]` + totals (total paid, total cost).

### 4.2 `variableProjection.v1` — schedule across rate periods ⭐

Inputs: loan core + ordered `RatePeriod[]` + **actual installment behavior** (`installmentPolicy`):

- `recalculated` — installment recomputed at each repricing to keep original maturity (bank adjusted the payment), or
- `unchanged` — installment stays as before repricing (the balloon-risk case), or
- `explicit[]` — known installment per period range (from user/statements).
  Method: walk periods; at each rate boundary apply new `i`; apply policy's installment; accrue as §4.1. Negative amortization allowed to emerge (balance may grow) — flagged, never hidden (BR-CALC-011).
  Output: schedule + `projectedResidualAtMaturity` (balance at contractual maturity date).

### 4.3 `residualDetection.v1` — balloon/residual risk (BR-CALC-012)

Residual risk exists when `projectedResidualAtMaturity > max(1% of original principal, 1 × current installment)` (threshold constants versioned with the formula).
Output: residual amount, months of extra payments it represents (`residual / installment`, ceil), causes list from detectable evidence only: `rateIncreaseWithUnchangedInstallment`, `paymentShortfall`, `contractualBalloon` (from `contractualBalloon` field — distinct per BR-CALC-013), `unknown`. Never asserts causes it cannot see (e.g. capitalized fees) — those appear as "possible other causes to ask your bank about."

### 4.4 `extraPaymentScenario.v1` (FR-SIM-001)

Inputs: base projection inputs + `extraMonthly?`, `oneTime? {amount, date}`, start date. Extra amounts reduce principal at the period they land in (assumption note: "assumes your bank applies extra payments to principal immediately — confirm"; CONV note). Output: scenario schedule + deltas vs base (payoff date, months saved, cost saved, residual). Invariant INV-3: more payment never worsens payoff under identical assumptions.

### 4.5 `allocationEstimate.v1` (BR-CALC-010)

When a payment's principal/cost split is unknown: estimate `cost = balanceBefore·i` for the period, `principal = amount − cost` (floor 0; excess beyond balance → overpayment state). Result labeled `allocationSource: 'estimated'` and rendered as estimate everywhere.

### 4.6 `cardPayoff.v1` (stretch, FR-SIM-004)

Model: monthly close; `charge_t = balance_{t−1} · APR/12` (ASM-011 — daily-accrual caveat emitted as assumption note); payment applied after charge; stop at balance ≤ 0 or `t = 600` (50y cap ⇒ "effectively never" state). Minimum-payment path uses `minimumPaymentRule` (percent-of-balance with floor). Output: months, total paid, total charges, comparison vs minimum-only. **Warning state:** if `payment ≤ charge_1`, return `neverPaysOff` — UI must show the FR-SIM-004 warning.

### 4.7 `aggregates.v1` (FR-CALC-006)

Total outstanding = Σ best-available balance per BR-PROV-001 (obligations lacking any balance are excluded and _named_ — BR-PROV-005). Total monthly commitment = Σ current installments + card minimum (estimated where rule known). Mixed provenance ⇒ aggregate labeled `includes estimates` (BR-PROV-004).

### 4.8 Islamic financing (BR-CALC-020) — deliberate limitation

- **Murabaha:** _no speculative math permitted._ Displayed figures are arithmetic on contract facts only: outstanding financing = totalSalePrice − Σ payments; progress = Σ payments / totalSalePrice. No repricing, no early-settlement simulation (ibra' is discretionary — GAP-07), no imputed rates. The engine exposes only `murabahaProgress.v1` with these two divisions.
- **Ijara / Diminishing Musharakah (P1):** read-only display of user-entered facts; no derived projections until contract-specific specs are validated with the finance team. The type system prevents these kinds from reaching loan formulas (discriminated union — ADR-0008).

## 5. Missing data & refusal rules (BR-CALC-016)

The engine returns `Refused { missing: FieldRef[], partial?: LimitedView }` instead of a result when:

- Loan projection lacks any of: principal (or official balance), any rate, term or maturity, installment (and cannot derive it).
- Rate history has gaps/overlaps that validation can't order (BR-OBL-002 violation).
- Card simulation lacks APR or balance.
  The UI must render the limited view + missing-field list (US-009 AC-4). **The engine never substitutes silent defaults for material inputs** (anti-pattern: fake precision).

## 6. Consistency check (BR-CALC-017)

On manual entry, if user-provided installment deviates > 2% from the computed level payment, emit a non-blocking `dataConsistencyNotice` ("may include fees or a different convention"). Never auto-correct user data.

## 6b. Classification & presentation rules

| ID          | Rule                                                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-CALC-013 | A **contract-designed balloon** (`contractualBalloon` field, a contract fact) and a **detected residual balance** (engine projection) are distinct concepts: distinct fields, distinct copy (TERM-011 vs TERM-012), and a contractual balloon never triggers the "unplanned residual" insight framing. |
| BR-CALC-014 | Presentation precision: `official`/`userEntered` values render at 3 dp (JOD); `estimate` values render rounded to whole JOD with "≈" prefix + estimate badge + confidence; full-precision estimate values are shown only in SCR-EXPLAIN. Resolves CON-06 (3-dp mandate vs no-fake-precision).          |

## 7. Confidence semantics (attached to every result)

| Level      | Meaning                                                                                 | Display consequence                                 |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `official` | Value came from an authoritative source, not computed by us                             | 3 dp, official badge                                |
| `high`     | All material inputs official/user-confirmed; only convention assumptions (CONV-*) apply | ≈, estimate badge                                   |
| `medium`   | ≥1 material input estimated (e.g. allocation estimates, unknown fees)                   | ≈, estimate badge + "based on partial data"         |
| `low`      | Material gaps bridged by defaults the user should verify                                | Limited display; planner shows banner (US-004 edge) |

Confidence downgrade rules are part of each formula's spec and tested. Confidence never upgrades through composition (a result is at most as confident as its weakest material input).

## 8. Invariants (property tests — NFR-TEST-001; implemented with fast-check)

| ID    | Invariant                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| INV-1 | Balances never negative absent an explicit overpayment state; schedules never contain negative payments.                     |
| INV-2 | Per period: principal + cost = payment within CONV-5 tolerance; schedule sums close to totals.                               |
| INV-3 | Under identical assumptions, a strictly higher payment never lengthens payoff nor increases total cost.                      |
| INV-4 | Zero rate ⇒ zero cost; total paid = principal exactly.                                                                       |
| INV-5 | Determinism: identical canonical inputs ⇒ byte-identical results (across runs; hash-verified).                               |
| INV-6 | Sum of schedule principal = original principal (± CONV-5 schedule tolerance) for closing schedules.                          |
| INV-7 | Murabaha: displayed outstanding + Σ payments = totalSalePrice exactly (no rounding drift permitted — it's subtraction only). |

## 9. Validation workflow with finance teammates (SRC-1 §31.6)

1. Vectors live in `packages/finance-engine/vectors/*.json` (schema in `calculation-test-vectors.md`) — readable/editable without touching code.
2. Finance teammates produce expected outputs **independently** (spreadsheet) for each vector; PR review compares.
3. RES-004: obtain ≥2 real bank schedules; run engine on their inputs; record deltas + which convention differences explain them; adjust conventions or (more likely) document the divergence in assumption notes.
4. A vector file change that alters expectations requires: finance reviewer sign-off + formula version bump if math changed.

## 10. Explicitly out of scope (do not implement without a new spec + ADR)

Day-count proration (ACT/360 etc.), mid-period repricing proration, fee capitalization rules, penalty interest, payment holidays, early-settlement fee math (conventional or Islamic), multi-currency conversion, credit-score modeling.

## 11. Phase 6 Integration Status

- **Status:** COMPLETE
- **CalculationService:** Implemented in `apps/mobile/src/services/calculation-service.ts`. It orchestrates formula execution, handles fallback logic, and persists runs via `CalculationRunRepository`.
- **Edge cases handled/ignored:** Clock manipulation is avoided (it injects deterministic pseudo-UUIDs and uses `new Date().toISOString()` strictly for `calculatedAt` persistence metadata, which does not impact reproducible engine math).
