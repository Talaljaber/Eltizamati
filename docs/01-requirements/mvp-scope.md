# MVP Scope — Hackathon Build

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):**
> **Personal mode** (real user data) requires an authenticated Supabase account; **Supabase Postgres is the only persistent source of truth for personal data in the MVP** — there is **no SQLite** financial database (postponed post-MVP: [FUTURE_LOCAL_FIRST_ROADMAP](../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)).
> **Demo mode** works without authentication or network, from bundled deterministic in-memory seed data — the scripted demo remains airplane-mode-safe (§5a unchanged).
> **Full offline personal mode is not MVP:** personal mode shows honest offline/error/retry states when Supabase is unreachable; no offline editing or sync is promised.
> Account erasure = server-side deletion of all user rows + audit event (FR-AUTH-003); consent records for signed-in users are server-backed under RLS. Mock providers stay visibly labeled (C-07).
> References below to "local-first", "SQLite as system of record", or auth/backend as cuttable week-3 work are superseded. The current execution plan is [IMPLEMENTATION_PLAN.md](../08-delivery/IMPLEMENTATION_PLAN.md).

**Decision basis:** `docs/00-audit/01-critique-and-recommendations.md` (sharp story over broad shell) + the **SRC-3/4 delta-audit** (`00-audit/00-source-audit.md §7`). The MVP proves **one memorable flow end-to-end with defensible math**, staged on a credible multi-obligation dashboard.

**Timeline basis (updated 2026-07-10):** the hackathon runs **~3 weeks**, not a compressed day. This makes it realistic to promote **authentication, Supabase backend activation, consent records, local notifications, the card payoff simulator, duplicate-payment detection, and a real mock-provider connect flow** into MVP — _provided_ the money-shot spine (rate-change → residual → scenario) is green by end of week 2 and **the scripted demo stays airplane-mode-safe on local/demo data.** The backend is a real, demonstrable _secondary_ capability, never a demo dependency (ADR-0016).

## 1. The one-line MVP

> A bilingual (AR/EN, RTL-correct) Android app where a demo borrower sees all obligations in one dashboard, opens a variable-rate loan, sees the rate-change timeline and a projected residual balance explained honestly, and runs an extra-payment scenario that visibly restores the trajectory — with every number labeled by source and confidence. It **also** supports real accounts (email auth + versioned consent + cloud persistence with RLS) and a consent-gated connect flow against a **labeled mock** CRIF/Open-Banking provider — while the demo itself runs fully offline.

## 2. Scope table

| Capability                                                                                  | MVP | Stretch (S) | P1 (post-hackathon) | Later                              |
| ------------------------------------------------------------------------------------------- | --- | ----------- | ------------------- | ---------------------------------- |
| App shell: i18n AR/EN, RTL, design system, 3-tab nav                                        | ✅  |             |                     |                                    |
| Onboarding + disclaimer acknowledgment + demo/manual choice                                 | ✅  |             |                     |                                    |
| Demo seed data (3 obligations, incl. seeded rate change)                                    | ✅  |             |                     |                                    |
| Unified dashboard (totals, next payment, status, cards, changes)                            | ✅  |             |                     |                                    |
| Conventional variable-rate loan detail (full)                                               | ✅  |             |                     |                                    |
| Rate history timeline + log rate change                                                     | ✅  |             |                     |                                    |
| Amortization + variable-rate projection + residual-balance detection                        | ✅  |             |                     |                                    |
| Calculation explanation view (inputs, provenance, formula version, assumptions)             | ✅  |             |                     |                                    |
| Loan scenario planner (extra monthly / one-time)                                            | ✅  |             |                     |                                    |
| Payment history + log payment                                                               | ✅  |             |                     |                                    |
| Murabaha detail (read-only, contract-correct terms, progress)                               | ✅  |             |                     |                                    |
| Credit-card detail (display + utilization)                                                  | ✅  |             |                     |                                    |
| Insights center (rules of FR-INS-001)                                                       | ✅  |             |                     |                                    |
| Contextual education (tap-a-term) + Learn tab + bank-questions checklist                    | ✅  |             |                     |                                    |
| Settings: language, erase data, reset demo, acknowledgments                                 | ✅  |             |                     |                                    |
| Data-source status screen (honest mock labeling)                                            | ✅  |             |                     |                                    |
| **Card payoff simulator** (`cardPayoff.v1`) — **canonical classification: MVP-conditional; first item on the cut order** (see IMPLEMENTATION_PLAN cut order) | ✅  |             |                     |                                    |
| **Duplicate payment detection**                                                             | ✅  |             |                     |                                    |
| **Local payment-due notifications** (OS-scheduled, content-minimized)                       | ✅  |             |                     |                                    |
| **User-defined gap/threshold insight + reminder-day setting** (from SRC-4)                  | ✅  |             |                     |                                    |
| **Email authentication (Supabase): sign-up/in, email verify, password reset, session mgmt** | ✅  |             |                     |                                    |
| **Versioned consent records (ToS, Privacy, disclaimer, per-provider) — server-backed**      | ✅  |             |                     |                                    |
| **Biometric app-lock (local)**                                                              | ✅  |             |                     |                                    |
| **Supabase deploy: cloud persistence, RLS-from-first-migration, account deletion + audit**  | ✅  |             |                     |                                    |
| **Consent-gated connect flow against a LABELED MOCK CRIF/Open-Banking provider**            | ✅  |             |                     |                                    |
| **"Two numbers" comparison hero on loan detail** (official balance vs projected true cost)  | ✅  |             |                     |                                    |
| JSON export                                                                                 |     | ✅          |                     |                                    |
| Saved scenarios                                                                             |     | ✅          |                     |                                    |
| Phone OTP as a second auth factor                                                           |     |             | ✅                  |                                    |
| Ijara + Diminishing Musharakah read-only types                                              |     |             | ✅                  |                                    |
| Generic read-only facility type                                                             |     |             | ✅                  |                                    |
| CRIF / Open Banking **real/sandbox** provider (mock ships in MVP)                           |     |             | ✅ (if access)      |                                    |
| Push notifications (FCM/APNs, server-triggered)                                             |     |             |                     | ✅                                 |
| Household sharing, white-label, coaches                                                     |     |             |                     | ✅                                 |
| OCR import, payment initiation, LLM advice                                                  |     |             |                     | ❌ never as scoped (see not-build) |

## 3. Explicit not-build list (with reasons)

| Item                                                                                                      | Reason                                                                       |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Real/implied CRIF or Open Banking integration (a _labeled mock_ connect flow ships; real access stays P1) | No confirmed access (RES-002); non-negotiable honesty rule                   |
| Auth on the **scripted demo path** (auth ships and is demonstrable, but the stage flow runs demo mode)    | DEC-001 (amended by ADR-0016); keeps the demo airplane-mode-safe             |
| Push notification infra (FCM/APNs) — local scheduled notifications _do_ ship                              | Needs device tokens + server triggers; local reminders deliver the MVP value |
| Phone OTP                                                                                                 | SMS provider + cost; email verification covers MVP identity (P1)             |
| Remote education CMS                                                                                      | Static versioned content suffices; repo PRs are the CMS                      |
| Product analytics platform                                                                                | Privacy-first posture; Sentry only; event taxonomy documented for later      |
| Feature-flag service                                                                                      | Typed local config module; one developer                                     |
| OCR statement import                                                                                      | Privacy surface + effort ≫ demo value                                        |
| Islamic early-settlement simulation                                                                       | Ibra' is institution-discretionary (GAP-07); honest = don't simulate         |
| Multi-currency runtime                                                                                    | JOD-only; schema keeps `currency` code for later                             |
| "Smart tips" (any AI-generated advice)                                                                    | Regulatory/trust risk; DEC-004                                               |

## 4. Demo data set (canonical; implemented in `packages/demo-data`)

| #   | Obligation                                                                                                                                                                    | Why it's in the demo                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | **Personal loan, Bank of Amman (fictional)** — 20,000 JOD original, variable rate 7.5%→9.25% (repriced 14 months in, installment unchanged), 84-month term, 30 months elapsed | The star: triggers residual-balance insight; scenario planner target |
| 2   | **Murabaha auto financing, Safa Islamic Bank (fictional)** — 15,000 JOD cost + 3,600 JOD profit, fixed total 18,600 JOD, 60 months, 22 paid                                   | Proves contract-aware Islamic handling with safe math                |
| 3   | **Credit card, same Bank of Amman** — 4,000 JOD limit, 2,350 JOD balance (59% utilization), min payment 3%, purchase APR 24%                                                  | Breadth + utilization insight; simulator target if stretch lands     |

Institutions are fictional-but-plausible; demo banner states "Demonstration data — not real accounts." All seeded values chosen so the finance teammates can hand-verify every derived figure (see `calculation-test-vectors.md` — seed #1 IS test vector family TV-30x).

## 5. MVP acceptance (Definition of Demo-Ready)

1. **Demo spine (critical path):** full flow (onboard → dashboard → loan detail → rate timeline → residual insight → explanation → scenario → bank questions) works **in airplane mode**, in Arabic and English, on the demo Android device.
2. Every displayed derived figure traces to a passing test vector.
3. Provenance/estimate badges visible on all material figures; demo banner always present in demo mode.
4. No crash across the scripted demo + 10-minute free exploration.
5. `pnpm check` green; engine coverage gate met; repo README accurate for judges reading code.
6. **Secondary capability (off critical path):** a real account can be created (email auth), consent recorded (versioned), data persisted to Supabase with RLS enforced, and a consent-gated connect run against the labeled-mock provider — demonstrable on request, never required by the scripted demo. If any of this is not green by the demo freeze, it is cut without touching items 1–5.

## 5a. Demo-safety invariant (non-negotiable)

The scripted demo **must never depend on the network, auth, or the backend.** Backend/auth/mock-connect are shown as "and it also does this" beats. This preserves the reliability posture of the original local-first MVP while adding the depth the three-week timeline and SRC-3 justify.

## 6. Change control

Scope moves between columns only by explicit decision recorded in this file's history (git) with a one-line rationale. Anything added to MVP must name what it displaces.

### Change history

- **2026-07-11 — Supabase-first persistence (ADR-0017).** Personal mode now requires Supabase auth and persists exclusively to Supabase (RLS from first migration); SQLite removed from MVP scope entirely (postponed to the post-MVP local-first roadmap); demo mode moves from SQLite-seeded to bundled in-memory seed data (still airplane-mode-safe). Backend/auth move from cuttable week-3 M6 work to foundational Phases 3–4. **What it displaces:** the entire local Drizzle/SQLite schema, dual-migration lockstep, and local↔cloud repository swap — net scope reduction. Card payoff simulator's conflicting classifications reconciled to **MVP-conditional, first cut**. Canonical `DEMO_DATE` fixed at `2026-07-01`.
- **2026-07-10 — SRC-3/4 delta-audit + three-week timeline correction (ADR-0016).** Promoted to MVP: email auth, versioned consent records, biometric lock, Supabase deploy + RLS + account deletion, labeled-mock connect flow, local payment-due notifications, user-defined threshold insight + reminder-day setting, card payoff simulator, duplicate-payment detection, "two numbers" loan-detail hero. **What it displaces:** nothing on the demo spine — all promotions are additive week-3 work off the critical path; if week-3 time is short, they are cut back toward the original local-first MVP (which remains fully demo-ready on its own). Rejected: "Explore Financing Options" (DEC-005). Unchanged: real CRIF/OB access, phone OTP, push/FCM, Islamic early-settlement simulation stay out of MVP.
