# Database Schema — Supabase Postgres (MVP)

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** this schema is now implemented **once, in Supabase Postgres, as the MVP persistent schema.** There is **no local SQLite schema in the MVP** — the SQLite column of the type-mapping table below is retained only as future-scope reference (see "Future local-first enhancement" at the end of this file).
>
> **⚠ Phase 2 freeze (2026-07-11/12, [PHASE-02-domain-contracts-and-schema-design](../10-implementation/phases/PHASE-02-domain-contracts-and-schema-design.md)):** this document is now the **column-for-column mirror of the frozen domain contracts** in `packages/domain/src` (entities: `obligation.ts`, `rate-period.ts`, `payment.ts`, `calculation-run.ts`, `insight.ts`, `consent-record.ts`, `user-profile.ts`). Every table below states PK/FK, null/non-null, ownership, timestamps, provenance columns, JSON shapes, constraints, indexes, and deletion behavior, per that phase's exit criteria. **No SQL migration exists yet — Phase 3 writes migrations against this document, not the reverse.** Key deltas from earlier drafts of this file:
>
> - **`user_id` is NON-NULL on every user-owned table from the first migration**, including the three subtype detail tables (`loan_details`, `murabaha_details`, `card_details`) — denormalized from `obligations.user_id` so every table's RLS policy is the same simple `user_id = auth.uid()` pattern with **no joins, no subqueries** (a deliberate Phase 2 decision: the pre-Phase-2 draft left the three detail tables out of the "no joins" RLS pattern; they are now included by denormalizing `user_id` onto them too).
> - **RLS is enabled in the same migration that creates each table** (§4 pattern) with pgTAP cross-user tests — this is MVP-blocking, not P1.
> - The **localProfileId → auth.uid() remapping strategy is superseded**: personal mode requires sign-in before any personal data is written, so rows are created with `auth.uid()` from the start. There is no MMKV profile-id backfill. Demo mode's domain-level `userId` (a mode-neutral sentinel — PHASE-02-DECISION-LOG.md §4) **never reaches this schema**: bundled demo data is never inserted into Supabase.
> - `profiles` (formerly sketched as `user_preferences`) **is** a database table in MVP — it mirrors `UserProfile` (`locale`, `dataMode`) for personal-mode users. Non-financial **device** preferences (selected language before sign-in, onboarding completion, etc.) still live in key-value storage (ADR-0006 surviving clauses) and are never a database table.
> - **Bundled demo data is never inserted into Supabase** — demo mode is in-memory (ADR-0017 §2, restated in §7 below).
> - Generated types (`supabase gen types typescript`) are committed and are the typed boundary for repositories (§8).
> - `rate_periods`, `payments`, `calculation_runs`, `insights` gain the exact JSON shapes and constraints implied by the Phase 2 domain entities (append-only rate history, `CalculationOutcome`'s result/refused split, etc.) — see §1–2 below.

**One schema, one shape:** the Postgres/Supabase schema is the MVP system of record for personal-mode data. Subtype modeling per ADR-0008: common `obligations` table + per-family detail tables (no giant nullable table — SRC-1 §21.1).

## 1. Tables

Every user-owned table (all except nothing — even the three detail tables, per the Phase 2 decision above) carries a **non-null `user_id`**. `Sourced<T>` domain fields map to a value column + a paired `<col>_prov` JSONB column holding the serialized `Provenance` (`{source, providerId?, observedAt, recordedAt, sourceReference?}`).

### 1.1 `profiles`

Mirrors `UserProfile` (domain: `entities/user-profile.ts`). One row per authenticated user.

| Column       | Type          | Null     | Notes                                                                                                              |
| ------------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `user_id`    | `uuid` PK     | not null | `= auth.uid()`, FK → `auth.users(id)`                                                                              |
| `locale`     | `text`        | not null | CHECK `locale in ('en','ar')`                                                                                      |
| `data_mode`  | `text`        | not null | CHECK `data_mode in ('demo','personal')` — a personal-mode row is always `'personal'`; demo mode never writes here |
| `created_at` | `timestamptz` | not null | default `now()`                                                                                                    |
| `updated_at` | `timestamptz` | not null | maintained by trigger or application on update                                                                     |

Deletion: cascades with the Supabase `auth.users` row on account deletion (§6).

### 1.2 `obligations` (base — ADR-0008)

Mirrors `ObligationBase` (domain: `entities/obligation.ts`).

| Column             | Type                         | Null         | Notes                                                                                                          |
| ------------------ | ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `id`               | `uuid` PK                    | not null     | client-generated uuid v7                                                                                       |
| `user_id`          | `uuid` FK → `auth.users(id)` | **not null** | ownership                                                                                                      |
| `kind`             | `text`                       | not null     | CHECK `kind in ('conventionalLoan','murabaha','ijara','diminishingMusharakah','creditCard','genericFacility')` |
| `nickname`         | `text`                       | not null     |                                                                                                                |
| `institution_name` | `text`                       | not null     | `Institution.name`                                                                                             |
| `institution_id`   | `text`                       | nullable     | `Institution.id`                                                                                               |
| `currency`         | `text`                       | not null     | `'JOD'` in MVP; CHECK `currency = 'JOD'`                                                                       |
| `opened_date`      | `date`                       | not null     |                                                                                                                |
| `closed_date`      | `date`                       | nullable     | drives `ObligationStatus.completed`                                                                            |
| `notes`            | `text`                       | nullable     |                                                                                                                |
| `provenance_json`  | `jsonb`                      | not null     | record-level `Provenance`                                                                                      |
| `created_at`       | `timestamptz`                | not null     | default `now()`                                                                                                |
| `updated_at`       | `timestamptz`                | not null     | maintained on update                                                                                           |

Index: `(user_id)`; `(user_id, kind)` for list-by-kind queries.

### 1.3 `loan_details` (kind = `conventionalLoan`)

Mirrors `ConventionalLoanDetails`. 1:1 with `obligations`. **Rate history is not stored here** — see `rate_periods` (§1.6); `loan_details` carries no rate column at all (BR-OBL-002 lives entirely in the append-only table).

| Column                     | Type                             | Null         | Notes                                                                 |
| -------------------------- | -------------------------------- | ------------ | --------------------------------------------------------------------- |
| `obligation_id`            | `uuid` PK FK → `obligations(id)` | not null     | `ON DELETE CASCADE`                                                   |
| `user_id`                  | `uuid` FK → `auth.users(id)`     | **not null** | denormalized (RLS)                                                    |
| `original_principal`       | `numeric(14,3)`                  | not null     |                                                                       |
| `original_principal_prov`  | `jsonb`                          | not null     |                                                                       |
| `outstanding_balance`      | `numeric(14,3)`                  | nullable     |                                                                       |
| `outstanding_balance_prov` | `jsonb`                          | nullable     |                                                                       |
| `installment`              | `numeric(14,3)`                  | not null     |                                                                       |
| `installment_prov`         | `jsonb`                          | not null     |                                                                       |
| `rate_type`                | `text`                           | not null     | CHECK `rate_type in ('fixed','variable','mixed','unknown')`           |
| `term_months`              | `integer`                        | not null     |                                                                       |
| `term_months_prov`         | `jsonb`                          | not null     |                                                                       |
| `start_date`               | `date`                           | not null     |                                                                       |
| `maturity_date`            | `date`                           | not null     |                                                                       |
| `first_payment_date`       | `date`                           | nullable     |                                                                       |
| `payment_frequency`        | `text`                           | not null     | CHECK `payment_frequency = 'monthly'` (MVP)                           |
| `purpose`                  | `text`                           | nullable     | CHECK `purpose in ('personal','auto','housing','other')` when present |
| `contractual_balloon`      | `numeric(14,3)`                  | nullable     |                                                                       |
| `contractual_balloon_prov` | `jsonb`                          | nullable     |                                                                       |

CHECK: `term_months > 0`.

### 1.4 `murabaha_details` (kind = `murabaha`)

Mirrors `MurabahaDetails`.

| Column                  | Type                             | Null         | Notes                                                                                 |
| ----------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `obligation_id`         | `uuid` PK FK → `obligations(id)` | not null     | `ON DELETE CASCADE`                                                                   |
| `user_id`               | `uuid` FK → `auth.users(id)`     | **not null** | denormalized (RLS)                                                                    |
| `asset_cost`            | `numeric(14,3)`                  | not null     |                                                                                       |
| `asset_cost_prov`       | `jsonb`                          | not null     |                                                                                       |
| `disclosed_profit`      | `numeric(14,3)`                  | not null     |                                                                                       |
| `disclosed_profit_prov` | `jsonb`                          | not null     |                                                                                       |
| `total_sale_price`      | `numeric(14,3)`                  | not null     | fixed at contract signing (BR-CALC-020)                                               |
| `total_sale_price_prov` | `jsonb`                          | not null     |                                                                                       |
| `installment`           | `numeric(14,3)`                  | not null     |                                                                                       |
| `installment_prov`      | `jsonb`                          | not null     |                                                                                       |
| `term_months`           | `integer`                        | not null     |                                                                                       |
| `term_months_prov`      | `jsonb`                          | not null     |                                                                                       |
| `start_date`            | `date`                           | not null     |                                                                                       |
| `profit_rate_disclosed` | `numeric(9,6)`                   | nullable     | display-only (BR-CALC-020) — no provenance column (non-material, per domain-model.md) |

CHECK (`BR-OBL-003`, app-layer enforced exactly — see `validateMurabahaFinancing`; the DB stores exactly what was entered, never auto-corrects): `abs(asset_cost + disclosed_profit - total_sale_price) <= 0.005` (the CONV-5 per-period tolerance constant — must stay numerically identical to `conv5PerPeriodTolerance()` in `packages/domain/src/constants.ts`; a change to one is a change to both, same PR).

### 1.5 `card_details` (kind = `creditCard`)

Mirrors `CardDetails`. `minimum_payment_rule_json` and `fees_json` hold the two genuinely polymorphic small bags (ADR-0008 alternative 3: JSON retained only for these, never for core queryable fields).

| Column                      | Type                             | Null         | Notes                                                                                                                                                                                                                               |
| --------------------------- | -------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `obligation_id`             | `uuid` PK FK → `obligations(id)` | not null     | `ON DELETE CASCADE`                                                                                                                                                                                                                 |
| `user_id`                   | `uuid` FK → `auth.users(id)`     | **not null** | denormalized (RLS)                                                                                                                                                                                                                  |
| `credit_limit`              | `numeric(14,3)`                  | not null     |                                                                                                                                                                                                                                     |
| `credit_limit_prov`         | `jsonb`                          | not null     |                                                                                                                                                                                                                                     |
| `current_balance`           | `numeric(14,3)`                  | not null     |                                                                                                                                                                                                                                     |
| `current_balance_prov`      | `jsonb`                          | not null     |                                                                                                                                                                                                                                     |
| `statement_balance`         | `numeric(14,3)`                  | nullable     |                                                                                                                                                                                                                                     |
| `statement_balance_prov`    | `jsonb`                          | nullable     |                                                                                                                                                                                                                                     |
| `statement_date`            | `date`                           | nullable     |                                                                                                                                                                                                                                     |
| `minimum_payment_rule_json` | `jsonb`                          | nullable     | `{"type":"percent","value":"3","floor":"10"} \| {"type":"fixed","value":"25"} \| {"type":"unknown"}` — money/percentage as decimal strings, never `unknown` silently omitted (BR-CALC-016)                                          |
| `purchase_apr`              | `numeric(9,6)`                   | nullable     |                                                                                                                                                                                                                                     |
| `purchase_apr_prov`         | `jsonb`                          | nullable     |                                                                                                                                                                                                                                     |
| `cash_advance_apr`          | `numeric(9,6)`                   | nullable     |                                                                                                                                                                                                                                     |
| `cash_advance_apr_prov`     | `jsonb`                          | nullable     |                                                                                                                                                                                                                                     |
| `due_date`                  | `date`                           | nullable     |                                                                                                                                                                                                                                     |
| `grace_days`                | `integer`                        | nullable     |                                                                                                                                                                                                                                     |
| `fees_json`                 | `jsonb`                          | nullable     | array of `{"type":"annual"\|"late"\|"cashAdvance"\|"other","amount":"50","amount_prov":{...},"description?":"..."}` — contractual fee line items only (PHASE-02-DECISION-LOG.md §3); no charged-fee-occurrence history table exists |

CHECK: `minimum_payment_rule_json is null or minimum_payment_rule_json->>'type' in ('percent','fixed','unknown')`.

### 1.6 `rate_periods`

Mirrors `RatePeriod` (domain: `entities/rate-period.ts`). Append-only (BR-RATE-001) — application code must never `UPDATE` an existing row's `annual_rate`/`effective_from`; corrections `INSERT` a new row and `UPDATE` only the superseded row's `superseded_by` column.

| Column            | Type                           | Null     | Notes                          |
| ----------------- | ------------------------------ | -------- | ------------------------------ |
| `id`              | `uuid` PK                      | not null |                                |
| `obligation_id`   | `uuid` FK → `obligations(id)`  | not null | `ON DELETE CASCADE`            |
| `user_id`         | `uuid` FK → `auth.users(id)`   | not null | denormalized (RLS)             |
| `annual_rate`     | `numeric(9,6)`                 | not null |                                |
| `effective_from`  | `date`                         | not null |                                |
| `superseded_by`   | `uuid` FK → `rate_periods(id)` | nullable | append-only correction pointer |
| `provenance_json` | `jsonb`                        | not null |                                |
| `created_at`      | `timestamptz`                  | not null | default `now()`                |

Constraints: unique `(obligation_id, effective_from)` where `superseded_by is null` (BR-OBL-002 non-overlap, enforced at the active-period layer — full ordering/gap validation is `validateRatePeriods` at the application layer, since Postgres CHECK constraints cannot express "no overlap across rows" without a trigger, and this schema deliberately keeps the invariant enforcement in one place, the domain service, rather than duplicating it in a trigger — no data path may bypass `validateRatePeriods`, so app-layer enforcement is sufficient here). Index: `(obligation_id, effective_from)`; `(user_id)`.

### 1.7 `payments`

Mirrors `Payment` (domain: `entities/payment.ts`).

| Column            | Type                           | Null     | Notes                                                         |
| ----------------- | ------------------------------ | -------- | ------------------------------------------------------------- |
| `id`              | `uuid` PK                      | not null |                                                               |
| `obligation_id`   | `uuid` FK → `obligations(id)`  | not null | `ON DELETE CASCADE`                                           |
| `user_id`         | `uuid` FK → `auth.users(id)`   | not null | denormalized (RLS)                                            |
| `paid_on`         | `date`                         | not null |                                                               |
| `amount`          | `numeric(14,3)`                | not null | CHECK `amount > 0`                                            |
| `alloc_principal` | `numeric(14,3)`                | nullable | present iff `alloc_cost`/`alloc_source` present               |
| `alloc_cost`      | `numeric(14,3)`                | nullable |                                                               |
| `alloc_source`    | `text`                         | nullable | CHECK `alloc_source in ('official','estimated')` when present |
| `period_ref`      | `uuid` FK → `rate_periods(id)` | nullable |                                                               |
| `provenance_json` | `jsonb`                        | not null |                                                               |
| `created_at`      | `timestamptz`                  | not null | default `now()`                                               |

CHECK (INV-2, app-layer mirrors `validatePaymentAllocation`): when `alloc_principal`/`alloc_cost` are present, `abs(alloc_principal + alloc_cost - amount) <= 0.005`. Index: `(obligation_id, paid_on)`; `(user_id)`.

### 1.8 `calculation_runs`

Mirrors `CalculationRun` (domain: `entities/calculation-run.ts`). `outcome_kind` implements the `CalculationOutcome` result/refused split (PHASE-02-DECISION-LOG.md §7) — confidence is only ever populated for `'result'`, never for `'refused'`.

| Column                | Type                          | Null     | Notes                                                                                                                                                                                   |
| --------------------- | ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `uuid` PK                     | not null |                                                                                                                                                                                         |
| `user_id`             | `uuid` FK → `auth.users(id)`  | not null | denormalized (RLS)                                                                                                                                                                      |
| `obligation_id`       | `uuid` FK → `obligations(id)` | nullable | nullable for aggregate (`aggregates.v1`) runs                                                                                                                                           |
| `formula_id`          | `text`                        | not null | opaque reference to the finance-engine registry — this table never imports the engine's `FormulaId` type                                                                                |
| `formula_version`     | `integer`                     | not null |                                                                                                                                                                                         |
| `as_of`               | `date`                        | not null | explicit, never derived from a clock (BR-CALC-001)                                                                                                                                      |
| `inputs_json`         | `jsonb`                       | not null | canonical JSON snapshot (`canonicalStringify` output, parsed)                                                                                                                           |
| `inputs_hash`         | `text`                        | not null | `hashCanonicalJson(inputs_json)` — reproducibility check (INV-5)                                                                                                                        |
| `outcome_kind`        | `text`                        | not null | CHECK `outcome_kind in ('result','refused')`                                                                                                                                            |
| `confidence`          | `text`                        | nullable | CHECK `confidence in ('official','high','medium','low')`; **not null iff `outcome_kind = 'result'`**                                                                                    |
| `result_json`         | `jsonb`                       | nullable | canonical result snapshot; **not null iff `outcome_kind = 'result'`** — per-formula shape (e.g. `ScheduleEntry[]`) is defined in `packages/finance-engine`, Phase 6, and is opaque here |
| `missing_fields_json` | `jsonb`                       | nullable | array of field refs; **not null iff `outcome_kind = 'refused'`** (BR-CALC-016)                                                                                                          |
| `partial_json`        | `jsonb`                       | nullable | optional limited view; only when `outcome_kind = 'refused'`                                                                                                                             |
| `assumptions_json`    | `jsonb`                       | not null | array of assumption-note strings                                                                                                                                                        |
| `calculated_at`       | `timestamptz`                 | not null |                                                                                                                                                                                         |

CHECK: `(outcome_kind = 'result' and confidence is not null and result_json is not null and missing_fields_json is null) or (outcome_kind = 'refused' and confidence is null and result_json is null and missing_fields_json is not null)`. Index: `(obligation_id, formula_id, created_at desc)`; `(user_id)`.

### 1.9 `insights`

Mirrors `Insight` (domain: `entities/insight.ts`).

| Column          | Type                          | Null     | Notes                                                                               |
| --------------- | ----------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `id`            | `uuid` PK                     | not null |                                                                                     |
| `user_id`       | `uuid` FK → `auth.users(id)`  | not null | denormalized (RLS)                                                                  |
| `obligation_id` | `uuid` FK → `obligations(id)` | nullable |                                                                                     |
| `rule_id`       | `text`                        | not null | includes the reserved `system.calculationRefused` id (PHASE-02-DECISION-LOG.md §13) |
| `severity`      | `text`                        | not null | CHECK `severity in ('info','attention','urgent','positive')`                        |
| `title_key`     | `text`                        | not null | i18n key, never inlined copy                                                        |
| `body_key`      | `text`                        | not null | i18n key                                                                            |
| `params_json`   | `jsonb`                       | nullable | i18n interpolation params                                                           |
| `trigger_hash`  | `text`                        | not null | dedup component                                                                     |
| `deep_link`     | `text`                        | nullable | validated against the route allow-list at read time, not stored validated           |
| `read_at`       | `timestamptz`                 | nullable |                                                                                     |
| `created_at`    | `timestamptz`                 | not null |                                                                                     |

Constraint: unique `(rule_id, obligation_id, trigger_hash)` (FR-INS-004 dedup key). Index: `(user_id)`.

### 1.10 `consent_records`

Mirrors `ConsentRecord` (domain: `entities/consent-record.ts`). Server-backed in personal mode (ADR-0016's consent gate restated); demo mode acknowledgment is a local key-value flag and never writes here.

| Column            | Type                         | Null     | Notes                         |
| ----------------- | ---------------------------- | -------- | ----------------------------- |
| `id`              | `uuid` PK                    | not null |                               |
| `user_id`         | `uuid` FK → `auth.users(id)` | not null |                               |
| `doc_type`        | `text`                       | not null |                               |
| `version`         | `text`                       | not null |                               |
| `locale`          | `text`                       | not null | CHECK `locale in ('en','ar')` |
| `acknowledged_at` | `timestamptz`                | not null |                               |

Index: `(user_id, doc_type)`.

## 2. Type & constraint rules

| Concern       | SQLite (future local-first — reference only)                                                              | Postgres (MVP)                                                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money         | `TEXT` carrying canonical decimal string (`Money.toStorageString()`) — SQLite REAL is a float, never used | `NUMERIC(14,3)`                                                                                                                                                                                                                       |
| Rates         | `TEXT` decimal string                                                                                     | `NUMERIC(9,6)`                                                                                                                                                                                                                        |
| Percentage    | `TEXT` decimal string (`Percentage.toStorageString()`)                                                    | stored inside `minimum_payment_rule_json` as a decimal string (no bare `percentage` column exists in MVP)                                                                                                                             |
| Dates (civil) | `TEXT` ISO `YYYY-MM-DD`                                                                                   | `DATE`                                                                                                                                                                                                                                |
| Timestamps    | `TEXT` ISO                                                                                                | `TIMESTAMPTZ`                                                                                                                                                                                                                         |
| Enums         | `TEXT` + zod check at boundary + CHECK constraint                                                         | `TEXT` + `CHECK` (Postgres native enums are avoidable churn for an MVP whose enum sets may still shift; CHECK constraints get the same safety without an `ALTER TYPE` dance)                                                          |
| Provenance    | JSON column per sourced field group                                                                       | same, `JSONB` — one `<col>_prov` column per `Sourced<T>` domain field (paired with its value column), plus record-level `provenance_json` on `obligations`                                                                            |
| Confidence    | n/a                                                                                                       | `TEXT` + `CHECK` (`calculation_runs.confidence`) — domain `Confidence` values only (`'official'\|'high'\|'medium'\|'low'`); engine's `REFUSED` maps to `outcome_kind = 'refused'`, never to this column (PHASE-02-DECISION-LOG.md §2) |

Global constraints: `rate_periods` unique `(obligation_id, effective_from)` where not superseded; `rate_periods`/`payments`/`calculation_runs`/`insights`/`loan_details`/`murabaha_details`/`card_details` all index `user_id` (RLS performance); `payments` index `(obligation_id, paid_on)`; `payments` CHECK `amount > 0`; `murabaha_details` CHECK `total_sale_price = asset_cost + disclosed_profit` within the CONV-5 tolerance; `calculation_runs` index `(obligation_id, formula_id, created_at desc)`; `insights` unique `(rule_id, obligation_id, trigger_hash)`.

## 3. Migrations (MVP — Supabase only)

- SQL migrations in `supabase/migrations/` (Phase 3 — **does not exist yet**), forward-only, committed, applied via the Supabase CLI (local `supabase start` for development). **RLS enabled in the same migration that creates each table** (NFR-SEC-002); deny-by-default; service-role only in Edge Functions. Every migration lands with pgTAP tests in the same change. Generated TypeScript types are regenerated and committed with every schema change (§8).
- ~~Local Drizzle migrations~~ — no local schema exists in MVP (ADR-0017); the Drizzle migration discipline moves to the future local-first phase.

## 4. RLS policy matrix (MVP — enforced from migration 0001, never an afterthought)

Every user-owned table below — **including the three subtype detail tables**, per the Phase 2 decision to denormalize `user_id` onto them — uses the identical policy shape: no joins, no subqueries, index-supported.

```sql
-- Pattern applies to every table in the list below.
alter table <table> enable row level security;

create policy <table>_select on <table>
  for select using (user_id = auth.uid());

create policy <table>_insert on <table>
  for insert with check (user_id = auth.uid());

create policy <table>_update on <table>
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy <table>_delete on <table>
  for delete using (user_id = auth.uid());
```

| Table              | SELECT     | INSERT                                                     | UPDATE                                                                | DELETE                                                                  | Ownership expression                  | `WITH CHECK`                                           | Service-role-only ops    | Cross-user denial                                     |
| ------------------ | ---------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ | ------------------------ | ----------------------------------------------------- |
| `profiles`         | own row    | own row (on first sign-in)                                 | own row                                                               | none (deletion goes through account-deletion workflow, §6)              | `user_id = auth.uid()`                | insert/update: row's `user_id` must equal `auth.uid()` | account-deletion erasure | 0 rows returned/affected for another user's `user_id` |
| `obligations`      | owner only | owner only                                                 | owner only                                                            | owner only                                                              | `user_id = auth.uid()`                | insert/update `user_id = auth.uid()`                   | none                     | 0 rows                                                |
| `loan_details`     | owner only | owner only                                                 | owner only                                                            | owner only                                                              | `user_id = auth.uid()` (denormalized) | same                                                   | none                     | 0 rows                                                |
| `murabaha_details` | owner only | owner only                                                 | owner only                                                            | owner only                                                              | `user_id = auth.uid()` (denormalized) | same                                                   | none                     | 0 rows                                                |
| `card_details`     | owner only | owner only                                                 | owner only                                                            | owner only                                                              | `user_id = auth.uid()` (denormalized) | same                                                   | none                     | 0 rows                                                |
| `rate_periods`     | owner only | owner only (append)                                        | owner only (only `superseded_by`, application-enforced — BR-RATE-001) | never (append-only; deletion happens only via account-deletion erasure) | `user_id = auth.uid()`                | same                                                   | none                     | 0 rows                                                |
| `payments`         | owner only | owner only                                                 | owner only                                                            | owner only                                                              | `user_id = auth.uid()`                | same                                                   | none                     | 0 rows                                                |
| `calculation_runs` | owner only | owner only (service-side, on behalf of the user's session) | none (immutable once written — a re-run inserts a new row)            | owner only                                                              | `user_id = auth.uid()`                | same                                                   | none                     | 0 rows                                                |
| `insights`         | owner only | owner only (raised by application services)                | owner only (`read_at` only)                                           | owner only                                                              | `user_id = auth.uid()`                | same                                                   | none                     | 0 rows                                                |
| `consent_records`  | owner only | owner only                                                 | none (append new acknowledgment row instead of editing)               | never                                                                   | `user_id = auth.uid()`                | same                                                   | none                     | 0 rows                                                |

Denial behavior (all tables): a cross-user `SELECT` returns **zero rows** (not an error) — RLS filters rows, it does not raise; a cross-user `INSERT`/`UPDATE` violating `WITH CHECK` raises a Postgres policy-violation error, mapped to the domain `authorization` `AppError` code at the repository boundary. The pgTAP suite (Phase 3) creates two test users, inserts rows for user A under every table above, and asserts user B's session returns zero rows and cannot write against user A's `user_id`.

## 5. Erasure (FR-SET-003 / FR-AUTH-003) — MVP behavior per ADR-0017

- **Demo mode:** "reset demo" re-runs the seed builders (in-memory — nothing to delete from a database). Key-value preferences cleared on full reset; return to onboarding.
- **Personal mode:** account deletion = server-side erasure of all user-owned rows across every table in §1 (single workflow, verified by absence checks under the user's id) + audit event; local key-value preferences and query cache cleared; session revoked. See §6 for the full deletion contract.

## 6. Account deletion contract (personal mode)

**Deletion order** (children before parents, respecting FKs — though `ON DELETE CASCADE` from `obligations` already covers most of this; the explicit order matters for the audit event and for tables with no FK to `obligations`):

1. `insights` (all rows for the user)
2. `calculation_runs`
3. `payments`
4. `rate_periods`
5. `card_details` / `murabaha_details` / `loan_details` (or rely on `ON DELETE CASCADE` from `obligations`)
6. `obligations`
7. `consent_records`
8. `profiles`
9. `auth.users` row itself (via Supabase Admin API, server-side / Edge Function only — never client-callable)

**Cascade/restrict behavior:** all obligation-child tables (`loan_details`, `murabaha_details`, `card_details`, `rate_periods`, `payments`, `calculation_runs` where `obligation_id` is set, `insights` where `obligation_id` is set) use `ON DELETE CASCADE` from `obligations(id)`, so deleting an `obligations` row is sufficient for those; the explicit order above exists for tables that are not FK-children of `obligations` (`consent_records`, `profiles`) and for the audit-event ordering requirement below.

**What is deleted:** every row in every table in §1 owned by the user's `auth.uid()` — no exceptions, no soft-delete/tombstone rows left behind.

**What is retained:** a single audit event (P1 `audit_events` table, reserved but not created in MVP — see below) recording `{userIdHash, deletedAt, tableCounts}` — the audit event itself contains no financial values, no obligation content, and stores a one-way hash of the user id rather than the id itself, so it cannot be used to reconstruct anything about the deleted account. **MVP does not yet implement `audit_events`** (P1-reserved, per the original ERD's P1-only table list) — until it lands, the deletion workflow's own Edge Function invocation log (already retained by Supabase infrastructure logging, outside application tables) is the only trace, and this is recorded as a known MVP limitation, not a silent gap.

**What is anonymized:** nothing — full erasure is chosen over anonymization for MVP (no legitimate product reason to retain a de-identified shadow of a user's financial data; anonymization is a heavier compliance surface than deletion for a solo-developer MVP under RES-003/PDPL review).

**What is never stored:** provider secrets (never client-side, never in any table — NFR-SEC-001), raw payment-instrument data (never collected), passwords (Supabase Auth manages credential hashing, out of application schema entirely).

**Local preference/cache cleanup:** the client is responsible for clearing (a) the key-value preference store (MMKV/AsyncStorage — locale, onboarding flags, dismissed-notice pointers), (b) TanStack Query's in-memory cache, and (c) SecureStore session tokens, all immediately upon a successful deletion response — this is an `apps/mobile` responsibility (Phase 4), not a schema concern, stated here so Phase 4 has a checklist.

**Verification:** the deletion workflow (Edge Function, Phase 4) re-queries every table in §1 for the deleted `user_id` post-deletion and asserts zero rows before returning success to the client; this absence check is the deletion contract's acceptance test, mirrored by a pgTAP test in Phase 3 (insert fixture rows for a test user across every table, invoke the erasure routine, assert zero rows remain in each table for that user).

## 7. Demo-mode exclusion

- **Bundled demo data is never inserted into Supabase** — demo mode's `Demo*Repository` implementations (Phase 5) are pure in-memory, backed by `packages/demo-data` seed builders, with no network calls of any kind.
- **Demo entities do not require authenticated ownership** — demo mode's domain-level `userId` is a mode-neutral sentinel (PHASE-02-DECISION-LOG.md §4) that is meaningful only within the running process; it has no corresponding `auth.users` row and is never sent to Supabase.
- **Demo repositories are in-memory**; **personal repositories are Supabase-backed** — both implement the identical `packages/domain/src/contracts/repositories.ts` port interfaces (PHASE-02-DECISION-LOG.md §5), so application services and UI code are mode-agnostic.
- **Both satisfy the same application-facing contracts** — the composition root (`apps/mobile/src/services/composition-root.ts`, Phase 4) is the only place `dataMode` selects which repository family to construct; no other code branches on demo vs. personal for business logic (ADR-0009).

## 8. Generated types

- **Destination:** `apps/mobile/src/core/supabase/database.types.ts` (generated; Phase 3/4 creates the directory — it does not exist yet in Phase 2).
- **Generation command:** `supabase gen types typescript --local > apps/mobile/src/core/supabase/database.types.ts` (or `--project-id <ref>` against a hosted project for CI regeneration).
- **Committed:** yes — generated output is committed so typechecking/CI doesn't require live Supabase access; it is regenerated and re-committed in the same PR as any migration change (never hand-edited — AI_AGENT_RULES §16).
- **Drift detection in CI:** a CI step re-runs the generation command against the migrations in the PR and diffs the result against the committed file; a non-empty diff fails the build (wired up in Phase 3, when `supabase/migrations/` first exists).
- **Rule:** generated row types (`Database['public']['Tables'][...]['Row']`) are consumed **only** inside Supabase repository implementations (the infrastructure layer) for row ↔ domain entity mapping. They must never appear in `packages/domain`, application services, or any UI/component/hook — the domain entities in `packages/domain/src/entities` are the only types those layers see (system-architecture.md §2, enforced by `.dependency-cruiser.cjs`'s domain-purity rules, which already forbid `packages/domain` from importing `@supabase/*`).

## 9. Future local-first enhancement (NOT MVP — reference only)

The previous plan's local SQLite schema (expo-sqlite + Drizzle, money as decimal `TEXT`, ISO-`TEXT` dates, `sourcedText` paired provenance columns, drizzle-kit migrations, a local `user_preferences`-style table, transactional local erasure, and the `localProfileId` identity/remapping strategy) is **postponed in full** to the post-MVP local-first phase. The SQLite column in §2's type table and ADR-0006's technology analysis are the design reference for that work. See [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md). Do not create any SQLite schema, Drizzle config, or local migrations during the MVP phases.

**P1-only tables (reserved, not created in MVP):** `data_connections`, `sync_runs`, `audit_events`, `import_records` (normalized provider payload references). `auth.users`/profile identity is Supabase Auth's own table plus `profiles` above — no separate MVP `users` table is created.
