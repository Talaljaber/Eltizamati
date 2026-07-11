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
- Reproducibility (INV-5) is implemented via `canonicalStringify` (recursively sorted object keys) + `hashCanonicalJson` (SHA-256, hand-implemented in pure JS — see §13 below for why this superseded the original FNV-1a checksum, and why it's still not Node's `crypto`/Web Crypto, so the same code runs in React Native and future Edge Functions).

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

These 9 commits (7745848 through fdf25a0) were pushed to `origin/main` (confirmed: `git rev-list --left-right --count origin/main...HEAD` = `0 0` as of the Phase 3 readiness pass, §13 below) — the push itself happened outside this report-writing turn; no push was performed as part of writing this report. Further commits made during the Phase 3 readiness pass (§13) remain local pending explicit user approval to push, per this repo's operating rules.

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

## Honest completion assessment (as of Phase 2 close, 2026-07-12, before the readiness pass)

- **Is Phase 2 honestly complete?** Yes. All 14 scoped decisions are implemented or documented; `deriveObligationStatus` implements the full precedence chain with 16 rule-named passing tests; Murabaha/rate-period invariants are enforced and tested; the credit-card minimum-payment/fee model is unambiguous; `CalculationRun`/`ScheduleEntry` boundaries are explicitly decided; `database-schema.md` maps every domain contract to an exact table design with a complete RLS matrix, deletion contract, and generated-types workflow; domain coverage is reported and meaningful (93.24% stmts); `packages/domain`'s own `pnpm` gates (test, typecheck, lint, format) are all green.
- **Is `pnpm check` (whole-repo) green?** No at the time — see §7. **This gap is closed as of §13** (the Phase 3 readiness pass, below).
- **Is Phase 3 ready to begin?** Yes — frozen domain types, frozen schema/RLS design, and repository interfaces are all in place.

## 13. Phase 3 readiness-pass addendum (2026-07-12, same day)

Before starting Phase 3, a strict readiness pass verified Phase 2's actual pushed state and closed the `pnpm check`/CI gap left open at §7/§11 above, rather than carrying it forward as permanent "pre-existing, out of scope" debt.

**Push verification:** confirmed (not assumed) that commits `7745848`..`fdf25a0` are genuinely on `origin/main` (`git fetch origin && git rev-list --left-right --count origin/main...HEAD` → `0 0`). Worked from a fresh `git worktree` checked out at `fdf25a0` (not the primary, possibly-dirty workspace) for every command below.

**`pnpm check` repaired, repo-wide (not just `packages/domain`):**

- 8 pre-existing unformatted files fixed with `prettier --write` (`AI_AGENT_RULES.md`, two `apps/mobile/app/*_layout.tsx` files, `apps/mobile/jest.config.js`, two mobile `__tests__` files, two `docs/99-sources/*` files) — no behavior change.
- 17 pre-existing lint errors fixed in mobile test files and `apps/mobile/src/i18n/index.ts`: empty-arrow-function jest prop stubs (`() => {}` → `() => undefined`, an expression body rather than an empty block, satisfying `@typescript-eslint/no-empty-function` with identical runtime behavior), a nullable-string `strict-boolean-expressions` violation (explicit `!== null` check), and a type-only import split (`import type { LanguageDetectorAsyncModule }`).
- 1 pre-existing typecheck error fixed: `apps/mobile/src/i18n/index.ts` passed `compatibilityJSON: 'v3'` to i18next's `.init()`, a literal the installed i18next version's types no longer accept. Removed — the app's translation files (`en.json`/`ar.json`) use no plural keys (`_plural`/`_one`/`_other`/etc., confirmed by grep), so v3-vs-v4 plural-compatibility mode has no observable effect either way.
- **`ci:check` script did not exist.** `.github/workflows/ci.yml` has always called `pnpm run ci:check`, but `package.json` never defined that script — every CI run to date would have failed at that step regardless of code health, independent of anything Phase 1 or 2 did. Added `"ci:check": "pnpm run check"` as an intentional alias (per the readiness-pass instruction: use `pnpm run check` directly, or add an alias — an alias was chosen to keep the CI workflow file's existing step name stable).
- Verified `pnpm run check` and `pnpm run ci:check` both pass end-to-end from the clean worktree (format, lint, typecheck, depcruise, `test:packages` 121/121, `test:app` 64/64).
- **Not yet confirmed:** an actual live GitHub Actions run. `pnpm run ci:check` passes locally with the exact command CI invokes, which is strong evidence, but no push has occurred from this pass yet (pending user approval) so no live Actions run has been observed to confirm it end-to-end.

**`CalculationRun.inputsHash` reassessed:** the original implementation (Phase 2) was a non-cryptographic 32-bit FNV-1a checksum — functionally sufficient for its stated purpose (INV-5 reproducibility/change-detection) but ambiguous next to an "audit-looking" `calculation_runs.inputs_hash` column name. Upgraded to genuine SHA-256 (FIPS 180-4), hand-implemented in pure JS (not Node's `crypto` module — unavailable in React Native; not the Web Crypto API — `subtle.digest` is async and not reliably present across RN/Hermes targets; either would compromise ADR-0007's portability goal). Verified against NIST test vectors (empty string, `"abc"`, the standard 56-character multi-block message) and against Node's own `crypto.createHash('sha256')` for a JSON-like payload and a non-ASCII (Arabic) string — six new tests in `canonical-json.test.ts` (109 → 115 domain tests). The field name `inputsHash`/`inputs_hash` is unchanged (no rename to `inputsFingerprint`): once it's a real cryptographic hash, the name is accurate.

**Composite ownership foreign keys designed** (`docs/05-data-api/database-schema.md` new §1.11): the denormalized `user_id` on every child table (`loan_details`, `murabaha_details`, `card_details`, `rate_periods`, `payments`, `calculation_runs`, `insights`) was, until this pass, only kept consistent with its parent `obligations.user_id` by RLS policies and application-code discipline — nothing in the schema itself prevented a same-account bug or a service-role write path (which RLS does not constrain) from inserting a child row whose `user_id` silently disagreed with its parent obligation's owner. Designed (not yet migrated — Phase 3 implements this): `obligations` gains `UNIQUE (id, user_id)`; every child table's `obligation_id` foreign key becomes a composite `(obligation_id, user_id) → obligations(id, user_id)`, so Postgres itself rejects a parent/child ownership mismatch as a foreign-key violation. Nullable-`obligation_id` rows (aggregate `calculation_runs`/`insights`) are unaffected — Postgres's default `MATCH SIMPLE` FK semantics skip the check whenever any column in the composite is `NULL`. This is additive to RLS (§4), not a replacement — RLS still gates cross-user access; the composite FK guarantees same-account/service-role ownership integrity RLS was never designed to cover.

**Files changed in this pass:** `package.json` (`ci:check` alias), `apps/mobile/{app/_layout.tsx, app/(tabs)/_layout.tsx, jest.config.js, src/i18n/index.ts, src/core/design-system/__tests__/{Amount,Button,Card}.test.tsx}`, `AI_AGENT_RULES.md`, `docs/99-sources/{ELTIZAMATI_MASTER_BRIEF,FABLE_5_ARCHITECT_PROMPT}.md` (formatting only), `packages/domain/src/services/canonical-json.ts` + `.test.ts`, `packages/domain/src/entities/calculation-run.ts` (comment only), `packages/domain/src/index.ts` (export `sha256Hex`), `docs/05-data-api/database-schema.md` (§1.11 + composite-FK notes throughout §1), `docs/10-implementation/phases/PHASE-02-DECISION-LOG.md` (§7 revision note), this report, `docs/10-implementation/STATUS.md`.

**Verification commands (all from the clean `fdf25a0` worktree):**

| Command                                               | Result                                                   |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                      | ✅ Passed                                                |
| `pnpm run format:check`                               | ✅ Passed (repo-wide)                                    |
| `pnpm run lint`                                       | ✅ Passed (repo-wide)                                    |
| `pnpm run typecheck`                                  | ✅ Passed (repo-wide, incl. `apps/mobile`)               |
| `pnpm run depcruise`                                  | ✅ Passed — 0 violations, 149 modules / 329 dependencies |
| `pnpm --filter @eltizamati/domain test -- --coverage` | ✅ Passed — 115/115                                      |
| `pnpm run test:packages`                              | ✅ Passed — 121/121                                      |
| `pnpm run test:app`                                   | ✅ Passed — 64/64                                        |
| `pnpm run check`                                      | ✅ **Passed end-to-end**                                 |
| `pnpm run ci:check`                                   | ✅ Passed (the exact command CI invokes)                 |

**Honest assessment (updated):** `pnpm check` is now genuinely green repo-wide, verified from a clean checkout, not just within Phase 2's file scope. The one item not yet confirmed is a live GitHub Actions run, which requires pushing these readiness-pass commits — pending explicit user approval. Phase 3 may begin once that push and live-CI confirmation land; nothing about Phase 3's scope (local Supabase migrations/RLS/pgTAP) depends on the mobile app or CI itself, so Phase 3 work is not blocked in the meantime, only its "CI is green" exit criterion is.
