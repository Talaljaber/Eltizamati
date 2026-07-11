# Phase 2 — Decision Log

Written before implementation, per the phase's required order. Each entry: decision, rationale, where implemented. `DOC-ISSUE:` lines mark places the canonical docs were silent or ambiguous; each records the smallest safe decision taken instead of guessing.

## 1. Percentage VO

`Percentage` (decimal.js-backed, `packages/domain/src/value-objects/percentage.ts`) is distinct from `Rate`: `Rate` is an **annual financial rate** used in interest/profit calculations (already exists); `Percentage` is a **general percentage value** (minimum-payment percentage, utilization) with no annualization semantics. Construction rejects unsafe floats (mirrors `Money`/`Rate`), validates non-negativity, and — `DOC-ISSUE:` no upper bound is specified anywhere in the doc set (utilization can legitimately exceed 100% when a card is over-limit); a generous sanity cap (1000) rejects obvious data-entry corruption without foreclosing real over-limit values. No formatting method is exposed (formatting stays in `core/formatting`, per AI_AGENT_RULES §5).

## 2. Confidence VO

`Confidence = 'official' | 'high' | 'medium' | 'low'` (`packages/domain/src/value-objects/confidence.ts`) models the confidence of a **successful** calculation result. Finance-engine's existing `CalculationConfidence` (`'HIGH'|'MEDIUM'|'LOW'|'REFUSED'`, `packages/finance-engine/src/registry/types.ts`) is **left untouched** — the phase file itself says "engine keeps `REFUSED` as a result state; document the mapping," not "change the engine." Reconciliation happens at the domain's `CalculationRun.outcome` boundary (§7 below): a `result` outcome carries a domain `Confidence`; a `refused` outcome carries missing-field/reason data instead of any confidence value. Mapping table:

| Domain `CalculationRun.outcome`                        | Finance-engine `CalculationConfidence`                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `{ kind: 'result', confidence: 'official' }`           | not engine-producible in MVP (no live official recompute path) — reserved for future official-source passthrough |
| `{ kind: 'result', confidence: 'high' }`               | `'HIGH'`                                                                                                         |
| `{ kind: 'result', confidence: 'medium' }`             | `'MEDIUM'`                                                                                                       |
| `{ kind: 'result', confidence: 'low' }`                | `'LOW'`                                                                                                          |
| `{ kind: 'refused', missingFields, partialSnapshot? }` | `'REFUSED'`                                                                                                      |

Engine code changes (if the casing/shape should ever converge) are Phase 6 work, gated by AI_AGENT_RULES §7 (version bump + vectors + ADR) — out of scope here.

## 3. Fee modeling

Decision: **minimal read-only contractual fee line item only** — no charged-fee-occurrence history entity. Evidence: `financial-calculation-spec.md` CONV-8 ("Fees: MVP models fees only as user-entered one-off additions to balance (loan) or line items (card); no capitalization logic invented") and `functional-requirements.md` FR-OBL-005 ("...rates and fees where known") — both describe fees as _display line items_, never a payment/charge history. `CardFee` (`packages/domain/src/value-objects/fee.ts`): `{ type: 'annual'|'late'|'cashAdvance'|'other', amount: Sourced<Money>, description? }`. No separate "charged fee" entity is created; if a future phase needs actual-charge history, it is a new entity, not a retrofit of this type.

## 4. Domain ownership vs. persistence ownership

Decision: **mode-neutral owner identifier on the domain entity** (`userId: Id<'user'>`), distinct from `auth.uid()`. Demo mode uses a fixed, non-authenticated, domain-only sentinel id (defined by whichever package owns seed construction — Phase 5) that never reaches Supabase (ADR-0017 §2: bundled demo data is never inserted into Supabase). Personal mode's Supabase repository maps `userId` ↔ `auth.uid()` at the persistence boundary (row ↔ domain mapping) — the mapping is an infrastructure concern, invisible to domain/engine/status-derivation code, which only ever sees `Id<'user'>`. This satisfies "same business logic in both modes" without inventing a fake authenticated identity for demo data.

## 5. Repository contract location

Decision: `packages/domain/src/contracts/repositories.ts` — a new `contracts/` subfolder inside the existing domain package, not a new package, not `apps/mobile`. Rationale: the interfaces reference only domain entities, VOs, and `Result<T, AppError>` — zero Supabase/Postgres/React/React-Native types (verified against `.dependency-cruiser.cjs`'s domain-purity rules, which this file satisfies). Both future implementors (`Demo*Repository`, likely in `packages/demo-data` or the app; `Supabase*Repository` in `apps/mobile`) already depend on `packages/domain`, so a new package would add a workspace member with no dependency-graph benefit (explicitly discouraged by the phase brief). `domain-model.md`/`system-architecture.md` place repository _implementations_ in Infrastructure, but the _port interfaces_ they satisfy are pure contracts — the same category as the already-domain-resident `AppError`/`Result` taxonomy (ADR-0014), which is also technically an application-facing concern housed in domain today. Named `contracts/`, not `repositories/`, to keep the folder self-documenting as "ports," distinct from `entities/`.

## 6. ScheduleEntry

Decision: **not modeled in domain at all in Phase 2.** `ScheduleEntry` is a pure finance-engine output shape (per-formula, e.g. `amortization.v1`'s schedule row). Domain cannot import finance-engine (dependency direction is finance-engine → domain, never reverse — ADR-0007), so domain's `CalculationRun` cannot reference a concrete `ScheduleEntry` type without inverting that boundary. `CalculationRun.outcome.resultSnapshot` is therefore typed as an opaque `CanonicalJsonValue` (a generic JSON-serializable value), not a `ScheduleEntry[]`. Concrete per-formula result typing (including `ScheduleEntry`) is Phase 6 work, done inside `packages/finance-engine`. This is the "Cuttable Work" item exercised in full, not partially.

## 7. CalculationRun boundary

`CalculationRun` (`packages/domain/src/entities/calculation-run.ts`) separates:

- `formulaId: string`, `formulaVersion: number` — opaque references to the finance-engine registry (domain does not import `FormulaId` from finance-engine, to preserve the one-way dependency; the string is validated informally, formally validated by the engine at call time in Phase 6).
- `inputsSnapshot: CanonicalJsonValue`, `inputsHash: string` — canonical JSON snapshot + a SHA-256 digest (see `packages/domain/src/services/canonical-json.ts`: stable-key-order stringify, then a hand-implemented, pure-JS, dependency-free SHA-256 — deliberately neither Node's `crypto` module nor the Web Crypto API, since neither is reliably available/synchronous across React Native and Supabase Edge Functions, per ADR-0007's portability goal; verified against NIST test vectors and Node's own `crypto.createHash('sha256')` in `canonical-json.test.ts`). **Revision (2026-07-12, readiness pass):** the original implementation was a non-cryptographic FNV-1a checksum, ambiguous next to an "audit-looking" `inputs_hash` column name; reassessed before Phase 3's migration and upgraded to real SHA-256 rather than renaming the field, since a portable pure-JS SHA-256 was achievable without new dependencies. Reproducibility (INV-5): identical `canonicalStringify(inputs)` ⇒ identical `inputsHash`.
- `outcome: CalculationOutcome` — `{ kind: 'result'; confidence: Confidence; resultSnapshot: CanonicalJsonValue }` or `{ kind: 'refused'; missingFields: readonly string[]; partialSnapshot?: CanonicalJsonValue }`. This is the "successful result with Confidence / refused result with missing fields" split required by §4.2, and the single mechanism `deriveObligationStatus`'s `calculationIncomplete` step relies on (see decision 13).
- `assumptions: readonly string[]`, `asOf: LocalDate`, `calculatedAt: string` — unchanged from domain-model.md.

## 8–9. Required entities / ObligationBase

Implemented: `RatePeriod`, `Payment`, `CalculationRun`, `Insight`, `ConsentRecord`, `UserProfile` (new files under `entities/`). `ObligationBase` changes: `institutionName: string` → `institution: { name: string; id?: string }`; added record-level `provenance: Provenance`; `userId: string` → `userId: Id<'user'>` (decision 4). No app call sites existed yet (`apps/mobile` has zero references to `ObligationBase`/`CardDetails`/`MinPaymentRule` — confirmed by repo-wide grep), so this is a clean rename, not a compatibility shim.

## 10. ConventionalLoan / RatePeriod

`ConventionalLoanDetails.ratePeriods: readonly RatePeriod[]` (≥1, enforced by `validateRatePeriods`). `RatePeriod = { id, obligationId, annualRate: Rate, effectiveFrom: LocalDate, supersededBy?: Id<'ratePeriod'>, provenance: Provenance, createdAt }`. `validateRatePeriods` (`packages/domain/src/services/validate-rate-periods.ts`) enforces: at least one non-superseded period; non-superseded periods strictly ordered and non-overlapping by `effectiveFrom` (BR-OBL-002); supersession is append-only (a period once created is never mutated — `supersededBy` points forward to its replacement, never the reverse).

## 11. Murabaha invariant (BR-OBL-003)

`validateMurabahaFinancing` (`packages/domain/src/services/validate-murabaha.ts`) checks `assetCost + disclosedProfit == totalSalePrice` using exact `Money` arithmetic, tolerant only to the **named, documented** `CONV-5` rounding tolerance (0.005 JOD — `financial-calculation-spec.md` §2, `domain/src/constants.ts`), not an arbitrary invented tolerance. Violations return `Result.err` (`validation` code) — never auto-corrected, per BR-OBL-003's explicit "surfaced to the user, not auto-corrected."

## 12. Credit-card minimum-payment model

`MinimumPaymentRule = { type: 'percent'; value: Percentage; floor?: Money } | { type: 'fixed'; value: Money } | { type: 'unknown' }` (renamed field `minPaymentRule` → `minimumPaymentRule`, matching domain-model.md exactly; the 2-variant `percentFloor`/`fixed` shape is replaced). `fees?: readonly CardFee[]` added (decision 3). `deriveObligationStatus` and any future minimum-payment display logic must treat `'unknown'` as a distinct, renderable state — never coerced to a zero payment (BR-CALC-016 in spirit).

## 13. Status derivation (BR-STAT-001)

`deriveObligationStatus(obligation, payments, insights, today)` implements the full 10-step precedence chain from `domain-model.md` §4. Three points needed a documented decision because the doc's 4-argument signature has no `CalculationRun` parameter, yet step 6 ("calculationIncomplete — engine refused") needs to know about refusal, and steps 3/4 ("delinquent"/"overdue") need a due-date cadence the docs don't fully specify an algorithm for:

- `DOC-ISSUE:` **Refusal signaling.** The 4-arg signature (normative, domain-model.md §4) has no calculation-run input, so `calculationIncomplete` cannot inspect a `CalculationRun` directly. Resolution: a dedicated insight rule id (`CALCULATION_REFUSED_INSIGHT_RULE_ID = 'system.calculationRefused'`, `domain/src/constants.ts`) is the documented contract — an application service (Phase 6+, when the engine actually refuses) raises this insight, and status derivation checks for it. This keeps the signature exactly as documented while giving `calculationIncomplete` a real signal once wired up. Not yet exercised by any producer in Phase 2 (no engine formulas exist yet) — covered by a unit test that manufactures the insight directly.
- `DOC-ISSUE:` **Due-date/payment-matching algorithm for delinquency/overdue.** `BR-STAT-003` and `CONV-6` name thresholds (2 consecutive unpaid periods; 3-day grace) but no doc specifies how a due-date series is generated from `startDate`/`firstPaymentDate`/`termMonths`, nor how a payment is matched to a period. Implemented the smallest safe heuristic: due dates are generated monthly (CONV-1) from `firstPaymentDate ?? startDate + 1 month`, capped at `today`; a period counts as "paid" if at least one payment falls in `(previousDueDate, dueDate]`. This is explicitly a status-derivation heuristic, not a schedule engine — Phase 6's real amortization schedule should supersede it once available, and the code comment says so. Scoped to `ConventionalLoan`/`MurabahaFinancing` only (kinds with an installment cadence); `CreditCard` uses its explicit single `dueDate` field for overdue/dueSoon only (no delinquency-streak concept for cards — not specified anywhere in the doc set).
- **P1 stub kinds** (`GenericFacility`, `IjaraFinancing`, `DiminishingMusharakahFinancing`) have no schedule data modeled (deliberately, per "Known Risks — keep P1 stubs as stubs"). Status derivation resolves them to `completed`/`notStarted`/`unknown` only — never a false `onTrack` claim without derivable schedule evidence.

`domain/src/constants.ts` centralizes every named threshold (`CONV_5_*`, `CONV_6_OVERDUE_GRACE_DAYS`, `CONV_7_DUE_SOON_HORIZON_DAYS`, `BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS`, `CALCULATION_REFUSED_INSIGHT_RULE_ID`) per domain-model.md §4's "no magic numbers" rule.

## 14. Schema/RLS design

`docs/05-data-api/database-schema.md` updated column-for-column against the entities above (see that file's diff). No SQL migration written (Phase 3 boundary respected).
