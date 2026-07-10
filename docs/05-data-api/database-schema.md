# Database Schema — Local (MVP) & Supabase (P1 target)

**Two schemas, one shape:** the local SQLite schema (Drizzle, MVP system of record) and the Postgres/Supabase schema (P1) share table/column names and the domain mapping so P1 migration is mechanical. Subtype modeling per ADR-0008: common `obligations` table + per-family detail tables (no giant nullable table — SRC-1 §21.1).

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

**Local-profile identity strategy (MVP → P1 transition):** on first launch the app generates a stable UUID v7 (`localProfileId`) stored in MMKV. Every obligation, child row, and consent record written in MVP is stamped with this id in the `user_id` column. On M6 sign-in, `ConsentService.linkAccount(supabaseUid)` writes a one-time mapping `localProfileId → auth.uid()` and updates all `user_id` values in a single transaction before the first server sync. This makes the backfill mechanical and testable without any schema change.

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

## 3. Migrations

- Local: Drizzle migrations, forward-only, committed; tested against seeded previous version (NFR-REL-002). Migration files are generated (drizzle-kit) then reviewed — no hand-edited generated files (controlled codegen rule).
- P1 Supabase: SQL migrations in `supabase/migrations/`, **RLS enabled in the same migration that creates each table** (NFR-SEC-002); policy pattern: `user_id = auth.uid()` on every user-data table; deny-by-default; service-role only in Edge Functions.

## 4. RLS policy sketch (P1, written now so it's never an afterthought)

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

## 5. Local erasure (FR-SET-003)

`DELETE` all rows in one transaction + MMKV clear + return to onboarding; verified by a test that counts all tables = 0. P1 adds server-side erasure workflow + audit event (FR-AUTH-003).
