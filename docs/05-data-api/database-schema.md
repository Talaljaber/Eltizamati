# Database Schema — Supabase Postgres (MVP)

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** this schema is now implemented **once, in Supabase Postgres, as the MVP persistent schema.** There is **no local SQLite schema in the MVP** — the SQLite column of the type-mapping table below is retained only as future-scope reference (see "Future local-first enhancement" at the end of this file). Key deltas from the text below:
> - **`user_id` is NON-NULL on every user-owned table from the first migration** (obligations, rate_periods, payments, calculation_runs, insights, consent_records). The "nullable MVP, non-null P1" annotations in the ERD are superseded — no nullable-ownership shortcuts.
> - **RLS is enabled in the same migration that creates each table** (§4 pattern) with pgTAP cross-user tests — this is MVP-blocking, not P1.
> - The **localProfileId → auth.uid() remapping strategy (§ below the ERD) is superseded**: personal mode requires sign-in before any personal data is written, so rows are created with `auth.uid()` from the start. No MMKV profile-id backfill exists.
> - `user_preferences` is **not a database table in MVP** — device preferences live in key-value storage (ADR-0006 surviving clauses).
> - **Bundled demo data is never inserted into Supabase** — demo mode is in-memory (ADR-0017 §2).
> - Generated types (`supabase gen types typescript`) are committed and are the typed boundary for repositories.
> - Domain contracts must be finalized (Phase 2 of [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md)) **before** migration 0001 is written — the ERD below predates the domain-model reconciliation and is corrected by the Phase 2 deliverable where they disagree.

**One schema, one shape:** the Postgres/Supabase schema is the MVP system of record for personal-mode data. Subtype modeling per ADR-0008: common `obligations` table + per-family detail tables (no giant nullable table — SRC-1 §21.1).

## 1. ERD (both schemas; P1-only tables marked)

```mermaid
erDiagram
    obligations ||--o| loan_details : "kind=conventionalLoan"
    obligations ||--o| murabaha_details : "kind=murabaha"
    obligations ||--o| card_details : "kind=creditCard"
    obligations ||--o{ rate_periods : has
    obligations ||--o{ payments : has
    obligations ||--o{ calculation_runs : about
    obligations ||--o{ insights : about
    users ||--o{ obligations : owns
    users ||--o{ consent_records : gave
    users ||--o{ audit_events : "P1"
    data_connections ||--o{ sync_runs : "P1"

    obligations {
        uuid id PK
        uuid user_id FK "P1; MVP single local profile"
        text kind "enum: conventionalLoan|murabaha|ijara|diminishingMusharakah|creditCard|genericFacility"
        text nickname
        text institution_name
        text currency "JOD"
        date opened_date
        date closed_date
        text notes
        text provenance_json "record-level Provenance"
        timestamptz created_at
        timestamptz updated_at
    }
    loan_details {
        uuid obligation_id PK FK
        numeric original_principal "numeric(14,3)"
        numeric outstanding_balance
        text outstanding_balance_prov "field provenance json"
        numeric installment
        text rate_type "fixed|variable|mixed|unknown"
        int term_months
        date start_date
        date maturity_date
        date first_payment_date
        text payment_frequency "monthly"
        text purpose
        numeric contractual_balloon
    }
    murabaha_details {
        uuid obligation_id PK FK
        numeric asset_cost
        text asset_cost_prov "field provenance json (Sourced<Money>)"
        numeric disclosed_profit
        text disclosed_profit_prov "field provenance json"
        numeric total_sale_price
        text total_sale_price_prov "field provenance json"
        numeric installment
        text installment_prov "field provenance json"
        int term_months
        date start_date
        numeric profit_rate_disclosed "display-only; no prov needed (non-material)"
    }
    card_details {
        uuid obligation_id PK FK
        numeric credit_limit
        text credit_limit_prov "field provenance json (Sourced<Money>)"
        numeric current_balance
        text current_balance_prov "field provenance json"
        numeric statement_balance
        text statement_balance_prov "field provenance json; nullable"
        date statement_date
        text min_payment_rule_json
        numeric purchase_apr
        text purchase_apr_prov "field provenance json; nullable"
        numeric cash_advance_apr
        text cash_advance_apr_prov "field provenance json; nullable"
        date due_date
        int grace_days
        text fees_json
    }
    rate_periods {
        uuid id PK
        uuid obligation_id FK
        uuid user_id FK "denormalized; nullable MVP, non-null P1; enables direct RLS"
        numeric annual_rate "numeric(9,6)"
        date effective_from
        uuid superseded_by FK "append-only corrections BR-RATE-001"
        text provenance_json
        timestamptz created_at
    }
    payments {
        uuid id PK
        uuid obligation_id FK
        uuid user_id FK "denormalized; nullable MVP, non-null P1; enables direct RLS"
        date paid_on
        numeric amount
        numeric alloc_principal
        numeric alloc_cost
        text alloc_source "official|estimated|null"
        text provenance_json
        timestamptz created_at
    }
    calculation_runs {
        uuid id PK
        uuid obligation_id FK "nullable for aggregates"
        uuid user_id FK "denormalized; nullable MVP, non-null P1; enables direct RLS"
        text formula_id
        int formula_version
        text inputs_json "canonical"
        text inputs_hash
        text result_json
        text confidence
        text assumptions_json
        date as_of
        timestamptz created_at
    }
    insights {
        uuid id PK
        uuid obligation_id FK "nullable"
        uuid user_id FK "denormalized; nullable MVP, non-null P1; enables direct RLS"
        text rule_id
        text severity
        text params_json "i18n params"
        text trigger_hash "dedup"
        text deep_link
        timestamptz read_at
        timestamptz created_at
    }
    consent_records {
        uuid id PK
        uuid user_id FK "nullable MVP (local), non-null P1 (server-backed per ADR-0016); enables direct RLS"
        text doc_type
        text version
        text locale
        timestamptz acknowledged_at
    }
    user_preferences {
        text key PK
        text value_json
    }
```

P1-only: `users` (Supabase auth.users + profile), `data_connections`, `sync_runs`, `audit_events`, `import_records` (normalized provider payload references). Reserved now; not created in MVP SQLite.

**~~Local-profile identity strategy (MVP → P1 transition)~~ — SUPERSEDED by ADR-0017:** personal mode requires Supabase sign-in before any personal data is written, so every row carries `auth.uid()` as a non-null `user_id` from creation. There is no `localProfileId`, no MMKV identity, and no remapping transaction in the MVP. (The remapping design is preserved in [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md) for the future offline/local-cache work, where a device-generated identity becomes relevant again.)

## 2. Type & constraint rules

| Concern       | SQLite (MVP)                                                                                                                                                                                                                                                                                                                                                                       | Postgres (P1)   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Money         | `TEXT` carrying canonical decimal string (Drizzle custom type ↔ `Money`) — SQLite REAL is a float, never used                                                                                                                                                                                                                                                                      | `NUMERIC(14,3)` |
| Rates         | `TEXT` decimal string                                                                                                                                                                                                                                                                                                                                                              | `NUMERIC(9,6)`  |
| Dates (civil) | `TEXT` ISO `YYYY-MM-DD`                                                                                                                                                                                                                                                                                                                                                            | `DATE`          |
| Timestamps    | `TEXT` ISO                                                                                                                                                                                                                                                                                                                                                                         | `TIMESTAMPTZ`   |
| Enums         | `TEXT` + zod check at boundary + CHECK constraint                                                                                                                                                                                                                                                                                                                                  | Postgres enums  |
| Provenance    | JSON column per sourced field group. **Field-level `_prov` columns** exist for every `Sourced<T>` field in the domain model (see ERD above: `outstanding_balance_prov`, murabaha `*_prov`, card `*_prov`). Record-level `provenance_json` on `obligations` covers non-sourced metadata fields. Drizzle custom type `sourcedText(col)` emits the paired `col` + `col_prov` columns. | same, JSONB     |

Constraints (both): `rate_periods` unique `(obligation_id, effective_from)` where not superseded; `rate_periods`, `payments`, `calculation_runs`, `insights` index on `user_id` (for RLS performance); `payments` index `(obligation_id, paid_on)`; CHECK amount > 0; murabaha CHECK `total_sale_price = asset_cost + disclosed_profit` (tolerance handled at app layer, DB stores exact entered values — violation surfaces as data error per BR-OBL-003); `calculation_runs` index `(obligation_id, formula_id, created_at desc)`; `insights` unique `(rule_id, obligation_id, trigger_hash)` (FR-INS-004).

## 3. Migrations (MVP — Supabase only)

- SQL migrations in `supabase/migrations/`, forward-only, committed, applied via the Supabase CLI (local `supabase start` for development). **RLS enabled in the same migration that creates each table** (NFR-SEC-002); policy pattern: `user_id = auth.uid()` on every user-data table; deny-by-default; service-role only in Edge Functions. Every migration lands with pgTAP tests in the same change. Generated TypeScript types are regenerated and committed with every schema change (controlled codegen rule — never hand-edited).
- ~~Local Drizzle migrations~~ — no local schema exists in MVP (ADR-0017); the Drizzle migration discipline moves to the future local-first phase.

## 4. RLS policy sketch (MVP — enforced from migration 0001, never an afterthought)

All user-data tables carry `user_id` directly (see ERD). This means every table uses the same simple policy — no joins, no subqueries, index-supported:

```sql
-- Pattern applies to: obligations, rate_periods, payments,
--                     calculation_runs, insights, consent_records
alter table <table> enable row level security;
create policy <table>_owner on <table>
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Every user-data table: same pattern + pgTAP tests asserting cross-user access fails (NFR-SEC-002). The pgTAP suite creates two test users, inserts rows for user A, and asserts that user B's session returns zero rows from every table above.

## 5. Erasure (FR-SET-003 / FR-AUTH-003) — MVP behavior per ADR-0017

- **Demo mode:** "reset demo" re-runs the seed builders (in-memory — nothing to delete from a database). Key-value preferences cleared on full reset; return to onboarding.
- **Personal mode:** account deletion = server-side erasure of all user-owned rows (single workflow, verified by absence checks under the user's id) + audit event; local key-value preferences and query cache cleared; session revoked.

## 6. Future local-first enhancement (NOT MVP — reference only)

The previous plan's local SQLite schema (expo-sqlite + Drizzle, money as decimal `TEXT`, ISO-`TEXT` dates, `sourcedText` paired provenance columns, drizzle-kit migrations, `user_preferences` table, transactional local erasure, and the `localProfileId` identity/remapping strategy) is **postponed in full** to the post-MVP local-first phase. The SQLite column in §2's type table and ADR-0006's technology analysis are the design reference for that work. See [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md). Do not create any SQLite schema, Drizzle config, or local migrations during the MVP phases.
