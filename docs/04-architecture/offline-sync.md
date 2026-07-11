# Offline Behavior (MVP) & Future Local-First Synchronization

> **⚠ Rewritten 2026-07-11 per [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md).** The previous "local-first because local-only" stance (ADR-0013) is superseded. This document now states the MVP offline contract; the sync design below it is **future scope**, preserved for the post-MVP local-first phase.

## MVP offline contract (ADR-0017)

- **Demo mode is fully offline by construction:** bundled deterministic seed data (`packages/demo-data`, anchored to `DEMO_DATE = 2026-07-01`) served by an in-memory repository. The scripted demo runs in airplane mode — rehearsal-checklist item (NFR-REL-001). No database involved.
- **Personal mode requires network** for authoritative reads/writes against Supabase. When Supabase is unreachable the UI must show **explicit offline/error/retry states** (TanStack Query error surfaces mapped through the AppError taxonomy — `connectivity` code family). TanStack Query's in-memory cache may display previously-fetched data **clearly marked stale** via provenance freshness; it is not a durable store.
- **Not promised in MVP:** offline personal-data editing, durable offline reads, queued/deferred financial mutations, any synchronization. Financial mutations either reach Supabase or fail visibly — never silently queued.
- "Freshness" is still rendered everywhere (provenance `observedAt`) — the UI habit that matters later.

## Future local-first design (post-MVP — preserved, not scheduled)

> Everything below is **future scope** (see [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)). Do not implement any of it in the MVP phases.

| Concern             | Decision                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topology            | Server-authoritative for account data; device keeps a read cache + a small outbound mutation queue (user-entered records only)                                                           |
| What syncs          | Obligations, payments, rate periods, insights read-state, consent records. Calculation runs re-derive locally (cheap, deterministic INV-5) — don't sync derived data                     |
| Sync triggers       | App foreground, post-mutation, manual pull-to-refresh; no background sync initially (iOS/Android background limits — see mobile primer)                                                  |
| Conflict strategy   | Per BR-PROV-001: provenance priority + never-silent-merge; same-class conflicts → server wins for provider data, **user prompt** for user-entered financial values (SRC-1 §28 hard rule) |
| Idempotency         | Client-generated uuid v7 ids + `Idempotency-Key` on mutations; server upserts by id                                                                                                      |
| Retry               | Exponential backoff, capped; queue visible in data-source status screen (no invisible pending writes)                                                                                    |
| Duplicate detection | Payment natural-key check (obligation, date, amount) server-side + client warn (FR-PAY-004)                                                                                              |
| Encryption at rest  | See ADR-0006 (OS-level FS encryption MVP; SQLCipher upgrade path documented)                                                                                                             |
| Cache lifetime      | Provider data per freshness classes (BR-PROV-003); local cache never auto-evicts user-entered data                                                                                       |
| Partial failure     | Per-entity sync results; failed entities marked, surfaced, retried — never a half-applied batch (transactions per entity group)                                                          |

**Rule carried from SRC-1 §28:** financial values never silently merge. Every conflict is either resolved by provenance priority (logged) or shown to the user.
