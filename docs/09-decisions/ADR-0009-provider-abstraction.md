# ADR-0009 — Provider Abstraction & Demo Data Strategy

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low

## Context & forces

Five source classes (real/sandbox/mock/manual/demo) with honest labeling (C-07, §35.6); CRIF/Open Banking unavailable now (RES-002); the demo must not be integration theater; P1 must reuse today's plumbing.

## Alternatives

- **Hardcode seed into the app, add providers later:** fastest today, guarantees a P1 rewrite of the ingestion path and invites "demo-only" code branches — the dishonesty smell. Rejected.
- **Full provider framework (registration, capabilities, scheduling):** over-built for two implementations. Rejected.
- **Thin contract + one import pipeline — chosen:** `ObligationDataProvider` interface (provider-abstraction.md), zod-validated DTOs, one `ImportService` used by demo today and CRIF later; provenance stamped at the boundary. The demo _rehearses_ the real path.

## Decision

As specified in `docs/04-architecture/provider-abstraction.md` + `docs/05-data-api/seed-demo-data.md`: typed seed builders in `packages/demo-data` (date-anchored, versioned), DemoSeedProvider through the real pipeline, provider status honestly rendered (SCR-DATA-STATUS). P1 real providers live behind Supabase Edge Functions (secrets server-side).

## Consequences

Demo data exercises validation/mapping/provenance code (free integration testing); "connect a bank" later touches zero UI data paths. Obligation: no code path may branch on `demo` for business logic (only for labeling/reset affordances) — review checklist.
