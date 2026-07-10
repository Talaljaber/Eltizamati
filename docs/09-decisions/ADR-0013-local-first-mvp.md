# ADR-0013 — Data Topology: Local-Only MVP; Server-Authoritative + Read Cache at P1

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Medium (the planned P1 work *is* the reversal)

## Context & forces
SRC-1 §28 demands offline read access, no silent merges, and a defined sync model — while §37.4 bans enterprise complexity. Bidirectional sync is the single largest accidental-complexity reservoir available to this project. The MVP has exactly one device and zero server data.

## Alternatives
- **Local-only MVP — chosen:** SQLite is the system of record; "offline support" is total by construction (NFR-REL-001); zero sync code at the hackathon.
- **Supabase-primary with offline cache now:** builds the hard part first for zero demo benefit and couples the demo to networks. Rejected.
- **CRDT/sync-engine (PowerSync/ElectricSQL/Watermelon sync) now:** infrastructure for a collaboration problem we don't have; personal-finance data with provenance priorities wants *deliberate* conflict handling, not automatic merge (§28 hard rule). Rejected now; re-evaluate only if P1's queue model proves insufficient.
- **P1 target — server-authoritative + read cache + small outbound queue (chosen):** conflicts resolved by provenance priority or explicit user choice (BR-PROV-001); derived data never syncs (recomputed — INV-5 makes this safe); design frozen in `offline-sync.md`.

## Consequences
Hackathon codebase contains no speculative sync scaffolding (YAGNI), but repositories + client-generated uuid v7 ids + append-only histories are chosen *now* so P1 sync is additive. Obligation: don't let any MVP feature assume single-device-forever semantics beyond the repository seam (review checklist).
