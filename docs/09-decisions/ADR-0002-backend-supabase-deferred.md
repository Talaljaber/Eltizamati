# ADR-0002 — Backend: Supabase, Designed Now, Deployed Post-Hackathon

- **Status:** Accepted
- **Date:** 2026-07-10
- **Confidence:** High for "no backend in MVP"; Medium-High for Supabase as the P1 platform (revalidate at P1 start against then-current options)
- **Reversal cost:** MVP part — none (nothing deployed). P1 platform — Medium (schema is plain Postgres; auth/RLS/Edge Functions are the Supabase-specific surfaces; repositories isolate supabase-js).
- **⚠ Amended by ADR-0016 (2026-07-10):** the three-week timeline moved the backend from "deployed post-hackathon" to **deployed during the build (M6) as a secondary track**. The Supabase _platform choice below is unchanged_; only the timing of activation moves earlier. The demo still runs with no backend on its critical path.

## Context & forces

The demo path needs zero network (NFR-REL-001, demo risk); production needs auth, consent records, server-side authorization (§35.8), and a server home for provider secrets (§35.7). Solo dev: minimize operated infrastructure. Relational, RLS-capable storage fits the domain (obligations/payments/rate periods are relational to the bone).

## Alternatives considered

- **No backend ever (local-only product):** maximal privacy, but forecloses CRIF/Open Banking, multi-device, and recovery — contradicts the product vision (§9). Rejected as end-state, embraced as MVP stage.
- **Supabase — chosen for P1:** Postgres + **RLS as the server-side authorization non-negotiable made structural**; Auth, Edge Functions (TypeScript — shares zod schemas with the app via monorepo), local dev via `supabase start`, SQL migrations in-repo. Solo-dev ops ≈ zero. Failure modes: vendor coupling (guarded: plain-SQL schema, repository seam), RLS policy mistakes (guarded: pgTAP suite, NFR-SEC-002).
- **Firebase:** Firestore's document model fights the relational domain; security rules are weaker than RLS for relational ownership chains; no SQL migrations story. Rejected.
- **Custom Node/NestJS + Postgres:** maximum control, maximum surface for a solo dev to build auth, ops, and security correctly under deadline pressure. Unjustified cost now; remains the escape hatch if Supabase limits bite (schema ports as-is).
- **PocketBase:** charming single binary, but SQLite-server + smaller ecosystem + self-hosting duty; weaker fit for RLS-grade multi-tenant guarantees. Rejected.

## Decision

1. **MVP ships with no backend** — SQLite is the system of record (ADR-0013); demo runs in airplane mode.
2. **Supabase is the committed P1 platform**: schema + RLS policies + consent/audit tables live in `/supabase` from the start (written with the local schema in lockstep — docs/05), so "adding the backend" is deployment + repository swap, not redesign.
3. Provider integrations (CRIF/Open Banking) run exclusively through Edge Functions — secrets never client-side.

## Consequences

- Demo risk profile collapses to "does the phone turn on"; honesty story strengthens (no fake connectivity).
- Auth/consent/multi-device deferred — acceptable per DEC-001.
- Discipline required: any schema change updates both Drizzle (SQLite) and `/supabase` migrations in the same PR (review checklist item).
- CON-08 (server-side authorization non-negotiable) satisfied structurally: the rule binds the P1 surface and its enforcement (RLS-from-first-migration) is pre-committed.

## Validation required

At P1 start: confirm Supabase region/data-residency options against RES-003 (PDPL) findings; re-benchmark auth alternatives only if requirements changed.
