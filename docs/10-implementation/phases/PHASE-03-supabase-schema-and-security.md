# Phase 3 — Supabase Schema and Security Foundation

## Status

Planned

## Objective

A deployable `supabase/` project exists in-repo: migrations create every MVP table with constraints, indexes, **RLS enabled in the same migration**, pgTAP cross-user tests green, and committed generated TypeScript types — verifiable entirely without app code.

## Why This Phase Exists

Personal mode's entire trust story rests on ownership isolation (NFR-SEC-002, T-05). Building the schema+security layer alone — before any client wiring — lets it be verified with pure SQL/pgTAP evidence and keeps the highest-risk new surface (first backend) small and reviewable. Split from Phase 4 deliberately (9-phase rationale, IMPLEMENTATION_PLAN §1).

## Preconditions

Phase 2 complete (frozen domain contracts + schema/RLS design + completion report). **User has provisioned or approved a Supabase account/org and region** (RES-003 data-residency awareness); agents must not create cloud accounts unilaterally. Supabase CLI available; local `supabase start` works on the dev machine.

## In Scope

1. `supabase/` project structure (config, `migrations/`, `tests/`), wired for local development via `supabase start`.
2. Environment configuration: typed `core/config` entries for `SUPABASE_URL` / anon key (validation only — no client usage yet); `.env.example`; secrets policy (anon key only; nothing secret committed — gitleaks-safe).
3. Migrations creating (per the Phase-2 frozen design): `obligations`, `loan_details`, `murabaha_details`, `card_details`, `rate_periods`, `payments`, `calculation_runs`, `insights`, `consent_records`, profile table per Phase-2 decision — each with: non-null `user_id` (FK to `auth.users`), CHECK constraints (amount > 0, murabaha price-sum, enum checks), unique/index rules from database-schema.md §2, `NUMERIC(14,3)`/`NUMERIC(9,6)` money/rate columns, provenance columns, timestamps.
4. **RLS in the creating migration** for every user-data table: deny-by-default, `user_id = auth.uid()` for all + with-check.
5. pgTAP suite: two test users; for every table assert user B reads zero of user A's rows and cannot insert/update/delete across the boundary; constraint tests (murabaha sum, positive amounts, rate-period uniqueness).
6. Generated types: `supabase gen types typescript` output committed at the Phase-2-agreed path; regeneration command documented.
7. Account-deletion groundwork: the erasure order/cascade design implemented as far as pure SQL allows (FK cascades or a deletion function); full workflow lands in Phase 4.

## Out of Scope

supabase-js client usage, auth flows/screens, repositories, TanStack Query (all Phase 4) · Edge Functions beyond what deletion groundwork strictly needs · seed/demo data (never inserted into Supabase — ADR-0017) · any app UI · real personal data (synthetic only until RES-003 clears).

## Architecture Decisions Applied

ADR-0017 (Supabase-first; RLS-in-creating-migration; non-null ownership) · ADR-0008 (class-table inheritance) · database-schema.md (as corrected in Phase 2) · NFR-SEC-001/002 · security-controls.md.

## Required Implementation Work

- **Data/backend:** everything in In Scope 1–7.
- **Security:** RLS policies + pgTAP; verify anon/service-role separation; confirm nothing secret lands in repo.
- **Testing:** pgTAP suite; a CI job (extend `ci.yml`) that spins up local Supabase (or ephemeral container), applies migrations, runs pgTAP.
- **Documentation:** `database-schema.md` marked as implemented (link migrations); README section for `supabase start` workflow; STATUS.md.

## Expected Files and Packages

`supabase/config.toml` · `supabase/migrations/0001_*.sql` (+ further numbered files) · `supabase/tests/*.sql` (pgTAP) · `packages/domain` or `apps/mobile/src/core/config` env typing · generated types file (path per Phase-2 decision) · `.github/workflows/ci.yml` (extended). (Suggested paths.)

## Public Interfaces Produced

The live schema (tables/columns/constraints), RLS guarantees, and committed generated types — Phase 4's compile-time and runtime foundation.

## Testing Requirements

pgTAP: cross-user denial per table (read + write), constraint violations rejected, RLS enabled-flag asserted per table. Migration idempotency: fresh `supabase db reset` applies cleanly.

## Verification Commands

```
supabase start && supabase db reset      # migrations apply clean
supabase test db                          # pgTAP green
supabase gen types typescript --local     # matches committed types (no diff)
pnpm run check
```

## Manual Validation

Supabase Studio (local): visually confirm RLS badges on every table; attempt a cross-user read with a second JWT (evidence: recorded query + empty result).

## Exit Criteria

1. Fresh `supabase db reset` applies all migrations cleanly.
2. Every user-data table: non-null `user_id` + RLS enabled in its creating migration (grep-verifiable in the same .sql file).
3. pgTAP suite green, covering every table's cross-user matrix.
4. Generated types committed and diff-clean against the live schema.
5. CI runs migrations + pgTAP and is green.
6. No secrets in repo (gitleaks or manual scan evidence).
7. Completion report filed.

## Exit Demo

Reviewer runs `supabase start && supabase db reset && supabase test db` and watches the ownership-isolation suite pass; opens any creating migration and sees `enable row level security` + policy in the same file.

## Required Documentation Updates

`database-schema.md` (implemented-status + migration links) · `ci-cd-environments.md` (Supabase CI step) · README (local backend workflow) · STATUS.md · completion report.

## Known Risks

- Supabase CLI/local-stack friction on Windows (Docker requirement) — surface early; a dev cloud project is the documented fallback (with test-data-only discipline).
- Schema mistakes are cheap now, expensive after Phase 4 — this is why Phase 2's freeze gates entry.

## Cuttable Work

None — every table here is load-bearing for MVP personal mode. (If time pressure hits, the _phase order_ already protects the demo: Phases 5–7 don't need this.)

## Handoff to Next Phase

Phase 4 may rely on: applied migrations, RLS guarantees, generated types, env config. Phases 5/6 remain independent of this track.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-3-COMPLETION.md` — migration list, pgTAP output, types-diff evidence, CI run link, secrets-scan result.
