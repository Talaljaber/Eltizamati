# ADR-0008 — Obligation Subtypes: Discriminated Union (Domain) + Base Table with Detail Tables (Storage)

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Medium (migrations exist for a reason)

## Context & forces
Eight obligation types eventually; three now (mvp-scope). SRC-1 §21.1 explicitly bans the giant-nullable-table and asks for a compared decision. The killer requirement is **PRIN-7/BR-CALC-020: the type system must make wrong math unreachable** (a Murabaha must not be *able* to flow into `variableProjection`).

## Alternatives
1. **Single-table inheritance (one table, nullable columns, `kind` flag):** simplest writes, but every query sees 40 nullable fields, constraints can't bind per-type, and the domain degrades into `if (kind…)` soup — the exact AI-entropy magnet we're guarding against. Rejected.
2. **Class-table inheritance — chosen for storage:** `obligations` core + `loan_details` / `murabaha_details` / `card_details` (1:1). Typed, constrained, queryable columns; adding a type = one new table + union member (open/closed where it matters). Cost: a join per detail read — trivial at personal-finance scale.
3. **JSONB subtype payload:** flexible, but constraints/queries weaken and schema drift hides in JSON — bad for a product whose value *is* data correctness. Rejected for core fields (JSON retained only for genuinely polymorphic small bags: fees, min-payment rule).
4. **Event sourcing / snapshots:** auditability is appealing (BR-RATE-001 append-only already gives targeted immutability where it matters), but full ES is operationally heavy for one dev and obscures state for AI agents. Rejected; append-only tables for rate history + calculation runs capture the audit value at 5% of the cost.

## Decision
- **Domain:** `Obligation` discriminated union on `kind` (domain-model §3.1); exhaustive `switch` with `never` checks; formulas accept only the specific member type (compile-time gate for BR-CALC-020).
- **Storage:** base + detail tables (docs/05), same names local and P1.

## Consequences
Adding Ijara (P1) = new union member + detail table + terminology namespace + explicit calculation policy — the compiler lists every site to update (exhaustiveness). UI renders by narrowing the union (NAV-2 single route). Obligation: resist "just add a column to obligations" for type-specific data (review checklist).
