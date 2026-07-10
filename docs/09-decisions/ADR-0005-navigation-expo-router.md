# ADR-0005 — Navigation: Expo Router

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low-Medium (it _is_ React Navigation underneath; route files are thin by rule)

## Context & forces

Tabs + nested stacks + modals + deep links (NFR-SEC-005, insights → future push reuse). Web-developer familiarity is a real force (file-based routing ≈ Next.js mental model). Typed routes reduce AI agents inventing route strings.

## Alternatives

- **React Navigation (direct):** the substrate; maximum control, but hand-maintained route config + param types — more surface for agent drift.
- **Expo Router — chosen:** file-system routes (self-documenting IA — the `app/` tree mirrors `information-architecture.md`), typed routes, deep linking nearly free, first-party Expo support.
- **react-native-navigation (Wix):** native-driven perf, heavier setup, poor Expo fit. Rejected.

## Decision

Expo Router with typed routes enabled. **Route files are thin** (parse/validate params → render a feature screen component); all screen logic lives in `features/` (system-architecture §7).

## Consequences

IA changes are file moves (reviewable); deep-link allow-list implemented as a route-guard module + tests. Obligation: NAV-1..7 rules from `information-architecture.md` verified in RTL pass (push animation direction, back behavior).
