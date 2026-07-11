# ADR-0006 — Local Persistence: expo-sqlite + Drizzle ORM; SecureStore; MMKV

- **Status:** **Partially superseded by [ADR-0017](ADR-0017-supabase-first-mvp-persistence.md) (2026-07-11)** · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Medium (repository seam contains it)
- **⚠ Partially superseded by ADR-0017 (2026-07-11):** the expo-sqlite + Drizzle local financial database is **postponed to the post-MVP local-first phase** ([FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)) — do not build it in the MVP. Personal-mode data persists in Supabase only; demo mode uses bundled in-memory seed data. **Still in force from this ADR:** MMKV (or AsyncStorage) for lightweight preferences, SecureStore for tokens/session material, and the KV-is-not-a-financial-database rule. The SQLite technology analysis below remains the reference for the future local-first work.

## Context & forces

MVP system of record is on-device (ADR-0013): relational domain data, real migrations, transactional erase, decimal-exact money storage. Plus: tiny secrets (P1 tokens) and fast preferences. Threat T-01 (device loss) shapes the encryption stance.

## Alternatives

- **expo-sqlite + Drizzle — chosen:** real SQL (solo dev already knows it), typed schema shared with the P1 Postgres mapping (docs/05 lockstep), drizzle-kit migrations, in-memory DB for integration tests. Drizzle over raw SQL: type-safety for AI agents (schema drift becomes compile errors) without ORM magic.
- **WatermelonDB:** built for huge datasets + sync — we have neither scale nor (MVP) sync; opinionated model classes fight our domain mapping. Over-tooled, rejected.
- **Realm:** object DB, its own model/query language, heavier native footprint; steers away from the SQL→Postgres continuity we want. Rejected.
- **AsyncStorage/MMKV as data store:** KV for relational financial data is malpractice (query, integrity, migration). Rejected for domain data; **MMKV kept for preferences** (fast, sync API). **SecureStore** for future tokens only (NFR-SEC-003).

## Decision

SQLite (expo-sqlite) with Drizzle; money as canonical decimal `TEXT` (never REAL — docs/05 §2); MMKV preferences; SecureStore secrets. MMKV requires an Expo dev build from M0 (primer §11).

## Encryption stance (explicit, honest — T-01/AR-1)

MVP relies on OS filesystem encryption + app sandbox; **no app-layer DB encryption**. Rationale: hackathon data is demo/manual; SQLCipher via `op-sqlite` or key-wrapped field encryption is a contained upgrade (repository seam) priced into P1 alongside biometric app-lock. This is an accepted risk, recorded in the threat model — not an oversight.

## Consequences

Same-PR schema-change rule (Drizzle + `/supabase` migrations together); migration tests (NFR-REL-002); erase-all is one transaction + MMKV clear with absence test.
