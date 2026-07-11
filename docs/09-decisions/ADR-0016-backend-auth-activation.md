# ADR-0016 — Activate the Backend & Identity in the Build (Three-Week Timeline)

- **Status:** **Superseded in sequencing by [ADR-0017](ADR-0017-supabase-first-mvp-persistence.md) (2026-07-11)** · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low (all of it was already designed for P1; this ADR changes _timing and demo posture_, not architecture)
- **⚠ Superseded in sequencing by ADR-0017 (2026-07-11):** backend/auth are no longer a cuttable week-3 secondary track (M6) — Supabase is the **primary MVP persistence**, built as foundational Phases 3–4 of [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md), and the repository swap / dual-migration lockstep with SQLite is gone (no SQLite in MVP). **Still binding from this ADR:** the demo-safety invariant (scripted demo airplane-mode-safe on demo data), the labeled-mock CRIF/OB rule, RLS-with-pgTAP before any multi-user path is demoed, and the RES-003 (PDPL) gate on real personal data.
- **Amends:** the MVP-timing clauses of ADR-0002 (backend deferred), ADR-0012 (auth demo-mode), ADR-0013 (local-only MVP). Those ADRs' architecture is unchanged; only _when_ the P1 surface is built moves earlier.
- **Supersedes:** nothing structurally. Does **not** touch ADR-0001/0007/0008/0009/0010/0014 (framework, engine isolation, subtypes, provider abstraction, i18n/RTL, error taxonomy) — all confirmed intact by the SRC-3/4 delta-audit (`00-audit/00-source-audit.md §7.3`).

## Context & forces

Two facts changed after the original KB was written:

1. **The hackathon runs ~3 weeks, not a compressed day.** The original demo-mode-only / backend-deferred decisions (ADR-0002/0012/0013) were correct _for a short timeline_ where auth+network were the top demo risk and bought no story value. Three weeks changes the trade: the P1 backend/auth/consent design already exists in the repo (docs/05 schema + `/supabase` migrations lockstepped with Drizzle, docs/06 controls, FR-AUTH-*), so activating it is **deployment + wiring, not design.**
2. **SRC-3 (architecture PDF) centers exactly this surface** — Splash→Auth→Consent→Retrieve→Unified Profile→Classify→Dashboard, with CRIF/Open Banking as primary and explicit per-provider consent. The delta-audit classifies auth and consent as _promote to MVP_ and CRIF/OB as _keep mock_.

The unchanged constraint that governs the decision: **the demo must stay reliable.** The original reliability win (airplane-mode demo, "does the phone turn on") must not be sacrificed to add depth.

## Decision

1. **Build the P1 backend surface during the three-week window (milestone M6), off the critical demo path:**
   - Supabase project deployed; `/supabase` migrations applied; **RLS policies from the first migration** with pgTAP tests (satisfies §35.8 / CON-08 _in running code_, not just in design).
   - Email auth: sign-up, email verification, sign-in, session management, sign-out, password reset (FR-AUTH-001). SecureStore tokens. Biometric app-lock (FR-AUTH-004).
   - Versioned, timestamped consent records — server-backed when signed in, local in demo mode (FR-AUTH-002); per-provider consent gates the connect flow (FR-AUTH-005).
   - Account deletion with server-side erasure + audit event (FR-AUTH-003).
   - Cloud persistence via the **existing repository seam** — the swap from local SQLite to Supabase happens behind the repository interface; **domain, engine, and UI are untouched** (ADR-0009/0013 seams pay off here).
2. **CRIF / Open Banking stay a labeled mock** (ADR-0009 contract unchanged). The novelty is that the mock now runs through a **real end-to-end consent→connect→retrieve→classify flow**, so SRC-3's central journey is demonstrable — against an explicitly labeled mock, never implying live access. Real/sandbox access is P1 and gated on RES-002.
3. **Demo posture (non-negotiable, mvp-scope §5a):** the scripted demo runs in **demo mode on local data in airplane mode.** Auth + backend + mock-connect are a **secondary "and it also does this" beat**, droppable at the demo freeze without harming the story or the spine.

## Alternatives

- **Keep backend fully deferred to post-hackathon (original ADR-0002/0012/0013 timing):** leaves ~a week of the three-week window under-used and under-delivers against SRC-3's core flow and against judges who read the code for production-readiness. Rejected now that the timeline is known — but this remains the **automatic fallback** if week 3 is consumed by the demo spine.
- **Make auth the primary demo path (as SRC-3 draws it):** reintroduces exactly the network/auth stage risk the original decision removed, for no additional story value on stage. Rejected — auth is real but secondary.
- **Real CRIF/Open Banking in the build:** blocked on regulatory access (RES-002); the honesty rule forbids faking it. Rejected; mock stands.
- **Phone OTP in MVP (SRC-3 shows it):** needs an SMS provider + per-message cost + more failure surface for no MVP value beyond email verification. Deferred to P1 (FR-AUTH-007).

## Consequences

- **Positive:** SRC-3's headline flow becomes real (against a mock); §35.8 server-side authorization moves from designed to enforced (RLS + pgTAP); the codebase judges read is demonstrably production-shaped, not just production-_planned_; the post-hackathon P1 shrinks to "replace mock with real providers behind the unchanged contract."
- **Cost/risk:** M6 is the first real network/auth surface in the project — the highest new-integration risk after the engine. It is fenced: independent week-3 track, depends only on M5's repository/schema surface, first thing cut if time is short.
- **Discipline carried over:** any schema change still updates both Drizzle and `/supabase` in the same PR (ADR-0002 consequence, review-checklist item). No MVP feature may assume single-device-forever beyond the repository seam (ADR-0013 consequence) — now actively exercised by the cloud path.
- **Roadmap shift:** P1 moves from "backend/auth/consent" (now in MVP) to "real providers + phone OTP + multi-device sync-queue" (`hackathon-plan.md §5`).
- **Legal weight increases:** real accounts + stored consent make RES-003 (PDPL/consent review) a pre-M6 item, not post-demo (`readiness-review.md §2`).

## Validation required

- At M6 start: confirm Supabase region/data-residency against RES-003 (PDPL) before storing any real personal data; if unresolved, keep M6 on synthetic/test accounts only.
- RLS policies must pass pgTAP ownership-isolation tests (NFR-SEC-002) before any multi-user data path is demoed.
