# ADR-0003 — Repository Strategy: pnpm Monorepo with Three Shared Packages

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low (packages extract cleanly)

## Context & forces
The finance engine and domain must be isolatable, testable without the app, and shareable with future Edge Functions (§35; ADR-0007). AI agents need unambiguous "where does this go" answers. Solo dev: one repo, one CI, one PR stream.

## Alternatives
- **Single Expo app with `src/lib` folders:** simplest, but package boundaries become conventions instead of compiler-enforced walls — exactly where AI entropy leaks in (an agent "helpfully" importing SQLite into a formula). Rejected: the walls must be structural.
- **pnpm workspaces monorepo — chosen:** compiler + lint-enforced boundaries; per-package test runners (Vitest for pure TS); Expo supports monorepos first-class. Overhead: metro config awareness — small, documented cost.
- **Multi-repo:** coordination tax for one human; rejected outright (SRC-1 anti-over-engineering).
- **Nx/Turborepo now:** build orchestration for 4 packages is ceremony; plain pnpm + scripts; Turborepo can be added later if CI time hurts (noted trigger: CI > 8 min).

## Decision
`apps/mobile` + `packages/{domain, finance-engine, demo-data}` + `/supabase` (P1 assets) as laid out in `system-architecture.md §7`. pnpm workspaces; TS project references; no build orchestrator yet.

## Consequences
Structural dependency direction (packages cannot import the app — enforced by package.json deps + dependency-cruiser); engine tests run in milliseconds without Expo; Edge Functions later import the same `domain` schemas. Obligation: keep package count at 3 unless a boundary *proves* itself (anti-premature-abstraction).
