# User Stories, Acceptance Criteria, Edge Cases

**ID scheme:** `US-###`. Personas: PER-1 Omar (multi-obligation), PER-2 Lina (first-time), PER-3 Khalil (Islamic). Only MVP/S stories are elaborated; P1+ stories are titles in the backlog (`docs/08-delivery/hackathon-plan.md`).

---

## US-001 — First launch to dashboard (PER-1/2) [MVP]

**As a** new user, **I want** to pick my language, understand what the app does, acknowledge the disclaimer, and load demo data or start entering my own, **so that** I reach a meaningful dashboard in under two minutes.

**Acceptance criteria**

- AC-1: Language screen first; Arabic selection flips the entire app to RTL (FR-ONB-001, NFR-L10N-002).
- AC-2: Onboarding ≤3 screens, skippable (FR-ONB-002).
- AC-3: Disclaimer must be affirmatively acknowledged; version + timestamp stored locally; not re-shown unless version changes (FR-ONB-003).
- AC-4: Choosing "Explore with demo data" lands on a populated dashboard with the persistent demo banner (FR-ONB-004/005).
- AC-5: Choosing "Enter my own" lands on the empty-state dashboard with a single primary CTA "Add obligation".

**Edge cases:** kill/relaunch mid-onboarding resumes at the last incomplete step; declining disclaimer shows a respectful blocking explanation (no data access without it); device locale neither AR nor EN → default EN with language screen still shown.

## US-002 — "Where do I stand?" dashboard (PER-1) [MVP]

**As a** borrower with several obligations, **I want** one screen with my totals, next payment, and anything that changed, **so that** I get my answer in ten seconds.

**Acceptance criteria**

- AC-1: Shows total outstanding (aggregate, FR-CALC-006), total monthly commitment, next payment (obligation, amount, date), overall status chip (BR-STAT-001 hierarchy).
- AC-2: Obligation cards per FR-OBL-002; tapping opens detail.
- AC-3: "Recent changes" section lists unread insights (max 3, link to insights center).
- AC-4: Aggregates that mix official and estimated inputs are labeled "includes estimates" (BR-PROV-004).
- AC-5: Empty, loading (skeleton), and demo states per screen spec SCR-HOME.

**Edge cases:** one obligation only (no "totals theater" — layout adapts); all obligations closed (celebratory-calm state); obligation with unknown balance excluded from totals with visible note ("1 obligation not included — missing balance").

## US-003 — Understand a rate change (PER-1) [MVP] ⭐ demo core

**As a** variable-rate borrower whose installment didn't change after a repricing, **I want** to see what the change did to my loan's trajectory, **so that** I'm not surprised at maturity.

**Acceptance criteria**

- AC-1: Loan detail shows rate timeline (FR-RATE-001) with the repricing event marked.
- AC-2: An insight exists: "Your rate increased but your installment didn't change" (FR-INS-001), linking to impact view.
- AC-3: Impact view (FR-RATE-004) shows old/new rate, effective date, estimated added cost, principal-reduction impact ("of your 320 JOD installment, ≈41 JOD less now goes to principal"), and projected residual balance if ≥ threshold (BR-CALC-012).
- AC-4: All impact figures carry "≈" + estimate badge + confidence level; tap opens explanation view (FR-CALC-001) with formula version and assumptions (ASM-008/009 rendered as human-readable limitations).
- AC-5: "Questions to ask your bank" checklist reachable from the impact view (FR-EDU-003).

**Edge cases:** rate _decrease_ with unchanged installment → positive framing insight (paying off faster); multiple repricings → timeline shows all, projection uses the full rate-period sequence; rate change effective before loan start or after maturity → validation error (FR-RATE-002); missing original schedule data → confidence drops, engine may return limited view (BR-CALC-016) and the UI says exactly what's missing.

## US-004 — Explore an extra-payment scenario (PER-1) [MVP] ⭐ demo core

**As a** borrower seeing a residual-balance projection, **I want** to try paying extra monthly or once, **so that** I can see what would restore my original trajectory.

**Acceptance criteria**

- AC-1: Planner reachable from loan detail and from the residual insight ("What can I do?").
- AC-2: Inputs: extra monthly amount, one-time amount + date; presets ("+25", "+50", "+100 JOD").
- AC-3: Output comparison: current vs scenario — payoff date, months saved, estimated cost saved, residual balance at maturity — side by side (FR-SIM-001).
- AC-4: Language complies with the recommendation boundary — "the model estimates…", "ask your bank to confirm extra payments reduce principal" (FR-SIM-003).
- AC-5: Result renders < 300ms or shows progress (NFR-PERF-002).

**Edge cases:** extra payment large enough to pay off before next due date → "paid off by {date}" state, no negative schedules (INV-1); zero/invalid input → inline validation, CTA disabled; scenario on a loan with LOW confidence base projection → planner allowed but banner "based on estimated schedule".

## US-005 — Log a payment (PER-1/2) [MVP]

**As a** borrower, **I want** to record a payment I made, **so that** my progress and balances stay meaningful.

**Acceptance criteria**

- AC-1: Form: date (≤ today), amount, optional principal/interest split (FR-PAY-002).
- AC-2: On save: progress, estimated remaining balance, and status re-derive (FR-PAY-003); provenance = user-entered.
- AC-3: Unknown split → estimated allocation labeled per BR-CALC-010.
- AC-4: Payment list shows the new entry with provenance badge (FR-PAY-001).

**Edge cases:** overpayment beyond remaining balance → warn + clamp options ("mark as fully settled?"); payment predating last rate change → schedule recomputes across periods; future-dated payment rejected.

## US-006 — Add an obligation manually (PER-2) [MVP]

**As a** user, **I want** guided type-specific entry, **so that** I can add my real loan without understanding banking jargon.

**Acceptance criteria**

- AC-1: Type picker (loan / Murabaha / card) with plain-language descriptions.
- AC-2: Per-type form with progressive disclosure: required core fields first (institution, amount, rate/profit, term, start date, installment), optional detail after.
- AC-3: Each field has a contextual "what is this?" (FR-EDU-001); Murabaha form never says "interest" (BR-TERM-001).
- AC-4: On save, obligation appears on dashboard with derived schedule (confidence reflects completeness).
- AC-5: Missing optional data → explicit "unknown" display, never invented defaults (FR-OBL-003).

**Edge cases:** installment inconsistent with amount/rate/term (>2% off computed annuity) → non-blocking notice "this doesn't match our estimate — double-check, or your loan may have fees/different convention" (BR-CALC-017); start date in future → allowed, status "not started".

## US-007 — View Murabaha correctly (PER-3) [MVP]

**As an** Islamic-financing customer, **I want** my Murabaha shown in correct contract terms with honest limits, **so that** I trust the app.

**Acceptance criteria**

- AC-1: Detail shows: total sale price (fixed), cost + profit disclosed, paid, outstanding financing amount, progress, remaining installments (FR-OBL-004).
- AC-2: Zero occurrences of interest/rate-recalculation language or UI (BR-TERM-001); profit rate shown as disclosed contract fact, not a live variable.
- AC-3: Early settlement section is educational: explains ibra' is bank-discretionary, offers bank questions — no simulation (BR-CALC-020).
- AC-4: Education topics for Murabaha linked (FR-EDU-002).

## US-008 — See card position (PER-1) [MVP]

**AC:** card detail per FR-OBL-005; utilization ring with text equivalent (NFR-A11Y-005); insight fires at utilization > 70% ("attention" tone); minimum-payment definition surfaces the payoff caveat (TERM-015). **Edge:** unknown APR → display "unknown", simulator (if stretch built) requires APR input first.

## US-009 — Trust the numbers (all personas) [MVP] ⭐ trust core

**As a** user, **I want** to see where any number came from, **so that** I can rely on it or know not to.

**Acceptance criteria**

- AC-1: Every material figure renders with provenance badge (official / user-entered / estimate — TERM-026/027/028) via the design-system `Amount` component (PRIN-2 enforcement).
- AC-2: Tap → explanation view: value, source, last-updated, definition (glossary), derivation (inputs + formula version + assumptions) when derived (FR-CALC-001).
- AC-3: Estimates display per BR-CALC-014 (≈, rounded, confidence); official values at 3 dp.
- AC-4: When the engine refuses (BR-CALC-016) the UI shows the limited view + "what's missing" + how to fix (add data).

## US-010 — Switch language (PER-2/3) [MVP]

**AC:** settings toggle AR↔EN; full RTL flip (reload acceptable, state restored to settings screen); numbers/dates re-localize; no clipped/overlapping layout in either direction on core screens (NFR-L10N-002/005).

## US-011 — Erase my data (all) [MVP]

**AC:** settings action, double confirmation, wipes local DB + preferences (keeps nothing), returns to onboarding; demo mode: "reset demo data" separately (FR-SET-003/005). **Edge:** erase during pending write → transactional, no partial state.

## US-012 — Review insights (PER-1) [MVP]

**AC:** insights center per FR-INS-002/003/004; unread badge on Home; each insight deep-links; "why did I get this?" one-liner present.

## Stretch stories

- **US-013** Card payoff simulator (FR-SIM-004): minimum-only path shows months + total finance charges vs alternatives; warning when payment ≤ monthly charge ("balance would not decrease").
- **US-014** Local due-date reminders (FR-NTF-001): content-minimized OS notification, deep-links to obligation, respects OS notification permission denial gracefully.
- **US-015** Export my data (FR-SET-004).

## Cross-cutting edge-case matrix (tested per screen where applicable)

| Condition                              | Expected behavior                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Airplane mode (whole app)              | Fully functional in MVP (local-first); data-source screen shows providers "local"               |
| Empty states                           | Every list screen has designed empty state with one primary action (SCR specs)                  |
| Unknown field                          | Rendered "unknown" + affordance to add; never 0, never blank                                    |
| Stale demo clock (device date changed) | Status derivation uses device date; demo tolerates any "today" ≥ seed anchor date (BR-STAT-002) |
| Huge values (999,999,999 JOD)          | Layout survives; formatter abbreviates in cards, full value in detail                           |
| Font scale 1.5× / small screens        | Core screens usable (NFR-L10N-005)                                                              |
| Process death on any screen            | Relaunch restores to Home without data loss (state in SQLite, not memory)                       |
