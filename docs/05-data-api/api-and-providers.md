# API & Provider Contracts

**MVP:** there is no network API — the "API" is the application-service layer's typed contracts (below), which is exactly what becomes the client of the P1 HTTP surface. **P1:** Supabase (PostgREST for CRUD under RLS + Edge Functions for provider proxying and privileged operations).

## 1. Application service contracts (MVP; stable across P1)

| Service              | Operations (Result<T, AppError>)                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ObligationService`  | `list()`, `get(id)`, `create(CreateObligationCmd)` (type-discriminated per kind), `update(id, patch)`, `archive(id)`, `delete(id)`             |
| `PaymentService`     | `listFor(obligationId)`, `log(LogPaymentCmd)` (validations US-005), duplicate check (S)                                                        |
| `RateService`        | `historyFor(obligationId)`, `logChange(LogRateChangeCmd)` (BR-OBL-002 validation)                                                              |
| `CalculationService` | `projectionFor(obligationId, asOf)`, `scenario(obligationId, ScenarioCmd)`, `explain(runId)`, `aggregates(asOf)` — persists runs (FR-CALC-005) |
| `InsightService`     | `list()`, `markRead(id)`, internal `evaluateRules(events)`                                                                                     |
| `ImportService`      | `runProvider(providerId)` (pipeline in provider-abstraction.md §3)                                                                             |
| `ConsentService`     | `acknowledge(docType, version)`, `status()`                                                                                                    |
| `MaintenanceService` | `eraseAll()`, `resetDemo()`, `exportJson()` (S)                                                                                                |

Commands/queries are zod-validated DTOs in each feature's `api/` module; services are the only writers; every mutation emits domain events (domain-model.md §6).

## 2. P1 HTTP surface (design freeze, not built)

- **CRUD:** Supabase PostgREST on the schema (RLS-guarded); client uses supabase-js through the same repository interfaces (repos swap SQLite→remote+cache; services unchanged — that's the migration seam).
- **Edge Functions (TypeScript/Deno):** `POST /providers/crif/sync` (consent-checked, secrets server-side, returns normalized import records) · `POST /account/delete` (erasure workflow + audit) · `POST /export` (server-side export) — all with `Idempotency-Key` header support and rate limiting (Supabase built-ins + per-user counters).
- **Versioning:** Edge Function routes under `/v1/`; breaking changes → `/v2/` + deprecation window. DTO schemas shared via `packages/domain` zod (client and functions import the same schemas — the monorepo payoff).
- **Idempotency:** client-generated uuid v7 entity ids; upsert semantics on sync; `Idempotency-Key` for non-entity commands.
- **Auth:** Supabase JWT; session refresh via supabase-js; tokens in SecureStore (NFR-SEC-003).

## 3. External provider contracts (P1; shapes assumed per ASM-003 — revalidate against real sandbox docs, RES-002)

`ProviderObligation` (zod): `externalRef, institution {name, code?}, kind (mapped from provider product codes via explicit table — unmapped codes → genericFacility, never guessed), originalAmount?, outstandingBalance? + asOf, creditLimit?, status, currency, raw payload reference`.
`ProviderPayment`: `externalRef, obligationRef, date, amount, status`.
Mapping tables (provider code → domain kind) are data, reviewed by finance teammates, not inline switch statements.

## 4. Contract tests

- Every provider implementation passes the same contract test suite (fixtures → expected domain entities + provenance) — mock and real must be substitutable (§35.6).
- Edge Function DTOs round-trip the shared zod schemas in CI (P1).
