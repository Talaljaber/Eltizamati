# Offline, Caching & Synchronization

**MVP stance (ADR-0013):** the app is **local-first because it is local-only** — SQLite is the system of record; there is nothing to sync and no offline "mode" (offline _is_ the mode). This deletes the entire hardest problem class (bidirectional sync, conflicts, queues) from the hackathon while the design below keeps the P1 path honest.

## MVP facts

- All reads/writes hit SQLite transactionally; process death loses nothing (US edge matrix).
- "Freshness" still rendered (provenance `observedAt`) — the UI habit that matters later.
- Airplane-mode demo is a rehearsal-checklist item (NFR-REL-001).

## P1 design (when Supabase ships) — decided now, built later

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
