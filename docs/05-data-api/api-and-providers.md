# API & Provider Contracts

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** the Supabase surface described in §2 as "P1 design freeze, not built" is now **built in the MVP** (Phases 3–4): PostgREST CRUD under RLS via supabase-js behind the repository interfaces, Supabase JWT auth with SecureStore tokens, generated database types. The application-service contracts in §1 are unchanged and are implemented against **two repository families**: in-memory demo repositories (demo mode) and Supabase repositories (personal mode). `MaintenanceService.eraseAll()` = account deletion + server-side erasure in personal mode, reset-demo in demo mode. Edge Functions remain scoped to privileged operations (account deletion workflow, future provider proxying).

**MVP:** the "API" clients see is the application-service layer's typed contracts (below); personal mode is backed by **Supabase (PostgREST CRUD under RLS + Edge Functions for privileged operations)**; demo mode is backed by bundled in-memory repositories.

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

- **CRUD:** Supabase PostgREST on the schema (RLS-guarded); client uses supabase-js through the same repository interfaces (demo in-memory ↔ Supabase repos swap at the composition root; services unchanged — that's the seam; a future local read-cache slots in the same way per ADR-0017 §5).
- **Edge Functions (TypeScript/Deno):** `POST /providers/crif/sync` (consent-checked, secrets server-side, returns normalized import records) · `POST /account/delete` (erasure workflow + audit) · `POST /export` (server-side export) — all with `Idempotency-Key` header support and rate limiting (Supabase built-ins + per-user counters).
- **Versioning:** Edge Function routes under `/v1/`; breaking changes → `/v2/` + deprecation window. DTO schemas shared via `packages/domain` zod (client and functions import the same schemas — the monorepo payoff).
- **Idempotency:** client-generated uuid v7 entity ids; upsert semantics on sync; `Idempotency-Key` for non-entity commands.
- **Auth:** ADR-0019 email/password (`signUp`, `signInWithPassword`) plus in-app signup `verifyOtp`; Supabase JWT/session refresh; tokens in SecureStore. Profile provisioning is authenticated, RLS-bound, insert-only-if-absent, and precedes consent/repository entry.

## 3. External provider contracts (P1; shapes assumed per ASM-003 — revalidate against real sandbox docs, RES-002)

`ProviderObligation` (zod): `externalRef, institution {name, code?}, kind (mapped from provider product codes via explicit table — unmapped codes → genericFacility, never guessed), originalAmount?, outstandingBalance? + asOf, creditLimit?, status, currency, raw payload reference`.
`ProviderPayment`: `externalRef, obligationRef, date, amount, status`.
Mapping tables (provider code → domain kind) are data, reviewed by finance teammates, not inline switch statements.

## 4. Contract tests

- Every provider implementation passes the same contract test suite (fixtures → expected domain entities + provenance) — mock and real must be substitutable (§35.6).
- Edge Function DTOs round-trip the shared zod schemas in CI (P1).
