# ADR-0004 — State Management: TanStack Query + Zustand (small stores)

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Medium (hooks API isolates most of it)

## Context & forces

Almost all app state is **persistent domain data** (SQLite now, remote+cache P1) plus a sliver of UI/session state. Derived financial values are explicitly _not_ state (PRIN-6 — engine output, persisted as runs). Anti-pattern to prevent: one enormous global store re-implementing a database in memory.

## Alternatives

- **Redux Toolkit (+RTK Query):** capable, but pushes toward a central store culture and more boilerplate per feature; RTK Query is oriented to HTTP endpoints, awkward over local repositories. Rejected: weight without matching benefit here.
- **MobX:** implicit reactivity is exactly what AI agents mis-edit (mutation-in-render bugs); smaller RN mindshare. Rejected.
- **Jotai/Recoil-style atoms:** fine, but atom graphs sprawl without discipline; TanStack still needed for async cache anyway. Rejected as redundant.
- **TanStack Query + Zustand — chosen:** Query treats repositories as async sources (works identically over SQLite now and Supabase later — the P1 seam), gives caching/invalidation/loading-error states uniformly; Zustand holds the few genuinely-client concerns (locale, form drafts, session UI) in small typed stores. Both are AI-corpus-dominant patterns → predictable agent output.

## Decision

TanStack Query for all domain reads/mutations (keys centralized per feature in `api/keys.ts`); Zustand stores per concern (≤ ~5 stores expected); no context-based state except the composition-root services context.

## Consequences

Uniform loading/error handling via Query states (screen-state matrix maps 1:1); invalidation discipline required after mutations (helper `invalidateForEvent(event)` maps domain events → query keys, one place). Guardrail: any PR adding a Zustand store must justify why it isn't Query-cached domain data (review checklist).
