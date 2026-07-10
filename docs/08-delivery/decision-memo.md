# Decision Memo — Items Requiring Human Approval

**Policy applied (SRC-2):** engineering-resolvable trade-offs were decided and recorded as ADRs. Only decisions that materially change the product promise, carry regulatory weight, or are genuinely preference-balanced are escalated. **Defaults apply if no response before implementation start** — silence is not a blocker.

---

## DEC-001 — Authentication scope for the hackathon build
- **Decision needed:** ship the demo with local demo-mode only (no sign-in), or implement Supabase auth for the event.
- **Why it matters:** changes the demo's opening 30 seconds, its failure modes (network/auth on stage), and where ~2–3 days of effort go.
- **Recommendation:** demo-mode only. Auth adds zero story value for judges, adds the top demo risk, and the full auth/consent design is already specified for P1 (nothing is lost). SRC-1 itself lists this as an open question and allows "a clear demo-mode boundary" (§32.2).
- **Alternatives:** (a) full Supabase auth — costs M5/M6 polish time; (b) fake login screen — dishonest, rejected on principle.
- **Default:** demo-mode only.

## DEC-002 — Information architecture: 3 tabs, Plan contextual
- **Decision needed:** accept Home/Obligations/Learn with the scenario planner entered from obligation detail (dropping SRC-1 §11's global Plan tab).
- **Why it matters:** changes the app's primary navigation shape shown to judges; deviates from the brief's (self-flagged, non-final) recommendation.
- **Recommendation:** adopt. Rationale in `information-architecture.md §3` (a global planner's first screen is a picker — hallway, not room). Promotion trigger defined if usage data later disagrees.
- **Alternatives:** 4 tabs with Plan-as-picker; 4 tabs with Plan defaulting to largest obligation.
- **Default:** adopt 3 tabs. Reversal cost: trivially low.

## DEC-003 — Notifications: in-app insights center for MVP
- **Decision needed:** accept that MVP "notifications" = in-app insights center (+ optional local reminders as stretch), no push.
- **Why it matters:** SRC-1 §18 specifies a full notification system; team may expect visible push in the demo.
- **Recommendation:** adopt. Push needs backend + tokens + permission UX for no additional demo insight; the insights center demonstrates the intelligence layer (which is the impressive part) and its deep links are reused by push later unchanged.
- **Alternatives:** local scheduled notifications in the scripted demo (possible as stretch S2 — cheap, partial effect); full FCM (rejected for MVP).
- **Default:** adopt.

## DEC-004 — "Smart repayment tips": rules-based only, post-MVP; no LLM-generated advice in-app
- **Decision needed:** confirm that any future "tips" feature is deterministic rules over the user's own data, and that no generative-AI-authored financial guidance ships in-app.
- **Why it matters:** regulatory exposure (financial advice boundary, ASM-012), trust promise (PRIN-5), and it forecloses a tempting hackathon gimmick ("AI financial assistant") that would undermine the honesty positioning.
- **Recommendation:** adopt the boundary. The scenario planner + bank-questions checklists *are* the actionable-guidance feature, and they stay within the recommendation boundary (§17.3).
- **Alternatives:** LLM-drafted, human-reviewed static education content (acceptable — that's authorship tooling, not runtime advice); runtime LLM tips (rejected).
- **Default:** adopt the boundary.

---

## For awareness (decided, no approval needed — flag within 1 week if you disagree)
- Second obligation type (Murabaha) promoted from "if time permits" to Must (CON-01 resolution) — it's cheap and proves the domain model.
- Estimates render rounded with ≈, not at 3 dp (CON-06 resolution, BR-CALC-014).
- Education content is bundled/static; teammates edit via repo PRs (critique §2.6).
- OCR import and product analytics cut from all near-term scope (critique §2.7).
- Stack: Expo/React Native + TypeScript, local-first MVP, Supabase designed for P1 (ADR-0001/0002/0013) — engineering-authority decisions per SRC-2, documented with full alternatives and reversal costs.
