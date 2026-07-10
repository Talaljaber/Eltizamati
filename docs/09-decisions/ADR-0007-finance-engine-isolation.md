# ADR-0007 — Finance Engine: Pure TS Package with decimal.js-backed Value Objects

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low (purity is what makes it portable)

## Context & forces

Non-negotiables: decimal-safe money (§35.4), calculations outside UI (§35.5), reproducibility, formula versioning, testability without UI/network (§25). The engine is the product's defensibility — it must be the most tested, least coupled code in the repo, and runnable later inside Edge Functions unchanged.

## Alternatives

- **decimal.js inside `Money`/`Rate` VOs — chosen:** arbitrary-precision decimal, mature, tiny API surface; wrapped so no call site touches the library (swap-able), with lint banning raw arithmetic on money (NFR-MNT-003).
- **big.js/bignumber.js:** fine libraries; decimal.js chosen for its rounding-mode completeness (HALF_UP/HALF_EVEN explicit — BR-CALC-004) and familiarity.
- **Integer minor units (fils as bigint):** exact and fast, but rate math (division, powers for annuities) forces fractional intermediates anyway — you end up reimplementing decimal scaling by hand, the classic source of off-by-rounding bugs. Rejected.
- **WASM decimal / Rust core:** performance we don't need (360-period schedules are trivial), portability we'd pay for in build complexity. Rejected (anti-over-engineering).

## Decision

`packages/finance-engine`: pure functions only — no I/O, no clock (explicit `asOf`), no randomness; imports only `packages/domain`; formula registry with versioning (calc spec §3); results carry confidence + assumption notes; Vitest + fast-check with a CI coverage gate (≥95%).

## Consequences

Engine testable in milliseconds; deterministic (INV-5) hence safe to re-derive instead of syncing (offline-sync P1 simplification); same code runs in Edge Functions later. Obligations: formula changes require version bump + vectors + ADR note (T-12 guard); JS-thread chunking for very long schedules handled by the _calling service_, never inside formulas (purity).
