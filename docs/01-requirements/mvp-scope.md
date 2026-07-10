# MVP Scope — Hackathon Build

**Decision basis:** `docs/00-audit/01-critique-and-recommendations.md` (sharp story over broad shell). The MVP proves **one memorable flow end-to-end with defensible math**, staged on a credible multi-obligation dashboard.

## 1. The one-line MVP

> A fully offline, bilingual (AR/EN, RTL-correct) Android app where a demo borrower sees all obligations in one dashboard, opens a variable-rate loan, sees the rate-change timeline and a projected residual balance explained honestly, and runs an extra-payment scenario that visibly restores the trajectory — with every number labeled by source and confidence.

## 2. Scope table

| Capability | MVP | Stretch (S) | P1 (post-hackathon) | Later |
|---|---|---|---|---|
| App shell: i18n AR/EN, RTL, design system, 3-tab nav | ✅ | | | |
| Onboarding + disclaimer acknowledgment + demo/manual choice | ✅ | | | |
| Demo seed data (3 obligations, incl. seeded rate change) | ✅ | | | |
| Unified dashboard (totals, next payment, status, cards, changes) | ✅ | | | |
| Conventional variable-rate loan detail (full) | ✅ | | | |
| Rate history timeline + log rate change | ✅ | | | |
| Amortization + variable-rate projection + residual-balance detection | ✅ | | | |
| Calculation explanation view (inputs, provenance, formula version, assumptions) | ✅ | | | |
| Loan scenario planner (extra monthly / one-time) | ✅ | | | |
| Payment history + log payment | ✅ | | | |
| Murabaha detail (read-only, contract-correct terms, progress) | ✅ | | | |
| Credit-card detail (display + utilization) | ✅ | | | |
| Insights center (rules of FR-INS-001) | ✅ | | | |
| Contextual education (tap-a-term) + Learn tab + bank-questions checklist | ✅ | | | |
| Settings: language, erase data, reset demo, acknowledgments | ✅ | | | |
| Data-source status screen (honest mock labeling) | ✅ | | | |
| Card payoff simulator | | ✅ | | |
| Duplicate payment detection | | ✅ | | |
| Local payment-due notifications | | ✅ | | |
| JSON export | | ✅ | | |
| Saved scenarios | | ✅ | | |
| Supabase deploy: auth, consent records, cloud persistence, RLS | | (only if MVP done early) | ✅ | |
| Ijara + Diminishing Musharakah read-only types | | | ✅ | |
| Generic read-only facility type | | | ✅ | |
| CRIF / Open Banking sandbox provider | | | ✅ (if access) | |
| Push notifications | | | | ✅ |
| Household sharing, white-label, coaches | | | | ✅ |
| OCR import, payment initiation, LLM advice | | | | ❌ never as scoped (see not-build) |

## 3. Explicit not-build list (with reasons)

| Item | Reason |
|------|--------|
| Real/implied CRIF or Open Banking integration in demo | No confirmed access (RES-002); non-negotiable honesty rule |
| Real authentication in demo path | DEC-001; removes top demo risk; adds no story value |
| Push notification infra | Needs backend + device tokens; insights center delivers the value |
| Remote education CMS | Static versioned content suffices; repo PRs are the CMS |
| Product analytics platform | Privacy-first posture; Sentry only; event taxonomy documented for later |
| Feature-flag service | Typed local config module; one developer |
| OCR statement import | Privacy surface + effort ≫ demo value |
| Islamic early-settlement simulation | Ibra' is institution-discretionary (GAP-07); honest = don't simulate |
| Multi-currency runtime | JOD-only; schema keeps `currency` code for later |
| "Smart tips" (any AI-generated advice) | Regulatory/trust risk; DEC-004 |

## 4. Demo data set (canonical; implemented in `packages/demo-data`)

| # | Obligation | Why it's in the demo |
|---|-----------|----------------------|
| 1 | **Personal loan, Bank of Amman (fictional)** — 20,000 JOD original, variable rate 7.5%→9.25% (repriced 14 months in, installment unchanged), 84-month term, 30 months elapsed | The star: triggers residual-balance insight; scenario planner target |
| 2 | **Murabaha auto financing, Safa Islamic Bank (fictional)** — 15,000 JOD cost + 3,600 JOD profit, fixed total 18,600 JOD, 60 months, 22 paid | Proves contract-aware Islamic handling with safe math |
| 3 | **Credit card, same Bank of Amman** — 4,000 JOD limit, 2,350 JOD balance (59% utilization), min payment 3%, purchase APR 24% | Breadth + utilization insight; simulator target if stretch lands |

Institutions are fictional-but-plausible; demo banner states "Demonstration data — not real accounts." All seeded values chosen so the finance teammates can hand-verify every derived figure (see `calculation-test-vectors.md` — seed #1 IS test vector family TV-30x).

## 5. MVP acceptance (Definition of Demo-Ready)

1. Full flow (onboard → dashboard → loan detail → rate timeline → residual insight → explanation → scenario → bank questions) works in airplane mode, in Arabic and English, on the demo Android device.
2. Every displayed derived figure traces to a passing test vector.
3. Provenance/estimate badges visible on all material figures; demo banner always present.
4. No crash across the scripted demo + 10-minute free exploration.
5. `pnpm check` green; engine coverage gate met; repo README accurate for judges reading code.

## 6. Change control

Scope moves between columns only by explicit decision recorded in this file's history (git) with a one-line rationale. Anything added to MVP must name what it displaces.
