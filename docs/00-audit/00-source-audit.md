# Source Audit — Conflict & Gap Report

**Phase:** 1 (Source Audit)
**Status:** Complete for available sources
**Date:** 2026-07-10
**Auditor:** Lead architecture agent
**Sources audited:**

| ID    | Document                                        | Role                                        | Available                                       |
| ----- | ----------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| SRC-1 | `ELTIZAMATI_MASTER_BRIEF.md` v1.0               | Authoritative product source                | ✅ Yes (`docs/99-sources/`)                     |
| SRC-2 | `FABLE_5_ARCHITECT_PROMPT.md`                   | Engineering expectations / process contract | ✅ Yes (`docs/99-sources/`)                     |
| SRC-3 | `Eltizamati_Complete_Architecture_and_Flow.pdf` | Supporting evidence                         | ✅ **Supplied 2026-07-10** — delta-audited (§7) |
| SRC-4 | UI blueprint (HTML, branded "Wadeh/واضح")       | Supporting evidence                         | ✅ **Supplied 2026-07-10** — delta-audited (§7) |
| SRC-5 | Existing pitch deck                             | Supporting evidence                         | ❌ **Not supplied**                             |

---

## 1. Source Documents — Status

SRC-3 (architecture PDF) and SRC-4 (UI blueprint HTML) were **supplied on 2026-07-10**, after the initial knowledge base was written. They have now been delta-audited — results in **§7**. SRC-5 (pitch deck) remains outstanding. Consequences of the original absence, now closed:

1. The initial KB was built treating SRC-1 as the sole product truth, consistent with its declared authority ("Treat mockups and early documents as evidence and inspiration, not unquestionable truth").
2. The §7 delta-audit confirms the KB is consistent with the supplied documents; SRC-3/4 required **scope and timeline changes** (three-week build; auth/backend/notifications/card-simulator promoted) but **no reversal of any load-bearing architectural decision**.
3. **Action still open (owner: Talal):** supply SRC-5 (deck), then re-run the checklist below against it.

### Delta-audit checklist (completed for SRC-3/4 on 2026-07-10; re-run for SRC-5)

- [x] Screen inventory: diffed against `docs/02-ux/screen-inventory.md`; screens present only in a blueprint are _proposed_, not confirmed. (SRC-3 balloon Overview/Timeline/Solution + SRC-4 "two numbers" adopted as enrichments — §7.)
- [x] Navigation: diffed against `docs/02-ux/information-architecture.md`. SRC-3 proposes 6 tabs, SRC-4 proposes 4; **DEC-002's 3 tabs retained** (§7 rationale). SRC-3 and SRC-4 also conflict with _each other_.
- [x] Any financial formula/number/rate example: SRC-3 (311→349 JOD) and SRC-4 (30,000 loan, 310.900, 4.5→6.5%, gap 3,840) are **marketing illustrations**; the finance-validated canonical seed (TV-30x) governs — no deck numbers adopted.
- [x] Integration claims: SRC-3 shows CRIF+Open Banking as "live/primary". **Re-labeled per BR-PROV rules** — kept as mock/sandbox provider; now built as a real consent→connect→retrieve flow against a _labeled mock_ (§7 items 1–2).
- [x] Tech-stack statements: SRC-3 asserts no stack; nothing supersedes ADR-0001…0015. The one new architectural force (three-week timeline enabling backend activation) is recorded in **ADR-0016**, not by editing existing ADRs.

---

## 2. Statement Classification

Every material statement in SRC-1 was classified as **Confirmed** (product truth), **Assumed** (stated but unverified), **Proposed** (design suggestion requiring evaluation), or **Unresolved** (explicitly open). Full assumption registry: `docs/00-product/assumptions-validation-backlog.md`.

### 2.1 Confirmed (product truth — carried into requirements)

| Ref  | Statement                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | Core mission: unified, understandable view of financial obligations; explain changes, costs, progress, future risk (SRC-1 §1, §4).                |
| C-02 | Jordan-first, MENA-ready; Arabic + English + RTL from foundation (§0, §24.3, §35.3).                                                              |
| C-03 | Not a bank, bureau, adviser, or settlement service; never claims to modify contracts or guarantee outcomes (§1, §5.3, §17.3).                     |
| C-04 | Official values must be visibly distinguished from estimates; provenance recorded (§1, §7.2, §35.12–13).                                          |
| C-05 | Decimal-safe arithmetic; JOD 3-decimal precision; calculations outside UI; formula versioning; reproducibility (§22, §35.4–5).                    |
| C-06 | Islamic financing must be contract-aware, not terminology-swapped (§7.7, §14.2, §37.3).                                                           |
| C-07 | Provider abstraction with honest labeling of mock/sandbox/real (§9.3, §32.3).                                                                     |
| C-08 | Solo developer (web background, no mobile experience); AI agents write much of the code; architecture must resist AI entropy (§25, §7.10, §33.1). |
| C-09 | One cross-platform codebase; Android + iOS design; hackathon delivers Android APK (§35.1–2).                                                      |
| C-10 | Non-negotiable engineering constraints list (§35) — all 20 items adopted verbatim as NFRs.                                                        |
| C-11 | Calm, non-shaming, education-first UX personality (§7.3–7.5, §24.1).                                                                              |

### 2.2 Assumed (stated as if true, needs validation)

| Ref  | Statement                                                                                                       | Risk if wrong                            | Registry ID |
| ---- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------- |
| A-01 | Multi-obligation borrowers in Jordan lack a unified view and want one (§3, §6.1).                               | Product premise; hackathon pitch weakens | ASM-001     |
| A-02 | Variable-rate + unchanged-installment → residual balloon is a real, common pattern in Jordanian retail lending. | The headline demo story collapses        | ASM-002     |
| A-03 | CRIF and Open Banking data would contain the fields listed in §9.1–9.2.                                         | Provider contracts need rework           | ASM-003     |
| A-04 | Users will manually enter obligation data with enough accuracy to compute anything useful.                      | Manual-entry path produces garbage-in    | ASM-004     |
| A-05 | JOD amounts displayed at 3 decimals is what users expect (vs. rounded JOD).                                     | Presentation-layer decision only         | ASM-005     |
| A-06 | Judges reward architectural quality, not only demo flash (§38.1).                                               | Effort allocation                        | ASM-006     |

### 2.3 Proposed (design suggestions this KB evaluated rather than copied)

| Ref  | Proposal in SRC-1                                              | Disposition                                                                                                | Where decided                          |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| P-01 | 4-tab navigation: Home / Obligations / Plan / Learn (§11)      | **Modified** → 3 tabs; Plan is contextual to an obligation                                                 | DEC-002, `information-architecture.md` |
| P-02 | Data source priority policy (§9.4)                             | **Adopted & formalized**                                                                                   | BR-PROV-001                            |
| P-03 | 8 initial obligation types (§8.1)                              | **Adopted as domain model; narrowed for MVP** to 3 (variable-rate personal loan, Murabaha, credit card)    | `mvp-scope.md`, ADR-0008               |
| P-04 | Auth capabilities list incl. passkeys, OTP, biometrics (§20.1) | **Deferred**; MVP is local demo-mode with explicit boundary; Supabase email auth is post-hackathon phase 1 | DEC-001, ADR-0012                      |
| P-05 | Notification categories (§18)                                  | **Narrowed** → in-app insights center in MVP; push infra post-hackathon                                    | DEC-003                                |
| P-06 | Education engine with remote content management (§32.4)        | **Narrowed** → versioned static content bundled in-app                                                     | `mvp-scope.md`                         |
| P-07 | Status model list (§23)                                        | **Adopted & formalized** as a derived state machine                                                        | BR-STAT-001, `domain-model.md`         |
| P-08 | OCR statement import (§32.4 stretch)                           | **Cut from all near-term scope** (privacy + effort vs. value)                                              | `mvp-scope.md` §Not-Build              |

### 2.4 Unresolved (SRC-1 §36 open questions → decision/research backlog)

All 18 open questions in §36 were converted into tracked items — none were silently answered. See `docs/00-product/assumptions-validation-backlog.md` (ASM-/RES- items) and `docs/08-delivery/decision-memo.md` (DEC- items needing humans). The three that most affect the hackathon build: judging criteria (RES-001), CRIF/Open-Banking sandbox availability (RES-002), demo-mode vs. auth for judging (DEC-001).

---

## 3. Contradictions & Internal Tensions Found

| ID     | Conflict                                                                                                                                                                                                                  | Resolution in this KB                                                                                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CON-01 | §32.1 lists under **"Must Demonstrate"**: "Credit-card view or second obligation type _if time permits_" — a must-have qualified as optional.                                                                             | Reclassified: second obligation type (Murabaha, read-only) is **Must** because it proves the extensible domain model cheaply; the credit-card _simulator_ is **Stretch**. See `mvp-scope.md`.                                                                |
| CON-02 | §11 recommends a global **Plan** tab; §7.9 demands one dominant purpose per screen and §37.1 demands a sharp MVP. A global Plan tab requires an obligation picker and duplicates the per-obligation scenario entry point. | Plan removed as a tab for MVP; simulator is reached from obligation detail. Re-evaluate with usage data post-MVP. DEC-002.                                                                                                                                   |
| CON-03 | §20 specifies a full auth/consent lifecycle; §36 asks whether auth is even wanted for judging; §32.2 lists auth as only "should".                                                                                         | MVP: local demo mode with explicit boundary + local consent acknowledgment. Full auth/consent lifecycle is specified in docs (so nothing is lost) but implemented post-hackathon. DEC-001.                                                                   |
| CON-04 | §5.1 goal 8 ("evolve from prototype to production without complete rewrite") vs. §37.4 (avoid enterprise complexity at a hackathon). Not a true contradiction but an unpriced tension.                                    | Resolved by architecture choice: production-shaped _boundaries_ (packages, provider contracts, schema) with hackathon-sized _implementations_ (local-only data, no push infra, no real providers). See ADR-0002, ADR-0013.                                   |
| CON-05 | §8.2 lists ~15 "core modules" while §32 MVP realistically funds ~6. "Core" is ambiguous between product-vision core and MVP core.                                                                                         | Modules re-labeled: vision-scope vs MVP-scope columns in `mvp-scope.md`.                                                                                                                                                                                     |
| CON-06 | §22.1 mandates JOD 3-decimal presentation "normally", §24.2 mandates "no fake precision". Estimates displayed at 3 decimals _are_ fake precision.                                                                         | Presentation rule BR-CALC-014: official values render at 3 dp; estimates render rounded to whole JOD (or 1 dp) with a "≈" prefix and confidence label; exact estimate values available in the calculation explanation view.                                  |
| CON-07 | §9.1 CRIF data listed as providing "outstanding balance… payment performance" while §16.2/§22.3 acknowledge bureau data may be stale/incomplete. The dashboard cannot treat bureau values as live.                        | Provenance model gives bureau data its own freshness class; it can never be labeled "official current balance", only "as reported on {date}". BR-PROV-003.                                                                                                   |
| CON-08 | SRC-2 non-negotiable #12 "Enforce authorization server-side" vs. the recommended local-first MVP (no server in the demo path).                                                                                            | Not weakened: the constraint binds any server-backed deployment. The MVP has no server surface to authorize; the Supabase schema ships with RLS designed-in from the first migration (never retrofitted). Documented in ADR-0002 and `security-controls.md`. |
| CON-09 | §31.5 golden/snapshot tests "if supported by the chosen stack" — chosen stack (React Native) has weaker golden-test culture than Flutter.                                                                                 | Replaced with RNTL render-assertion tests + Maestro screenshots for key screens; recorded as a conscious trade-off in ADR-0011.                                                                                                                              |

---

## 4. Gaps (information required but absent from all sources)

| ID     | Gap                                                                                                                                  | Impact                                                    | Handling                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GAP-01 | No Jordanian bank conventions: day count, compounding, repricing frequency, rounding used by local lenders.                          | Engine outputs cannot be claimed to match bank schedules. | Engine uses documented generic conventions; every output labeled estimate; validation task RES-004 for finance teammates. |
| GAP-02 | No hackathon logistics: date, duration, judging criteria, submission format.                                                         | Cannot final-size MVP.                                    | MVP sized conservatively; RES-001.                                                                                        |
| GAP-03 | No brand identity, palette, typography, name lockup (Arabic wordmark).                                                               | Design tokens are placeholders.                           | Neutral "calm clarity" token set defined; swap-ready. RES-005.                                                            |
| GAP-04 | No sample statements/contracts from Jordanian banks or Islamic banks.                                                                | Manual-entry field design is assumption-driven.           | Fields marked ASM-004; teammate task to collect 2–3 anonymized statements. RES-006.                                       |
| GAP-05 | No legal review of Jordan PDPL (Law 24/2023) obligations, disclaimers wording, or CBJ boundaries for financial information services. | Consent text and disclaimers are drafts.                  | Flagged legal-validation items; nothing in-app claims advice. RES-003.                                                    |
| GAP-06 | No target device/OS floor.                                                                                                           | Build config ambiguity.                                   | Assumed Android 8.0+/iOS 15.5+ (current Expo SDK defaults) — ASM-007.                                                     |
| GAP-07 | Early settlement rules for Islamic contracts (ibra'/rebate policies) are institution-specific and undocumented.                      | Cannot simulate Islamic early settlement honestly.        | Islamic simulation excluded from MVP; read-only + education instead. BR-CALC-020.                                         |
| GAP-08 | ~~SRC-3/4/5 absent entirely~~ **Partially closed 2026-07-10**: SRC-3/4 supplied and delta-audited (§7). SRC-5 (deck) still absent.   | Reduced to deck-only.                                     | §7 results; re-run §1 checklist on SRC-5 when supplied.                                                                   |

---

## 5. Risk Summary (top items; full register in `docs/08-delivery/roadmap-and-risks.md`)

- **RISK-001 (financial correctness):** publishing a balloon/interest figure a bank can refute. Mitigated by confidence labels, estimate framing, refusal rules (BR-CALC-016), finance-team test vectors.
- **RISK-002 (scope):** SRC-1's breadth tempts a shallow build of everything. Mitigated by the single-story MVP (`mvp-scope.md`).
- **RISK-003 (solo dev, new platform):** mobile-specific defects from web assumptions. Mitigated by stack choice (ADR-0001), `mobile-primer-for-web-devs.md`, Expo-managed workflow.
- **RISK-004 (AI entropy):** agents duplicating logic/models. Mitigated by `AI_AGENT_RULES.md`, lint-enforced dependency direction, small package surface.
- **RISK-005 (integration theater):** implying live CRIF/Open Banking. Mitigated by provider provenance labels rendered in UI, demo-mode banner.

---

## 6. Audit Verdict

SRC-1 is an unusually complete brief: mission, constraints, and quality bar are clear and internally consistent at the level of intent. Its weaknesses are (a) MVP over-breadth, (b) absent financial-convention facts (which it honestly flags), and (c) a handful of scope contradictions listed above — all resolvable by decision, none by invention. No non-negotiable was weakened; two were re-interpreted for the local-first MVP (CON-08, CON-09) with explicit documentation.

**Proceed to Phase 2 (Product Clarification): approved.**

---

## 7. SRC-3 / SRC-4 Delta-Audit Results (2026-07-10)

**Trigger:** SRC-3 (`Eltizamati_Complete_Architecture_and_Flow.pdf`) and SRC-4 (UI blueprint HTML, branded "Wadeh/واضح") supplied after the KB was written; corrected fact that the hackathon runs **~3 weeks**, not a compressed day.

**Headline:** SRC-3 describes the **broad, integrated** vision (CRIF-primary + Open Banking live, full auth/consent, 6 tabs, notification engine). SRC-4 describes a **sharp, single-loan** blueprint (manual, offline-first, 4 tabs). **They conflict with each other.** The current KB sits deliberately between them and already resolves the tension. Neither document contradicts the load-bearing decisions — **finance-engine isolation, provider abstraction, domain model, error taxonomy, and Arabic/RTL foundation stand unchanged.** The changes SRC-3/4 + the three-week correction _do_ justify are **scope promotions and a calendarised roadmap**, recorded in `mvp-scope.md`, `functional-requirements.md`, `hackathon-plan.md`, `readiness-review.md`, `decision-memo.md`, and **ADR-0016**.

### 7.1 Classification of SRC-3 capabilities

| #   | SRC-3 capability / flow                                                         | Class                                                   | Disposition                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CRIF Jordan as **primary** source                                               | Deferred (mock) → upgraded                              | Kept labeled mock; built as a **real consent→connect→retrieve flow against a mock CRIF provider** (not "coming soon").                                                                                                                                                      |
| 2   | Open Banking live updates                                                       | Deferred (mock)                                         | Sandbox provider contract unchanged (ADR-0009).                                                                                                                                                                                                                             |
| 3   | Auth (SignIn/SignUp/Forgot, email verify, phone OTP, biometrics)                | **Promoted to MVP (partial)**                           | Email auth + session + reset + biometric lock in MVP; **phone OTP stays P1** (SMS cost). Demo mode remains stage path. ADR-0016.                                                                                                                                            |
| 4   | Consent (Terms/Privacy/CRIF/Open Banking)                                       | **Promoted to MVP**                                     | Versioned server-backed consent records + per-provider consent gating the mock connect.                                                                                                                                                                                     |
| 5   | Unified 'My Obligations' dashboard                                              | Covered                                                 | FR-OBL-001/002, SCR-HOME.                                                                                                                                                                                                                                                   |
| 6   | Adaptive Islamic UI ("layout identical")                                        | Covered + intentionally changed                         | Terminology map covered (BR-TERM-001); **"layout identical" rejected** — contract-correct sections, no rate-recalc UI (§7.7, BR-CALC-020).                                                                                                                                  |
| 7   | Conventional loan dashboard                                                     | Covered                                                 | FR-OBL-003, FR-RATE-_, FR-CALC-_, FR-SIM-001.                                                                                                                                                                                                                               |
| 8   | Balloon impact (Overview/Timeline/Solution, "Recommended Payment", action plan) | Covered + intentionally changed                         | Covered by SCR-RATE-IMPACT + SCR-EXPLAIN + scenario + bank-questions. **"Recommended Payment" reframed** as "the payment that restores your original trajectory" (recommendation boundary, PRIN-5/§17.3/DEC-004). 3-section structure + causal chain adopted as enrichment. |
| 9   | Islamic financing dashboard                                                     | Covered                                                 | FR-OBL-004, BR-CALC-020 (contract-aware).                                                                                                                                                                                                                                   |
| 10  | Credit-card dashboard + simulator + smart insights                              | Covered (display) + **promoted (simulator)**            | Payoff simulator Stretch→MVP (FR-SIM-004); "smart insights" = rules-based (DEC-004).                                                                                                                                                                                        |
| 11  | Payments page (type branches)                                                   | Covered + **promoted**                                  | Per-obligation history + branch; **duplicate detection promoted** (FR-PAY-004).                                                                                                                                                                                             |
| 12  | Plan page (loan/Islamic/card)                                                   | Covered + **partly rejected**                           | Loan+card planners covered/promoted; **Islamic early-settlement simulation excluded** (ibra' discretionary, GAP-07).                                                                                                                                                        |
| 13  | Education engine (adaptive)                                                     | Covered                                                 | FR-EDU-*.                                                                                                                                                                                                                                                                   |
| 14  | Notification engine                                                             | Covered (insights) + **promoted (local notifications)** | Insights center covers all rules; **local scheduled reminders promoted** (FR-NTF-001); **push/FCM stays LATER**.                                                                                                                                                            |
| 15  | 6-tab nav + "Explore Financing Options"                                         | Intentionally changed + **rejected**                    | 3 tabs retained (DEC-002); Notifications = header icon+center. **"Explore Financing Options" rejected** — violates "does not recommend products/lenders" non-goal (§5.3, DEC-005).                                                                                          |
| 16  | Splash→Auth→Consent→Retrieve→Classify→Dashboard flow                            | Covered + **promoted**                                  | Buildable end-to-end as a real secondary path; demo mode stays primary on stage.                                                                                                                                                                                            |

### 7.2 Classification of SRC-4 (Wadeh) items

| SRC-4 item                                                | Class                 | Disposition                                                                                                    |
| --------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Brand "Wadeh / واضح"                                      | **Rejected**          | Name superseded by Eltizamati (SRC-1 authoritative). Recorded as an observation; no product change.            |
| Single-loan, manual, offline-first, no-account-to-start   | Covered / validates   | Confirms local-first + manual + demo (ADR-0012/0013).                                                          |
| 4 tabs (Home/Pay/Rates/Plan)                              | Intentionally changed | 3 tabs; Rates & Pay contextual (DEC-002).                                                                      |
| **"Two numbers" hero** (bank says vs you'll actually pay) | **Missing → adopt**   | Adopt as hero of loan-detail / residual-impact (official balance vs projected true cost — provenance-perfect). |
| Surprise-gap **threshold slider** + **reminder day**      | **Promoted**          | Fold into settings + local notifications; user-defined threshold insight (§18.1).                              |
| Cumulative "accumulated extra interest" total             | Covered + enrich      | Adopt cumulative-extra display on the rate timeline.                                                           |

### 7.3 What did NOT change (guardrail check)

Confirmed unchanged by this delta-audit: ADR-0001 (Expo/TS), ADR-0007 (engine isolation), ADR-0008 (obligation subtypes), ADR-0009 (provider abstraction), ADR-0010 (i18n/RTL), ADR-0014 (error taxonomy), the domain model, and the honesty/provenance rules. The demo remains **airplane-mode-safe on local/demo data**; the backend is a real but _secondary_ capability off the critical demo path.
