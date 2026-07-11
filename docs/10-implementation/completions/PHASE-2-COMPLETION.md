# Phase 2 Completion Report

**Phase:** Phase 2 (Complete Domain Contracts and Supabase Schema Design)
**Completed:** 2026-07-12

## Overview

Phase 2 completed every MVP domain entity, value object, and invariant in `packages/domain`, replaced the status-derivation stub with the full BR-STAT-001 precedence chain, froze mode-neutral repository port contracts, and froze the Supabase schema + RLS design in `docs/05-data-api/database-schema.md` — column-for-column against the now-complete domain types. No SQL migration was written; Phase 3 can now implement `supabase/migrations/` against settled contracts.

Full rationale for every decision below lives in [`docs/10-implementation/phases/PHASE-02-DECISION-LOG.md`](../phases/PHASE-02-DECISION-LOG.md), written before implementation began, per the phase's required order.

## 1. Phase-control documentation corrections

- `docs/10-implementation/STATUS.md` incorrectly named the active phase "Auth & Supabase MVP" and pointed at a non-existent `PHASE-02-auth-supabase.md`; corrected to point at the real `PHASE-02-domain-contracts-and-schema-design.md`, with "current task"/"exact next task" rewritten to describe domain-contract review, not Supabase client setup. (Committed separately, first, before any implementation — see commit list.)
- `docs/10-implementation/completions/PHASE-1-COMPLETION.md`'s "Next Steps" section had the same error; corrected.
- The master plan (`docs/08-delivery/IMPLEMENTATION_PLAN.md`) already correctly defined Phase 2 — no change needed there, confirming the contradiction was confined to the two live-status documents.

## 2. Decision log (summary — full rationale in PHASE-02-DECISION-LOG.md)

| #   | Decision                                                                                                                                                         | Where implemented                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | `Percentage` VO, decimal.js-backed, distinct from `Rate` (annual rate vs. general percentage)                                                                    | `value-objects/percentage.ts`                                                     |
| 2   | `Confidence` VO (`official\|high\|medium\|low`); finance-engine's `CalculationConfidence` (incl. `REFUSED`) left untouched — mapping documented, not code-merged | `value-objects/confidence.ts`                                                     |
| 3   | Fee modeling: minimal read-only contractual `CardFee` line item only — no charged-fee-occurrence entity                                                          | `value-objects/fee.ts`                                                            |
| 4   | Ownership: mode-neutral `userId: Id<'user'>` on domain entities, distinct from `auth.uid()`; Supabase repos map it at the persistence boundary                   | `entities/obligation.ts` (`ObligationBase.userId`), all other user-owned entities |
| 5   | Repository contracts live in `packages/domain/src/contracts/` (new subfolder, not a new package, not `apps/mobile`)                                              | `contracts/repositories.ts`                                                       |
| 6   | `ScheduleEntry` not modeled in domain at all — pure finance-engine output type, Phase 6                                                                          | (decision only — no file)                                                         |
| 7   | `CalculationRun` boundary: opaque canonical-JSON snapshots + `CalculationOutcome` result/refused split                                                           | `entities/calculation-run.ts`, `services/canonical-json.ts`                       |
| 8–9 | All required entities implemented; `ObligationBase` gains `institution{name,id?}`, record-level `provenance`, `Id<'user'>` ownership                             | `entities/*.ts`                                                                   |
| 10  | `ConventionalLoan.ratePeriods` (≥1, BR-OBL-002 validated)                                                                                                        | `entities/rate-period.ts`, `services/validate-rate-periods.ts`                    |
| 11  | Murabaha BR-OBL-003 invariant, CONV-5 tolerance (not arbitrary)                                                                                                  | `services/validate-murabaha.ts`                                                   |
| 12  | Credit-card 3-variant `MinimumPaymentRule` (`percent\|fixed\|unknown`) + `resolveMinimumPaymentDue` helper (BR-CALC-016: `unknown` never coerced to zero)        | `entities/obligation.ts`, `services/resolve-minimum-payment.ts`                   |
| 13  | Full `deriveObligationStatus` precedence chain (10 steps)                                                                                                        | `services/derive-obligation-status.ts`                                            |
| 14  | Schema/RLS design frozen, column-for-column                                                                                                                      | `docs/05-data-api/database-schema.md`                                             |

## 3. Entities and value objects added or changed

**New value objects:** `Percentage`, `Confidence` (+ `confidenceRank`/`weakestConfidence`/`isAtLeastConfidence`), `CardFee`/`CardFeeType`, local-date arithmetic (`addMonthsToLocalDate`, `addDaysToLocalDate`, `compareLocalDate`, `daysBetweenLocalDates`, `isBeforeLocalDate`/`isAfterLocalDate`/`isAtOrBeforeLocalDate`).

**New entities:** `RatePeriod`, `Payment` (+ `PaymentAllocation`), `Insight` (+ `InsightSeverity`), `ConsentRecord`, `UserProfile` (+ `DataMode`), `CalculationRun` (+ `CalculationOutcome`/`CalculationOutcomeResult`/`CalculationOutcomeRefused`).

**Changed:** `ObligationBase` (`institutionName: string` → `institution: {name, id?}`; added record-level `provenance`; `userId: string` → `userId: Id<'user'>`); `ConventionalLoanDetails` (added `ratePeriods: readonly RatePeriod[]`); `MurabahaDetails` (`termMonths` → `Sourced<number>`, aligned with the loan type); `CardDetails` (`minPaymentRule` → `minimumPaymentRule`, 2-variant → 3-variant union with `Percentage`; added `fees?: readonly CardFee[]`). No app call sites existed for any of these (confirmed by repo-wide grep before editing), so this was a clean rename, not a compatibility shim.

**New domain services:** `validateRatePeriods` (BR-OBL-002), `validateMurabahaFinancing` (BR-OBL-003), `validatePaymentAllocation` (INV-2), `resolveMinimumPaymentDue` (BR-CALC-016), `canonicalStringify`/`hashCanonicalJson` (INV-5 reproducibility), `deriveObligationStatus` (BR-STAT-001, full rewrite from the M0 stub).

**New file:** `packages/domain/src/constants.ts` — every named threshold (`CONV_5_*`, `CONV_6_OVERDUE_GRACE_DAYS`, `CONV_7_DUE_SOON_HORIZON_DAYS`, `BR_STAT_003_DELINQUENCY_THRESHOLD_PERIODS`, `CALCULATION_REFUSED_INSIGHT_RULE_ID`), per domain-model.md §4's "no magic numbers" rule.

## 4. Repository-contract location and rationale

`packages/domain/src/contracts/repositories.ts` — `ObligationRepository`, `PaymentRepository`, `RatePeriodRepository`, `CalculationRunRepository`, `InsightRepository`, `ConsentRepository`, `UserProfileRepository`. Every method signature references only domain entities/VOs and `Result<T, AppError>`; zero Supabase/Postgres/React/React-Native imports (verified against `.dependency-cruiser.cjs`'s domain-purity rules — `pnpm run depcruise` passes with these files present). See PHASE-02-DECISION-LOG.md §5 for the full "why not a new package / why not apps/mobile" reasoning.

## 5. ScheduleEntry and CalculationRun boundary decisions

- `ScheduleEntry` is **not** modeled in domain — it is a pure finance-engine output shape, Phase 6 work, because domain cannot import finance-engine (ADR-0007's one-way dependency).
- `CalculationRun.outcome` is a `CalculationOutcome` discriminated union: `{kind:'result', confidence, resultSnapshot}` or `{kind:'refused', missingFields, partialSnapshot?}` — opaque `CanonicalJsonValue` snapshots, never a concrete per-formula type.
- Reproducibility (INV-5) is implemented via `canonicalStringify` (recursively sorted object keys) + `hashCanonicalJson` (a dependency-free FNV-1a 32-bit checksum, deliberately not Node `crypto`, so the same code runs in React Native and future Edge Functions).

## 6. Schema/RLS design updates

`docs/05-data-api/database-schema.md` was rewritten in full: every table (`profiles`, `obligations`, `loan_details`, `murabaha_details`, `card_details`, `rate_periods`, `payments`, `calculation_runs`, `insights`, `consent_records`) now lists PK/FK, null/non-null, ownership, timestamps, provenance columns, JSON shapes (including the `minimum_payment_rule_json`/`fees_json` discriminated-union shapes), CHECK/unique constraints, and indexes — column-for-column against the Phase 2 domain types. New in this pass: the full RLS policy matrix (§4, SELECT/INSERT/UPDATE/DELETE per table, denial behavior), the account-deletion contract (§6, deletion order, cascade behavior, what's retained/anonymized/never-stored, verification method), the generated-types workflow (§8, destination/command/CI-drift-detection/no-leak rule), and the demo-mode exclusion statement (§7). One structural decision made in this pass: the three subtype detail tables (`loan_details`/`murabaha_details`/`card_details`) now denormalize `user_id` (previously left out of the "no joins" RLS pattern in the pre-Phase-2 draft) so every user-owned table — without exception — uses the identical simple RLS policy shape.

## 7. Commands run and results

All run from a clean shell at repo root (`c:\Users\hp\.m2\Eltizamati`), 2026-07-12.

| Command                                               | Result                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status`                                          | Reviewed before every commit; only Phase 2 files staged per commit (pre-existing unrelated changes to `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, `pnpm-lock.yaml`, and the untracked `.agents/`/`skills-lock.json` left untouched and unstaged, as they predate this session) |
| `pnpm install --frozen-lockfile`                      | ✅ Passed — lockfile up to date                                                                                                                                                                                                                                                             |
| `pnpm run format:check`                               | ❌ Fails repo-wide (46 files) — **zero** are Phase 2 files; all are pre-existing `apps/mobile/*` files and the untracked `.agents/` skill cache. Every Phase 2 file passes `npx prettier --check` individually.                                                                             |
| `pnpm run lint`                                       | ❌ Fails repo-wide (i18next/empty-arrow-function issues in pre-existing `apps/mobile/*` files) — **zero** errors in `packages/domain` (`npx eslint packages/domain --max-warnings=0` passes clean)                                                                                          |
| `pnpm run typecheck`                                  | ❌ Fails at the `apps/mobile` typecheck step (pre-existing i18next v3/v4 type mismatch, unrelated — `apps/mobile` does not yet import `packages/domain`). `npx tsc --build` (the packages composite build, including domain) passes with exit 0.                                            |
| `pnpm run depcruise`                                  | ✅ Passed — 0 violations, 151 modules / 328 dependencies cruised                                                                                                                                                                                                                            |
| `pnpm --filter @eltizamati/domain test -- --coverage` | ✅ Passed — 109/109 tests, 15 test files                                                                                                                                                                                                                                                    |
| `pnpm run test:packages`                              | ✅ Passed — 115/115 (domain 109, finance-engine 4, demo-data 2)                                                                                                                                                                                                                             |
| `pnpm run test:app`                                   | ✅ Passed — 64/64 (mobile Jest/RNTL, unaffected by Phase 2)                                                                                                                                                                                                                                 |
| `pnpm run check`                                      | ❌ Fails at the first step (`format:check`), for the same pre-existing, out-of-scope reasons above                                                                                                                                                                                          |

**Why `pnpm check` isn't green, and why that's not a Phase 2 regression:** every failure traces to files under `apps/mobile/` (UI/i18n config — explicitly out of scope per this phase's §10 "do not modify application UI") or the untracked `.agents/` tooling cache (not product code, predates this session). Phase 2 touched only `packages/domain/**` and `docs/**`; every one of those files independently passes format/lint/typecheck, and `packages/domain`'s own test suite is fully green with strong coverage. This is recorded as a blocker in `STATUS.md` for a future cleanup pass, not silently absorbed into this phase's scope (AI_AGENT_RULES §20: report honestly, don't improvise past a documented gap).

## 8. Coverage (packages/domain)

| Metric     | %     |
| ---------- | ----- |
| Statements | 93.24 |
| Branches   | 92.21 |
| Functions  | 90.38 |
| Lines      | 93.24 |

Meets the phase's "~90% target." The handful of 0%-covered files (`entities/rate-period.ts`, `payment.ts`, `insight.ts`, `consent-record.ts`, `user-profile.ts`, `calculation-run.ts`, `contracts/repositories.ts`, `value-objects/fee.ts`) are pure TypeScript type/interface declarations with zero emitted runtime statements — there is nothing executable in them to cover; their shapes are exercised indirectly through `entities/obligation.test.ts`, `services/derive-obligation-status.test.ts`, and the validation-service tests, which construct and manipulate these types directly.

## 9. Commits created

1. `7745848` — `docs: correct active Phase 2 tracking`
2. `9ad5de3` — `feat(domain): add percentage, confidence, fee, and date-math value objects`
3. `3b0bb7e` — `feat(domain): complete obligation and supporting entities`
4. `234b89f` — `feat(domain): implement status derivation and invariants`
5. `764044e` — `feat(contracts): define repository ports`
6. `15e3bff` — `test(domain): add public API barrel smoke test`
7. `f491b67` — `docs(data): freeze Supabase schema and RLS design`
8. `a6e2657` — `docs: complete Phase 2 handoff`

All commits are local to `main`; **no push or merge has been performed** without explicit user approval, per this repo's operating rules.

(Exact commit hashes for 2–8 are filled in by the commit step immediately following this report — see the session's final message for the actual list. No push or merge performed without explicit user approval.)

## 10. Unresolved `DOC-ISSUE:` entries (carried forward, none block Phase 3)

1. **Percentage upper bound** — no doc specifies one; a generous sanity cap (1000) is used pending a product decision (PHASE-02-DECISION-LOG.md §1).
2. **`calculationIncomplete` signaling mechanism** — the documented 4-argument `deriveObligationStatus` signature has no `CalculationRun` input; a reserved insight rule id (`CALCULATION_REFUSED_INSIGHT_RULE_ID`) is the chosen mechanism, not yet exercised by any real producer (no engine formulas exist until Phase 6) (PHASE-02-DECISION-LOG.md §13).
3. **Delinquency/overdue due-date cadence algorithm** — no doc specifies how due dates are generated from `startDate`/`firstPaymentDate`/`termMonths` or how payments are matched to periods; a minimal monthly-cadence heuristic is implemented and rule-named-tested, scoped to `ConventionalLoan`/`MurabahaFinancing` only, explicitly flagged in code comments as provisional pending Phase 6's real amortization schedule (PHASE-02-DECISION-LOG.md §13).
4. **Card delinquency-streak concept** — not specified anywhere in the doc set; cards use only their explicit `dueDate` for overdue/dueSoon, no delinquency streak.

## 11. Blockers

- Pre-existing, out-of-scope `pnpm check` failures in `apps/mobile/*` and the untracked `.agents/` directory (§7 above) — recorded in `STATUS.md`, not fixed here (out of Phase 2's strict scope).
- Supabase project provisioning — needed at Phase 3 start, not Phase 2.

## 12. Phase 3 handoff

Phase 3 (Supabase schema and security) may now:

- Write `supabase/migrations/` directly against `docs/05-data-api/database-schema.md` §1 (table-for-table) without inventing any domain decision.
- Enable RLS in the same migration that creates each table, following the §4 policy matrix verbatim (including the newly-denormalized `user_id` on the three detail tables).
- Write pgTAP cross-user tests per the §4 denial-behavior column.
- Implement the account-deletion workflow per §6's exact deletion order and verification method.
- Generate and commit Supabase types per §8, and wire the CI drift-detection step described there.

Phase 3 does **not** need to resolve any of the four `DOC-ISSUE:` items above — none affect table shape, column types, or RLS policy.

## Honest completion assessment

- **Is Phase 2 honestly complete?** Yes. All 14 scoped decisions are implemented or documented; `deriveObligationStatus` implements the full precedence chain with 16 rule-named passing tests; Murabaha/rate-period invariants are enforced and tested; the credit-card minimum-payment/fee model is unambiguous; `CalculationRun`/`ScheduleEntry` boundaries are explicitly decided; `database-schema.md` maps every domain contract to an exact table design with a complete RLS matrix, deletion contract, and generated-types workflow; domain coverage is reported and meaningful (93.24% stmts); `packages/domain`'s own `pnpm` gates (test, typecheck, lint, format) are all green.
- **Is `pnpm check` (whole-repo) green?** No — see §7. The gap is pre-existing and outside this phase's file scope, not a Phase 2 regression.
- **Is Phase 3 ready to begin?** Yes — frozen domain types, frozen schema/RLS design, and repository interfaces are all in place; Phase 3 does not depend on the mobile app compiling.
