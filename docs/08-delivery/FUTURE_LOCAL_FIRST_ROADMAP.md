# Future Local-First Roadmap (Post-MVP — NOT scheduled in any current phase)

**Status:** future scope, preserved by [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md). No phase of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) may implement anything in this document. It exists so the postponed SQLite/local-first design stays coherent in one place instead of scattered as contradictions across active MVP documents.

## Why it is postponed

- SQLite was never implemented (zero code existed at the ADR-0017 decision point — [CURRENT_STATE.md](../10-implementation/CURRENT_STATE.md)); there was no investment to protect.
- Supabase became an early MVP requirement (personal mode needs auth + RLS), so keeping SQLite would have meant building and lockstep-maintaining **two** persistence systems in a ~3-week window.
- The only hard offline requirement in the MVP — the scripted demo — needs no database at all (bundled deterministic in-memory seed).

## What limitation exists without it

- **Personal mode is unavailable offline**: no durable local reads, no offline editing, no queued writes. The app shows honest offline/error/retry states instead. This is an accepted, stated MVP posture (threat model + NFR banners, 2026-07-11).
- Personal-mode cold start requires a network round-trip; the TanStack Query in-memory cache softens repeat visits within a session only.

## Future target architecture

Server-authoritative + durable local read cache + small outbound mutation queue — exactly the topology ADR-0013 originally froze for P1 (its anti-sync-engine reasoning stands):

- **Local cache:** SQLite (expo-sqlite + Drizzle per ADR-0006's still-valid technology analysis), money as canonical decimal `TEXT`, ISO `TEXT` dates, paired `col`/`col_prov` provenance columns (`sourcedText` custom type), drizzle-kit migrations (generated, reviewed, never hand-edited).
- **Offline reads:** repositories gain a cache-first read path; freshness rendered via provenance `observedAt` (the UI habit the MVP already builds).
- **Queued writes:** user-entered records only; client-generated uuid v7 ids + `Idempotency-Key`; server upserts by id; exponential backoff, capped; **queue visible in SCR-DATA-STATUS — no invisible pending writes.**
- **Conflict resolution:** per BR-PROV-001 — provenance priority, never silent merge; server wins for provider data; **user prompt** for user-entered financial values (SRC-1 §28 hard rule). No CRDT/auto-merge engine.
- **Identity mapping:** a device-generated identity becomes relevant again for offline-created rows; the superseded `localProfileId → auth.uid()` remapping design (previously in `database-schema.md`) is the starting point.
- **Schema parity:** the SQLite schema mirrors the by-then-stable Supabase schema (table/column names shared); the dual-migration same-PR discipline from ADR-0002/0006 applies from the day the local schema exists.
- **Derived data never syncs** (INV-5): calculation runs re-derive locally — deterministic engine makes this safe.

## Likely migration approach (Supabase-only → hybrid)

1. Introduce the SQLite schema + migrations behind the existing repository interfaces (a `CachedRepository` decorator over `SupabaseRepository`, not a replacement).
2. Backfill the cache from Supabase on first run (read-only cache milestone — ship value before touching writes).
3. Add the outbound queue for user-entered mutations (second milestone; conflict UX per BR-PROV-001).
4. Only then consider background sync triggers (foreground/post-mutation/manual first — OS background limits per the mobile primer).

## Testing implications

- Migration tests against seeded previous versions (NFR-REL-002) return to scope.
- Cache-coherence tests: cache-first read equals server read after sync; stale rendering matches provenance freshness classes (BR-PROV-003).
- Queue tests: idempotent replay, partial-failure per-entity results (never half-applied batches), visible-queue assertions.
- Conflict-path tests: every BR-PROV-001 case, including the mandatory user-prompt path.
- The pgTAP/RLS suite is unaffected (server remains authoritative).

## Data migration considerations

- No user-data migration is needed to _adopt_ the cache (server stays the source of truth; the cache hydrates from it).
- Encryption stance must be re-decided at adoption time (ADR-0006's honest MVP stance — OS filesystem encryption, SQLCipher upgrade path — was written for this moment).
- Erasure semantics extend: account deletion must also verifiably wipe the local cache + queue (absence tests).

## Where the old design lives

- Sync/conflict/queue decision table: `docs/04-architecture/offline-sync.md` — "Future local-first design" section.
- SQLite technology choice + KV/SecureStore split: `ADR-0006` (partially superseded; analysis retained).
- Schema shape + identity remapping: `docs/05-data-api/database-schema.md §6` (future section).
- Topology rationale + anti-sync-engine argument: `ADR-0013` (superseded; reasoning preserved).
