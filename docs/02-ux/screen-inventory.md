# Screen Inventory & Specifications

**Template per screen:** Purpose (one sentence — PRIN-9) · Primary action · Key content · States · Requirements traced.
**States legend:** L=loading (skeleton), E=empty, ER=error, OF=offline, D=demo-specific. MVP is local-first, so OF ≡ normal for local data; OF rows appear only where a future network source is involved.
All screens: RTL-mirrored, a11y per NFR-A11Y-*, one primary CTA.

---

## Onboarding

### SCR-ONB-LANG — Language selection

- **Purpose:** choose Arabic or English before any content. **Primary action:** select language (immediate apply).
- Content: two large cards (العربية / English), each label in its own language; app logo. No skip.
- States: none (static). Re-entry: settings.
- Traces: FR-ONB-001, NFR-L10N-002.

### SCR-ONB-INTRO — Value proposition (3 slides)

- **Purpose:** communicate unified view / understand changes / plan ahead. **Primary:** Continue; secondary: Skip.
- Slides use illustration + one sentence each; no text in images (NFR-L10N).
- Traces: FR-ONB-002.

### SCR-ONB-CONSENT — Disclaimer & privacy acknowledgment

- **Purpose:** informed acknowledgment before data. **Primary:** "I understand and agree".
- Content: financial-information disclaimer (estimates ≠ advice; app never modifies contracts), privacy summary, links to full texts (SCR-LEGAL-DOC). Version ids visible.
- States: declined → respectful blocker with re-entry.
- Traces: FR-ONB-003, NFR-PRIV-002.

### SCR-ONB-DATA — Choose data path

- **Purpose:** demo data vs manual entry. **Primary:** two equal cards: "Explore with demo data" / "Add my own obligations"; disabled card "Connect bank/bureau — coming soon" honestly labeled.
- Traces: FR-ONB-004, C-07.

## Tab roots

### SCR-HOME — Dashboard ⭐

- **Purpose:** answer "where do I stand?" in 10 seconds. **Primary action:** contextual (open top insight if unread urgent/attention, else next payment).
- Content order (the four questions, top→down): ① total outstanding + total monthly commitment (Amount components with provenance; "includes estimates" note when mixed — BR-PROV-004) ② overall status chip ③ next payment card ④ recent changes (≤3 unread insights) ⑤ obligation cards ⑥ data freshness footer. Demo banner pinned when in demo mode (FR-ONB-005).
- States: L skeleton cards · E "no obligations yet" + single CTA Add/Load demo · D banner · ER partial-data note per BR-PROV-005 (excluded obligations named).
- Traces: FR-OBL-001/002, FR-CALC-006, US-002.

### SCR-OBL-LIST — Obligations

- **Purpose:** browse and manage all obligations. **Primary:** Add obligation (FAB).
- Content: filter chips (All / Loans / Financing / Cards / Closed), obligation cards (same component as Home), sort by next-due default.
- States: L · E (same as Home empty) · closed-only state.
- Traces: FR-OBL-002/006/008.

### SCR-LEARN — Education hub

- **Purpose:** browse plain-language topics. **Primary:** open a topic.
- Content: category sections (conventional/Islamic/cards), search, "start here" row for PER-2.
- States: none (bundled content). Traces: FR-EDU-002/004.

## Obligation detail family (route `/obligation/[id]`, subtype-driven sections — NAV-2)

### SCR-OBL-DETAIL-LOAN ⭐

- **Purpose:** full picture of one conventional loan. **Primary:** contextual — "See what changed" when unread rate insight, else "Explore scenarios".
- Sections: header (nickname, institution, status chip) · balance block (outstanding + provenance) · progress (principal repaid vs original; % + bar + text) · key facts grid (installment, rate + fixed/variable badge, next due, maturity, term remaining) · insights strip · rate history preview → SCR-RATE-HIST · payments preview → SCR-PAY-LIST · schedule link → SCR-OBL-SCHEDULE · totals (paid, principal, interest, estimated remaining interest) · data sources footer.
- States: L · missing-field "unknown" affordances (FR-OBL-003) · limited-view banner when engine refused (BR-CALC-016): shows what's missing + "add data" CTA.
- Traces: FR-OBL-003, US-003, US-009.

### SCR-OBL-DETAIL-MURABAHA

- **Purpose:** contract-correct Murabaha view. **Primary:** "View schedule".
- Sections: total sale price (fixed — labeled as contract fact), cost + disclosed profit, outstanding financing amount, progress, installments, payments, early-settlement education block (ibra' explanation + bank questions — **no simulation**), Murabaha education links.
- Forbidden: any interest/rate-change UI (BR-TERM-001 checked in review).
- Traces: FR-OBL-004, US-007, BR-CALC-020.

### SCR-OBL-DETAIL-CARD

- **Purpose:** card position at a glance. **Primary action:** "Payoff simulator" → SCR-SIM-CARD, else "Log payment".
- Sections: balance vs limit (utilization ring + text equivalent), available credit, statement block (statement balance, min payment + TERM-015 caveat inline, due date), rates & fees (unknowns explicit), payments.
- Traces: FR-OBL-005, US-008.

## Loan analysis flow ⭐ (the demo spine)

### SCR-RATE-HIST — Rate history

- **Purpose:** show every rate period on a timeline. **Primary:** "See impact" on the latest change; secondary: log rate change → SCR-RATE-ADD.
- Content: vertical timeline (value, effective date, source badge, delta chips), current-rate header.
- States: single-rate loan → timeline of one + "fixed for now" note.
- Traces: FR-RATE-001/002.

### SCR-RATE-IMPACT — Rate-change impact ⭐

- **Purpose:** explain what one repricing did to the trajectory. **Primary:** "What can I do?" → SCR-SIM-LOAN.
- Content: before/after rate header · effective date · three impact statements in prose (added estimated total cost; principal-reduction shift "≈41 JOD less of each installment now reduces principal"; projected residual balance at maturity when ≥ threshold) · trajectory mini-chart (with text summary as primary artifact — NFR-A11Y-005) · confidence + assumptions strip → SCR-EXPLAIN · bank questions link.
- Tone: attention, not alarm (PRIN-4): amber accents, verbs of control.
- Traces: FR-RATE-004, US-003 AC-3/4/5.

### SCR-SIM-LOAN — Scenario planner ⭐

- **Purpose:** explore extra-payment scenarios against current trajectory. **Primary:** "Calculate".
- Content: inputs (extra monthly stepper + presets; one-time amount + date) · result: side-by-side columns Current vs Scenario (payoff date, months saved, est. cost saved, residual balance) · delta highlights · recommendation-boundary phrasing (FR-SIM-003) · explanation link.
- States: pre-calculation (inputs only) · result · invalid input inline · LOW-confidence base banner.
- Traces: FR-SIM-001/002/003, US-004.

### SCR-EXPLAIN — Calculation explanation (reusable sheet) ⭐

- **Purpose:** make any derived number defensible. Parameter: calculation-run id (NAV-3).
- Content: the value · plain-language formula description · formula version id · inputs table (each with provenance badge + freshness) · assumptions/limitations list (rendered from engine output, e.g. ASM-008 text) · confidence level with meaning · calculated-at.
- Traces: FR-CALC-001/005, US-009, PRIN-1/2.

### SCR-BANK-QUESTIONS — Questions for your bank

- **Purpose:** convert insight into an informed conversation. **Primary:** share/copy list (stretch: export).
- Content: context-generated checklist (e.g. after repricing: "Can my installment be adjusted to keep the original maturity?" / "Do extra payments reduce principal immediately?" / "Is there an early-repayment fee?").
- Traces: FR-EDU-003, PRIN-5.

### SCR-OBL-SCHEDULE — Amortization schedule

- **Purpose:** period-by-period table. Content: virtualized rows (period, date, payment, principal, interest/profit, balance), rate-change markers, estimate labeling header. Traces: FR-CALC-002.

## Data entry

### SCR-OBL-ADD-TYPE — type picker (plain-language cards; loan/Murabaha/card) — FR-OBL-006, US-006.

### SCR-OBL-ADD-FORM — per-type form

- Progressive disclosure (core → optional), per-field "what is this?" (FR-EDU-001), type-correct terminology, consistency notice per BR-CALC-017, save → detail.
- States: validation errors inline; future start date allowed (US-006 edge).

### SCR-PAY-ADD — log payment (modal) — US-005; date ≤ today, amount, optional split; overpayment warning.

### SCR-RATE-ADD — what-if rate scenario (modal) — FR-RATE-002; effective-date bounds; calculation is ephemeral and never changes rate history, balance, or installment.

### SCR-PAY-LIST — payment history — FR-PAY-001; provenance badges; allocation split with estimate labels (BR-CALC-010).

## Global

### SCR-INS-CENTER — Insights center

- Purpose: review everything the app noticed. Content: grouped by day; severity icon+text (never color alone); "why did I get this?" line; read state; deep links. States: E "all calm" state (positive, meaningful — PRIN-4). Traces: FR-INS-001…004, US-012.

### SCR-SIM-CARD — Card payoff simulator ⭐ (MVP, milestone M7)

- **Purpose:** show total cost of a card balance under minimum-only vs. a fixed or custom payment amount. **Primary action:** "Calculate".
- Content: inputs (payment strategy picker: minimum / fixed amount / custom; APR pre-filled from card record with edit option) · result: months to payoff, total finance charges, total paid, savings vs minimum-only · side-by-side comparison table · **"payment doesn't cover monthly charges" warning state** when input payment ≤ first-period finance charge (`neverPaysOff` result from `cardPayoff.v1`).
- States: pre-calculation (inputs only) · result · neverPaysOff warning · missing APR/balance → refusal banner with "add data" CTA.
- Assumption note rendered: monthly vs daily accrual caveat (ASM-011 text; see financial-calculation-spec.md §4.6).
- Traces: FR-SIM-004, US-013, `cardPayoff.v1`, TV-6xx.

### SCR-SET — Settings

- Language, appearance of legal acknowledgments (versions/dates — FR-SET-002), data sources → SCR-DATA-STATUS, reset demo (demo mode), erase all data (double confirm — US-011), about/version, export (stretch).

### SCR-DATA-STATUS — Data sources

- Purpose: honest provider status. Content: provider list (Demo seed / Manual entry / "CRIF — not connected, coming later" / "Open Banking — not connected"), last refresh, record counts; mock/demo prominently labeled (FR-DATA-003, C-07).

### SCR-LEGAL-DOC — legal text viewer (disclaimer, privacy) with version header.

### SCR-LEARN-TOPIC — education topic page: definition-first, JOD example, related terms, contract-specific caveats; content version footer (FR-EDU-004).

## Auth & connect (added 2026-07-11 — resolves the previously-undefined SCR-AUTH-*/SCR-CONSENT/SCR-CONNECT references; per [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md) personal mode requires an account)

### SCR-AUTH-SIGNIN — Password sign in

- **Purpose:** returning verified users sign in with email/password. **Primary:** Sign in; secondary: create account or continue in demo mode.
- States: loading · invalid credentials · unverified email · offline · rate-limited.
- Traces: ADR-0019, FR-ONB-006, FR-AUTH-001, US-016, NFR-SEC-003.

### SCR-AUTH-SIGNUP — Create account

- **Purpose:** collect full name, E.164 contact phone, primary bank, email, and password. No profile write occurs before verification.
- States: validation · password mismatch/weakness · offline · rate-limited · sending failure.

### SCR-AUTH-VERIFY — Verify email code

- **Purpose:** enter the six-digit first-time signup code in-app; no email address in route parameters.
- States: loading · invalid code · expired code · too many attempts · offline · resend cooldown · profile/entry failure. Actions: verify, resend, change email.
- Traces: ADR-0019, FR-AUTH-001/006, US-016.

Legacy callback/update-password routes redirect safely. Password recovery remains a separately reviewed follow-up.

### SCR-CONSENT-PROVIDER — Per-provider consent

- **Purpose:** informed, versioned, per-provider consent before any connect/retrieve (distinct from SCR-ONB-CONSENT's app-level disclaimer). **Primary:** "I consent" (recorded server-side with version + timestamp for signed-in users).
- States: ER (record failure — consent must persist before proceeding) · declined (respectful block of the connect flow only).
- Traces: FR-AUTH-002/005, NFR-PRIV-002, US-016/US-017.

### SCR-CONNECT-MOCK — Connect a data source (labeled mock)

- **Purpose:** consent-gated connect→retrieve→classify flow against the **visibly-labeled mock** CRIF/Open-Banking provider — never implies live access. **Primary:** Connect (gated on SCR-CONSENT-PROVIDER).
- Content: provider cards each carrying a permanent "Mock / demonstration" badge; retrieval progress; imported-records summary with mock provenance badges.
- States: L (retrieving) · ER (with retry) · consent-missing (redirect to consent).
- Traces: FR-ONB-004, FR-AUTH-005, US-017, C-07.

## Stretch screens

- **SCR-EXPORT** — export summary (US-015).
- **SCR-SCEN-SAVED** — saved scenarios list (FR-SIM-005).

## State matrix (summary)

| Screen               | L   | E             | ER                          | D   | Limited/partial                   |
| -------------------- | --- | ------------- | --------------------------- | --- | --------------------------------- |
| SCR-HOME             | ✅  | ✅            | ✅                          | ✅  | ✅ (excluded-obligation note)     |
| SCR-OBL-LIST         | ✅  | ✅            | —                           | ✅  | —                                 |
| SCR-OBL-DETAIL-*     | ✅  | —             | ✅                          | ✅  | ✅ (unknown fields, refused calc) |
| SCR-RATE-IMPACT      | ✅  | —             | ✅                          | —   | ✅ (confidence banner)            |
| SCR-SIM-LOAN         | —   | ✅ (pre-calc) | ✅                          | —   | ✅ (LOW-confidence banner)        |
| SCR-SIM-CARD         | —   | ✅ (pre-calc) | ✅ (refusal / neverPaysOff) | —   | ✅ (missing APR/balance)          |
| SCR-INS-CENTER       | ✅  | ✅            | —                           | —   | —                                 |
| SCR-DATA-STATUS      | ✅  | —             | —                           | ✅  | —                                 |
| Forms (ADD/PAY/RATE) | —   | —             | ✅ (validation)             | —   | —                                 |
