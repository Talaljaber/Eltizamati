# Product & Engineering Critique — Challenged Ideas and Recommended Changes

**Phase:** 2 (Product Clarification)
**Status:** Recommendations final; items marked DEC-* need human sign-off (see `docs/08-delivery/decision-memo.md`)
**Rule applied:** nothing was preserved merely because it already existed; the core mission (C-01…C-11) was preserved in full.

---

## 1. The Sharpest Value Proposition (recommended)

The brief oscillates between "unified view of all obligations" (broad) and "variable-rate surprise / balloon prevention" (sharp) — it flags this itself (§37.1). Recommendation:

> **Demo promise:** _"Your bank raised your rate. Your installment didn't change. Eltizamati is the only app that shows you — in one screen — that you now owe 4 more years of payments you didn't agree to feel, and what to do about it before maturity."_

The unified dashboard is the **stage**, not the **story**. It appears in the demo (it establishes credibility and breadth in ~20 seconds), but the 3 minutes of demo tension live in: rate-change timeline → unchanged installment → shrinking principal reduction → projected residual balance → scenario that fixes it → questions to ask the bank.

Why this wins:

- It is the one moment where the product does something a bank app _structurally will not do_ (banks have no incentive to spotlight this).
- It exercises every architectural showpiece: calculation engine, provenance, confidence labels, explanation UI, scenario planner.
- It is emotionally legible to judges in under a minute (SRC-1 success metric §38.1).

## 2. Ideas Challenged and Changed

### 2.1 Navigation: kill the global Plan tab (DEC-002)

A global Plan tab needs an obligation picker, duplicates per-obligation entry points, and dilutes the 4-tab bar. Scenarios are _about_ an obligation; enter them from obligation detail. MVP tab bar: **Home / Obligations / Learn** (+ Settings via profile icon). The brief itself says a dedicated Payments tab must earn its place with user evidence — the same standard applied to Plan removes it. Reversal cost: trivial (add a tab later).

### 2.2 Authentication: demo-mode-first, real auth post-hackathon (DEC-001)

Building email/OTP/biometric auth for a hackathon where judges may prefer instant demo access is inverted priorities. MVP ships **local demo mode with a permanent, visible "Demo data" banner** and a local consent acknowledgment. The full auth/consent/account-lifecycle design is fully specified (docs/05, docs/06) so post-hackathon implementation is mechanical. This also removes the single most common demo failure (auth/network on stage).
**Not weakened:** no server data exists in MVP, so no server authorization surface exists; the Supabase schema is designed RLS-first for the day it ships.

### 2.3 Backend: none in the demo path (ADR-0002, ADR-0013)

The brief assumes a backend platform choice; the honest MVP needs **no network at all**. Everything runs on-device (SQLite + seeded demo provider). This converts the scariest demo risks (venue Wi-Fi, cold starts, quota) into non-events and is _more_ honest about integration status, not less. Supabase is selected and fully designed as the production backend — schema, RLS, consent tables ship in `/supabase` from day one — but deploying it is a stretch goal, not MVP.

### 2.4 Obligation types: 3 in MVP, 8 in the domain model

§8.1's eight types stay in the domain model (the discriminated-union/subtype design makes them cheap to add). MVP seeds and supports exactly three:

1. **Conventional variable-rate personal loan** — the star (full engine support).
2. **Murabaha auto financing** — read-only + progress (proves contract-aware Islamic handling with _zero_ speculative math: Murabaha total sale price is fixed at contract, so progress display is safe).
3. **Revolving credit card** — display + utilization; payoff simulator is stretch.

This choice of Murabaha over Ijara/Diminishing Musharakah is deliberate: it is the only Islamic type where honest display requires no institution-specific convention (GAP-07).

### 2.5 Notifications: insights center, not push (DEC-003)

Push notifications require FCM/APNs setup, device tokens, a backend, and OS permission UX — none of which the demo story needs. MVP ships an **in-app insights/alerts center** (same domain model as future notifications: `Insight` entities with severity, deep-link target, read state). Local scheduled notifications are a cheap stretch. Push is post-hackathon. The notification _design_ (§18) is preserved in docs.

### 2.6 Education engine: static, versioned, contextual

Remote content management (§32.4) is cut. Education content is **versioned JSON/Markdown bundled with the app**, keyed by glossary term-id, rendered contextually (tap any labeled figure → definition + "learn more"). Arabic-first authored content, reviewed by teammates in the repo via PR — that _is_ the CMS for now.

### 2.7 Cut list (explicit not-build for MVP and near-term)

- OCR statement import (privacy risk + effort; revisit with real users).
- Payment initiation / money movement (regulated; explicitly out per §5.3).
- Product analytics platform (only Sentry crash reporting; event taxonomy defined for later).
- Feature-flag service (a typed local config module suffices for one developer).
- Passkeys, phone OTP, device management (post-auth-launch).
- Households, coaches, white-label, multi-currency runtime (schema keeps currency code).
- Any AI-generated advice in-app ("smart tips" become rules-based, post-MVP — DEC-004).
- Real/sandbox CRIF or Open Banking integration during the hackathon **unless** access is confirmed in writing (RES-002); the provider contracts are specified either way.

### 2.8 UX correction: estimate precision (CON-06)

Rendering estimates at 3 decimals contradicts "no fake precision." Rule adopted (BR-CALC-014): official figures → 3 dp; estimates → "≈ 1,240 JOD" style with confidence badge; full-precision values live one tap away in the calculation explanation. This small rule does a lot of trust work in the demo.

### 2.9 Language of risk

The brief's tone rules (§7.3–7.5) are adopted into concrete content rules (`content-terminology.md`): no red full-screen alerts; "attention" framing; every warning paired with an action ("questions to ask your bank"). The balloon warning is the app's emotional peak — it must feel like a flashlight, not a siren.

## 3. Ideas Examined and Kept

- **Provider abstraction with five source classes** (real/sandbox/mock/manual/demo) — kept exactly; it is the backbone of honest data handling and the post-hackathon path.
- **Provenance + freshness on every material figure** — kept; implemented as a first-class `Provenance` value attached to fields, not a footnote string.
- **Contract-aware Islamic support** — kept and made _more_ conservative (read-only where conventions unknown).
- **Centralized status derivation** — kept; single `deriveObligationStatus()` in the domain package; UI may not compute status.
- **JOD 3-dp storage precision** — kept (storage/calculation); presentation refined per §2.8.
- **The four home-screen questions** ("What do I owe / what's next / what changed / am I on track") — kept as the literal dashboard information hierarchy.

## 4. Business Assumptions That Need Real Validation (not engineering)

| ID      | Assumption                                                      | Cheapest validation                                                   |
| ------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| ASM-001 | Multi-obligation borrowers feel the pain and will maintain data | 5 teammate-sourced interviews with target users during hackathon prep |
| ASM-002 | Balloon-after-reprice is a real Jordanian pattern               | Finance teammates confirm with 1–2 bank contacts or real statements   |
| ASM-004 | Users can/will manually enter accurate data                     | Hallway test: hand someone a statement, time the entry flow           |
| ASM-006 | Judges value engineering quality                                | Read judging rubric (RES-001)                                         |

If ASM-002 fails, the fallback story is credit-card minimum-payment payoff (same engine family, same honesty machinery) — this is why the card simulator is the first stretch goal.

## 5. What Approval Is Needed On

Only four decisions genuinely require humans (full memo: `docs/08-delivery/decision-memo.md`):

| ID      | Decision                                                           | My recommendation | Default if no response |
| ------- | ------------------------------------------------------------------ | ----------------- | ---------------------- |
| DEC-001 | Demo-mode-first vs. real auth in hackathon build                   | Demo-mode-first   | Demo-mode-first        |
| DEC-002 | 3-tab IA without global Plan tab                                   | Adopt             | Adopt                  |
| DEC-003 | In-app insights center instead of push notifications for MVP       | Adopt             | Adopt                  |
| DEC-004 | "Smart tips": rules-based post-MVP; no LLM-generated advice in-app | Adopt             | Adopt                  |

Everything else was resolvable by engineering judgment and is recorded in ADRs.
