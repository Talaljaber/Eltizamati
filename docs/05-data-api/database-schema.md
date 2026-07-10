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
        numeric disclosed_profit
        numeric total_sale_price
        numeric installment
        int term_months
        date start_date
        numeric profit_rate_disclosed "display-only"
    }
    card_details {
        uuid obligation_id PK FK
        numeric credit_limit
        numeric current_balance
        numeric statement_balance
        date statement_date
        text min_payment_rule_json
        numeric purchase_apr
        numeric cash_advance_apr
        date due_date
        int grace_days
        text fees_json
    }
    rate_periods {
        uuid id PK
        uuid obligation_id FK
        numeric annual_rate "numeric(9,6)"
        date effective_from
        uuid superseded_by FK "append-only corrections BR-RATE-001"
        text provenance_json
        timestamptz created_at
    }
    payments {
        uuid id PK
        uuid obligation_id FK
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

## 2. Type & constraint rules

| Concern | SQLite (MVP) | Postgres (P1) |
|---------|--------------|----------------|
| Money | `TEXT` carrying canonical decimal string (Drizzle custom type ↔ `Money`) — SQLite REAL is a float, never used | `NUMERIC(14,3)` |
| Rates | `TEXT` decimal string | `NUMERIC(9,6)` |
| Dates (civil) | `TEXT` ISO `YYYY-MM-DD` | `DATE` |
| Timestamps | `TEXT` ISO | `TIMESTAMPTZ` |
| Enums | `TEXT` + zod check at boundary + CHECK constraint | Postgres enums |
| Provenance | JSON column per sourced field group (pragmatic: field-level provenance for the material fields listed in domain model; record-level otherwise) | same, JSONB |

Constraints (both): `rate_periods` unique `(obligation_id, effective_from)` where not superseded; `payments` index `(obligation_id, paid_on)`; CHECK amount > 0; murabaha CHECK `total_sale_price = asset_cost + disclosed_profit` (tolerance handled at app layer, DB stores exact entered values — violation surfaces as data error per BR-OBL-003); `calculation_runs` index `(obligation_id, formula_id, created_at desc)`; `insights` unique `(rule_id, obligation_id, trigger_hash)` (FR-INS-004).

## 3. Migrations
- Local: Drizzle migrations, forward-only, committed; tested against seeded previous version (NFR-REL-002). Migration files are generated (drizzle-kit) then reviewed — no hand-edited generated files (controlled codegen rule).
- P1 Supabase: SQL migrations in `supabase/migrations/`, **RLS enabled in the same migration that creates each table** (NFR-SEC-002); policy pattern: `user_id = auth.uid()` on every user-data table; deny-by-default; service-role only in Edge Functions.

## 4. RLS policy sketch (P1, written now so it's never an afterthought)

```sql
alter table obligations enable row level security;
create policy obligations_owner on obligations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- child tables derive ownership via obligation join or denormalized user_id (choose denormalized user_id for policy simplicity + index)
```
Every user-data table: same pattern + pgTAP tests asserting cross-user access fails (docs/07 testing).

## 5. Local erasure (FR-SET-003)
`DELETE` all rows in one transaction + MMKV clear + return to onboarding; verified by a test that counts all tables = 0. P1 adds server-side erasure workflow + audit event (FR-AUTH-003).
