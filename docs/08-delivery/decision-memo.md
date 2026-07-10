# Decision Memo — Items Requiring Human Approval

**Policy applied (SRC-2):** engineering-resolvable trade-offs were decided and recorded as ADRs. Only decisions that materially change the product promise, carry regulatory weight, or are genuinely preference-balanced are escalated. **Defaults apply if no response before implementation start** — silence is not a blocker.

---

## DEC-001 — Authentication scope for the hackathon build
- **AMENDED 2026-07-10 (ADR-0016 / SRC-3 delta-audit + three-week timeline).** Original decision was demo-mode-only because the timeline was assumed short and auth was the top demo risk. With **~3 weeks** confirmed and SRC-3 centering auth/consent, the decision is now: **ship both.** Email auth + versioned consent + RLS-backed persistence are built in week 3 (M6) as a **real secondary capability**, while **demo mode remains the on-stage scripted path** (airplane-mode-safe). This captures the depth without reintroducing the demo risk the original decision avoided.
- **Why it still matters:** the guardrail is that auth/backend must never sit on the critical demo path (mvp-scope §5a). A fake login screen remains rejected on principle.
- **Revised default:** demo-mode is the demo path; auth ships as a demonstrable secondary beat, cuttable if week 3 is short.

## DEC-002 — Information architecture: 3 tabs, Plan contextual
- **Decision needed:** accept Home/Obligations/Learn with the scenario planner entered from obligation detail (dropping SRC-1 §11's global Plan tab).
- **Why it matters:** changes the app's primary navigation shape shown to judges; deviates from the brief's (self-flagged, non-final) recommendation.
- **Recommendation:** adopt. Rationale in `information-architecture.md §3` (a global planner's first screen is a picker — hallway, not room). Promotion trigger defined if usage data later disagrees.
- **Alternatives:** 4 tabs with Plan-as-picker; 4 tabs with Plan defaulting to largest obligation.
- **Default:** adopt 3 tabs. Reversal cost: trivially low.

## DEC-003 — Notifications: in-app insights center + local scheduled reminders for MVP
- **AMENDED 2026-07-10.** Original: insights center only, local reminders as stretch. With three weeks, **local scheduled payment-due notifications are promoted into MVP** (FR-NTF-001, M7) alongside the insights center — cheap in Expo, and SRC-3's notification engine expects them. **Push/FCM stays LATER** (needs backend triggers + tokens; the insights center + local reminders deliver the MVP value, and their deep links are reused by push later unchanged).
- **Default:** adopt (insights center + local reminders in MVP; no push).

## DEC-004 — "Smart repayment tips": rules-based only, post-MVP; no LLM-generated advice in-app
- **Decision needed:** confirm that any future "tips" feature is deterministic rules over the user's own data, and that no generative-AI-authored financial guidance ships in-app.
- **Why it matters:** regulatory exposure (financial advice boundary, ASM-012), trust promise (PRIN-5), and it forecloses a tempting hackathon gimmick ("AI financial assistant") that would undermine the honesty positioning.
- **Recommendation:** adopt the boundary. The scenario planner + bank-questions checklists *are* the actionable-guidance feature, and they stay within the recommendation boundary (§17.3).
- **Alternatives:** LLM-drafted, human-reviewed static education content (acceptable — that's authorship tooling, not runtime advice); runtime LLM tips (rejected).
- **Default:** adopt the boundary.

## DEC-005 — "Explore Financing Options" (from SRC-3) rejected for all near-term scope
- **Decision needed:** confirm the SRC-3 "Explore Financing Options" secondary feature stays out.
- **Why it matters:** it is a product/lender-comparison surface. Presenting financing options edges directly into "recommend a specific lender or financial product as the best choice" — an explicit **non-goal** (SRC-1 §5.3) and a violation of the recommendation boundary (§17.3, DEC-004).
- **Recommendation:** reject for MVP and P1. If ever built, it must be strictly neutral, non-promotional, clearly labeled as information (not advice), and legal-reviewed — a distinct future decision, not a scope creep.
- **Default:** reject.

---

## For awareness (decided, no approval needed — flag within 1 week if you disagree)
- **Scope expanded for the confirmed three-week timeline (ADR-0016):** auth, Supabase backend + RLS, consent records, local notifications, card payoff simulator, duplicate detection, and a labeled-mock connect flow promoted to MVP as week-3 work off the demo spine. CRIF/Open Banking remain **mock** (real access is P1, RES-002). Details in `mvp-scope.md` change history and `00-source-audit.md §7`.
- Second obligation type (Murabaha) promoted from "if time permits" to Must (CON-01 resolution) — it's cheap and proves the domain model.
- Estimates render rounded with ≈, not at 3 dp (CON-06 resolution, BR-CALC-014).
- Education content is bundled/static; teammates edit via repo PRs (critique §2.6).
- OCR import and product analytics cut from all near-term scope (critique §2.7).
- Stack: Expo/React Native + TypeScript, local-first MVP, Supabase designed for P1 (ADR-0001/0002/0013) — engineering-authority decisions per SRC-2, documented with full alternatives and reversal costs.
