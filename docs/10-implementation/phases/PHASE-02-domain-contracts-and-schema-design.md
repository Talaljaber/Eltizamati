# Phase 2 — Complete Domain Contracts and Supabase Schema Design

## Status

Planned

## Objective

The domain package is complete and spec-reconciled (every MVP entity, VO, and invariant implemented and tested), and the Supabase schema + RLS design is frozen **on paper** against it — so Phase 3 writes migrations against settled contracts, never against drift.

## Why This Phase Exists

The audit found the domain package missing 7 entities and several VOs, with concrete spec mismatches (CURRENT_STATE §6). Migrations written against that state would need immediate corrective migrations. This phase is the schema-drift guard the plan exists to enforce: **domain model before schema; schema design before migration code.**

## Preconditions

Phase 1 complete (committed baseline, green `pnpm check`, CI). Phase 1 completion report filed.

## In Scope

### Domain reconciliation decisions (each must be decided, implemented, and recorded — defaults below follow `domain-model.md` as written; deviations need a `DOC-ISSUE:`/ADR note)

1. **ObligationBase:** add record-level `provenance`; change `institutionName` → `institution: { name, id? }`.
2. **RatePeriod:** new entity (`id, obligationId, annualRate: Rate, effectiveFrom, source: Provenance`, append-only, `supersededBy`); `ConventionalLoan.ratePeriods: RatePeriod[]` (≥1); BR-OBL-002 non-overlap validation.
3. **Payment:** new entity incl. optional allocation split + provenance + `periodRef?`.
4. **ScheduleEntry, CalculationRun, Insight, ConsentRecord, UserProfile:** new entities per domain-model.md §3.5 (CalculationRun incl. `inputsHash`, `asOf`, `confidence`, `assumptions[]`).
5. **Percentage VO** (replaces raw `number` percents) and **Confidence VO** (`'official'|'high'|'medium'|'low'`) in `packages/domain`; reconcile with finance-engine's `CalculationConfidence` (engine keeps `REFUSED` as a result state; document the mapping).
6. **CreditCard:** rename to `minimumPaymentRule`; 3-variant union (`percent` with `Percentage` + optional `floor`, `fixed`, `unknown`); add `fees?: FeeItem[]` + `FeeItem` type.
7. **Murabaha invariant BR-OBL-003** (`assetCost + disclosedProfit = totalSalePrice`): validation function + tests; align `termMonths` sourcing with the loan type.
8. **Ownership & timestamps:** `userId: Id<'user'>` non-null on user-owned entities; `createdAt`/`updatedAt` ISO timestamps; uuid v7 ids.
9. **Money/rate canonical storage forms:** confirm decimal-string domain representation ↔ `NUMERIC(14,3)`/`NUMERIC(9,6)` Postgres mapping (documented, not yet implemented).
10. **`deriveObligationStatus`:** full BR-STAT-001 precedence chain with the doc's 4-arg signature (`obligation, payments, insights, today`) + tests (thresholds CONV-6/7, BR-STAT-003).
11. **DEMO_DATE:** confirm `2026-07-01` canonical (already reconciled in docs); verify the seed narrative ("30 months elapsed" from 2024-01-15) against it and record the agreed period count for finance sign-off.

### Design deliverables (documents, not code)

12. **Supabase migration design:** final table/column list (correcting `database-schema.md`'s ERD where Phase-2 decisions differ), constraints, indexes, enums — reviewed against the implemented domain types.
13. **RLS policy design:** per-table owner policies, deny-by-default, non-null `user_id`; pgTAP test plan (cross-user matrix).
14. **Repository interface contracts** (in `packages/domain` or an interfaces module): `ObligationRepository`, `PaymentRepository`, `RateRepository`, `CalculationRunRepository`, `InsightRepository`, `ConsentRepository`, `UserProfileRepository` — the seam both demo (in-memory) and Supabase implementations satisfy.
15. **Generated-types strategy:** where `supabase gen types` output lives, how repositories consume it.
16. **Account-deletion contract:** what "erase everything" means table-by-table + audit event shape.

## Out of Scope

Writing actual SQL migrations (Phase 3) · Supabase client/auth code (Phase 4) · seed builders (Phase 5) · finance formulas (Phase 6) · any screens · any SQLite.

## Architecture Decisions Applied

ADR-0007/0008/0009/0014/0017 · domain-model.md (authoritative for shapes) · data-provenance.md · database-schema.md (as corrected by this phase).

## Required Implementation Work

- **Domain:** entities + VOs + invariants + status derivation in `packages/domain/src` (entities/, value-objects/, services/), exported via the barrel; keep dependency-cruiser clean.
- **Testing:** unit tests per new VO/entity invariant; status-derivation table tests named by rule (`it('BR-STAT-003: …')`); property tests where cheap (fast-check available).
- **Documentation:** update `database-schema.md` ERD/notes to the settled shapes; record all 16 decisions in the completion report; ADR if any decision deviates from the doc set.

## Expected Files and Packages

`packages/domain/src/entities/{obligation,payment,rate-period,schedule-entry,calculation-run,insight,consent-record,user-profile}.ts` · `value-objects/{percentage,confidence,fee-item}.ts` · `services/derive-obligation-status.ts` (real implementation) · `repositories/*.ts` (interfaces) · matching `*.test.ts`. (Suggested; follow existing folder idiom.)

## Public Interfaces Produced

The complete domain type surface + repository interfaces — the contract every later phase compiles against. The frozen schema/RLS design document (Phase 3's input).

## Testing Requirements

Domain coverage toward ~90% target; every BR invariant named in a test; `pnpm run test:packages` green; no `pnpm check` regressions.

## Verification Commands

```
pnpm run check
pnpm --filter @eltizamati/domain test -- --coverage
```

## Manual Validation

None (pure TypeScript phase). Peer/architect review of the schema + RLS design doc before Phase 3 starts.

## Exit Criteria

1. All 16 scoped decisions implemented (code) or documented (design) — none silently skipped.
2. `deriveObligationStatus` implements the full precedence chain with passing rule-named tests.
3. Repository interfaces compile and are exported.
4. `database-schema.md` matches the implemented domain (no known drift).
5. `pnpm check` green; CI green.
6. Completion report filed with the decision log.

## Exit Demo

A reviewer opens `packages/domain` and finds every entity from domain-model.md §3, with tests; opens `database-schema.md` and finds a schema that matches those types column-for-column.

## Required Documentation Updates

`database-schema.md` · `domain-model.md` (only if a decision deviates — with rationale) · STATUS.md · completion report.

## Known Risks

- Scope temptation: implementing "just a bit" of persistence or seed data here — forbidden; keep the phase pure.
- Over-modeling P1 entities (Ijara details etc.) — keep P1 stubs as stubs.

## Cuttable Work

`ScheduleEntry` as a persisted entity may be deferred to Phase 6 if the engine ends up treating schedules as pure results — record the decision either way. Nothing else.

## Handoff to Next Phase

Phase 3 may rely on: frozen domain types, frozen schema/RLS design, repository interfaces. Phase 5/6 may start in parallel after this phase closes (they depend on 2, not on 3/4).

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-2-COMPLETION.md` — the 16-decision log (each: decision, where implemented, test evidence), coverage numbers, `DOC-ISSUE:` lines.
