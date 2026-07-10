# ADR-0012 — Authentication: Local Demo Mode for Hackathon; Supabase Auth at P1

- **Status:** Accepted, **amended by ADR-0016** · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low (auth design pre-specified)
- **⚠ Amended by ADR-0016 (2026-07-10):** with the confirmed three-week timeline, Supabase email auth + consent + biometric lock are **now built in MVP (M6)** rather than deferred to P1. The core of this ADR still holds: **demo mode remains the on-stage scripted path** (airplane-mode-safe); auth is a real *secondary* capability, not a demo dependency. "Auth in P1" below now reads "auth in M6, week 3."

## Context & forces
SRC-1 lists auth as "should" for the demo and openly questions whether judging prefers demo mode (§36). Demo failure modes concentrate in auth+network. The consent principle (§20.2) still applies to a local app (disclaimer acknowledgment).

## Alternatives
- **Local demo mode + local consent ack — chosen:** zero network on stage; disclaimer acknowledgment recorded locally (versioned, timestamped — the consent *model* ships, its transport doesn't); demo banner enforces honesty.
- **Supabase email auth now:** 2–3 days of flows (verify/reset/session edge cases) bought with polish time, paid in demo risk. Rejected for MVP; fully specified for P1 (FR-AUTH-*, docs/05/06).
- **Fake login (theater):** rejected on principle (C-07).

## Decision
MVP: no accounts; `dataMode: demo|personal` local profile; consent acknowledgment local (FR-ONB-003). P1: Supabase email auth, SecureStore tokens, re-auth for sensitive ops, biometric app-lock (FR-AUTH-001..004).

## Consequences
Multi-device/recovery absent in MVP (stated in demo honesty beat if asked). The onboarding "sign in" slot is designed into the flow (SCR-ONB-DATA precedes a future auth screen) so P1 insertion doesn't reshuffle UX.
