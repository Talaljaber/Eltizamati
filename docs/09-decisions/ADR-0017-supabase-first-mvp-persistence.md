# ADR-0017 — Supabase-First MVP Persistence; SQLite Postponed to Post-MVP

- **Status:** Accepted · **Date:** 2026-07-11 · **Confidence:** High · **Reversal cost:** Medium (repository seam contains it; the postponed SQLite work _is_ the reversal path)
- **Supersedes / amends:**
  - **ADR-0013 (local-only MVP data topology): superseded.** SQLite is no longer the MVP system of record for anything. Demo mode's offline guarantee is now met by bundled in-memory seed data, not a local database.
  - **ADR-0006 (expo-sqlite + Drizzle local persistence): partially superseded.** The SQLite+Drizzle decision is postponed to the post-MVP local-first phase (see [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)). The MMKV-for-preferences and SecureStore-for-tokens decisions in ADR-0006 **remain in force**.
  - **ADR-0002 (backend deferred): superseded in timing, confirmed in platform.** Supabase is confirmed as the platform; it is no longer deferred or secondary — it is the primary persistence for personal-mode data, built early in the MVP.
  - **ADR-0012 (auth demo-mode): partially superseded.** "MVP: no accounts" no longer holds — personal mode requires a Supabase account. The core survives: **demo mode remains the on-stage scripted path and requires no account or network.**
  - **ADR-0016 (backend/auth activation in M6): superseded in sequencing.** Backend/auth move from a cuttable week-3 secondary track to a foundational early phase (Phases 3–4 of [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md)). ADR-0016's demo-safety invariant (scripted demo airplane-mode-safe, mock providers honestly labeled) **remains binding and is restated below.**
- **Unchanged:** ADR-0001 (Expo/RN), 0003 (monorepo), 0004 (TanStack Query + Zustand), 0005 (Expo Router), 0007 (pure finance engine), 0008 (obligation subtypes / class-table inheritance — now applied to Postgres only), 0009 (provider abstraction), 0010 (i18n/RTL), 0011 (testing stack), 0014 (error taxonomy), 0015 (observability).

## Context

The previous plan (ADR-0006/0013, amended by ADR-0016) made SQLite the MVP system of record with Supabase activated late (M6) behind the same repository seam, requiring lockstepped Drizzle + Supabase migrations for every schema change.

Three facts have changed since those decisions:

1. **SQLite was never implemented.** The current-state audit ([CURRENT_STATE.md](../10-implementation/CURRENT_STATE.md), 2026-07-11) confirms zero persistence code exists — no schema, no migrations, no repositories. There is no local-first investment to protect.
2. **Supabase is now required earlier**, not as a late secondary capability: personal mode (real user data) is an MVP requirement with auth, consent, and RLS.
3. **Maintaining two persistence systems** (SQLite/Drizzle + Postgres/Supabase, same-PR lockstep migrations, dual mapper layers, dual round-trip tests) is the single largest avoidable scope item in the current plan — for an MVP where the offline requirement applies only to the scripted demo, which does not need a database at all.

## Decision

### 1. Personal mode — Supabase is the only persistent source of truth

- Personal mode requires an authenticated Supabase user (email auth: sign-up, verification, sign-in, password reset, session management).
- All real user financial data — obligations, subtype details, rate periods, payments, calculation runs, insights, consent records, user profile — persists **only** in Supabase Postgres.
- Every user-owned table carries a **non-null `user_id`**; **RLS is enabled in the same migration that creates each table**, policy pattern `user_id = auth.uid()`, deny-by-default, with pgTAP cross-user tests (NFR-SEC-002 — unchanged).
- Generated database types (`supabase gen types typescript`) are the typed boundary; repository implementations map rows ↔ domain entities. UI never touches supabase-js directly (layering rules unchanged).
- Server state is fetched and mutated via **TanStack Query** with explicit query keys and controlled cache invalidation (ADR-0004 unchanged).
- Session material is stored per the supported Supabase/Expo pattern with **SecureStore** for sensitive tokens (NFR-SEC-003 unchanged).
- **No SQLite for personal data in this MVP.** No Drizzle schema, no local migrations, no local financial database.

### 2. Demo mode — bundled, deterministic, offline, no database

- The scripted hackathon demo **must not depend on network, auth, or Supabase** (carried forward verbatim from mvp-scope §5a / ADR-0016 — non-negotiable).
- Demo mode uses **bundled deterministic seed data** from `packages/demo-data` builders, anchored to the canonical fixed `DEMO_DATE` (**`2026-07-01`** — the value in `packages/demo-data/src/constants.ts`; the `2026-07-10` figure previously in `calculation-test-vectors.md` was a doc error, now corrected. Changing `DEMO_DATE` later requires re-validating every date-dependent test vector).
- Demo data lives in a **pure in-memory demo repository** implementing the same repository interfaces as the Supabase repositories. No database of any kind backs demo mode. Demo state is resettable (re-run the builders).
- Demo mode uses the **same domain models and the same finance engine** as personal mode — the demo rehearses the real calculation path, not a fake.
- Demo mode runs without authentication and is always visibly labeled as demonstration data (FR-ONB-005, C-07). It never pretends to be connected to a bank, bureau, or Supabase account.
- Demo and personal data never mix (`dataMode` remains exclusive).

### 3. Lightweight device preferences — key-value only

Non-financial device preferences (selected language, onboarding completion, selected app mode, dismissed notices, non-sensitive UI preferences) use an appropriate key-value mechanism (MMKV or AsyncStorage; SecureStore where sensitivity requires it — per ADR-0006's surviving clauses). This is **not** a local financial-data database and must not grow into one.

### 4. Offline behavior (MVP)

- **Personal mode:** Supabase is required for authoritative reads and writes. The UI must expose clear **offline / error / retry** states (TanStack Query error surfaces mapped through the AppError taxonomy). The app does **not** promise offline personal-data editing, does **not** silently queue financial mutations, and does **not** implement a sync engine. TanStack Query's normal in-memory cache may serve as a transient read display (clearly stale-labeled via provenance freshness) but is not a durable offline store.
- **Demo mode:** fully functional with zero network, by construction.

### 5. Future SQLite / local-first enhancement — postponed, not deleted

The local-first design (durable local cache, offline reads, queued writes, provenance-priority conflict handling, sync) is preserved as post-MVP roadmap work in [FUTURE_LOCAL_FIRST_ROADMAP.md](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md). Nothing in the MVP may foreclose it: client-generated uuid v7 ids, append-only rate history, repository seam, and derived-data-never-synced (INV-5) all stay.

## Mode-specific data behavior (summary table)

| Concern          | Demo mode                                                | Personal mode                                 |
| ---------------- | -------------------------------------------------------- | --------------------------------------------- |
| Source of truth  | Bundled seed builders (in-memory)                        | Supabase Postgres                             |
| Auth required    | No                                                       | Yes (Supabase email auth)                     |
| Network required | No                                                       | Yes for authoritative reads/writes            |
| Repository impl  | `Demo*Repository` (in-memory)                            | `Supabase*Repository`                         |
| Consent records  | Local acknowledgment (versioned, timestamped, key-value) | Server-backed rows under RLS                  |
| Erasure          | Reset demo (re-seed)                                     | Account deletion: server-side erasure + audit |
| Labeling         | Persistent demo banner                                   | None                                          |
| Finance engine   | Same pure engine, `asOf = DEMO_DATE`                     | Same pure engine, explicit `asOf`             |

## Consequences

- **Positive:** one persistence system instead of two; no dual-migration lockstep discipline; RLS and auth are exercised from the first data-bearing feature instead of week 3; the schema is designed once, in Postgres, against a completed domain model; the demo becomes _simpler_ (no database to migrate/seed/reset — just builders).
- **Costs / accepted risks:**
  - Personal mode has no offline capability in MVP (stated honestly in-product via offline/error states; recorded in threat model and NFRs).
  - The project takes a network/auth dependency earlier — the highest-risk integration moves from week 3 to the foundation. Mitigation: it is now foundational rather than rushed, with its own phases (3–4) and exit gates.
  - Supabase project availability/config becomes a development dependency for personal-mode features (local `supabase start` for development; typed env validation fails fast).
  - Demo-mode state does not survive process death (in-memory) — acceptable: reset-demo is one tap and the demo script starts from reset anyway. If rehearsals show this matters, persisting the _demo flag_ (not the data) in key-value storage is permitted.

## Security implications

- RLS from first migration + pgTAP cross-user tests are now MVP-blocking, not P1 (threat T-05 moves to MVP scope).
- Auth token handling (SecureStore), session refresh, account takeover mitigations (T-03/T-04) move to MVP scope.
- Local device-loss exposure (T-01) _shrinks_: no local financial database exists in MVP; only key-value preferences and transient cache.
- Real personal data storage remains gated on RES-003 (PDPL review) — until cleared, personal mode is exercised with synthetic/test accounts only (carried from ADR-0016).
- Secrets: unchanged — anon key only in client via typed env config; service-role only server-side; gitleaks in CI.

## Testing implications

- pgTAP RLS suite, migration tests, and Supabase repository integration tests (against local `supabase start` or a dedicated test project) become MVP test layers.
- Auth flow integration tests become MVP.
- The SQLite round-trip/migration test layer is **removed from MVP** scope.
- Demo repository gets contract tests against the shared repository interfaces (mock and real substitutable — §35.6 unchanged).
- Engine/domain/vector testing strategy unchanged (ADR-0011).

## Alternatives considered

- **Keep the SQLite-first plan (status quo):** builds a full local persistence layer that the confirmed MVP (Supabase required early) would then duplicate; two schemas + lockstep migrations for a solo dev on a 3-week clock. Rejected as avoidable scope.
- **SQLite for demo mode only:** a database, migrations, and mappers to serve three fixed obligations that builders can produce in memory deterministically. Rejected — infrastructure without a requirement.
- **Supabase + full offline cache/queue now:** rebuilds the hardest problem class (sync/conflicts) that ADR-0013 correctly deferred. Rejected; remains the documented future path.

## Validation required

- Before storing any real personal data: RES-003 (PDPL/data-residency) cleared; until then, synthetic accounts only.
- Phase 3 exit: pgTAP cross-user isolation green on every user-data table.
- Phase 5 exit: full scripted demo runs in airplane mode with Supabase unreachable.
