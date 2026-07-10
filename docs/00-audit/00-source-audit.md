# Source Audit — Conflict & Gap Report

**Phase:** 1 (Source Audit)
**Status:** Complete for available sources
**Date:** 2026-07-10
**Auditor:** Lead architecture agent
**Sources audited:**

| ID | Document | Role | Available |
|----|----------|------|-----------|
| SRC-1 | `ELTIZAMATI_MASTER_BRIEF.md` v1.0 | Authoritative product source | ✅ Yes (`docs/99-sources/`) |
| SRC-2 | `FABLE_5_ARCHITECT_PROMPT.md` | Engineering expectations / process contract | ✅ Yes (`docs/99-sources/`) |
| SRC-3 | Existing architecture document (PDF) | Supporting evidence | ❌ **Not supplied** |
| SRC-4 | Existing UI blueprint (HTML) | Supporting evidence | ❌ **Not supplied** |
| SRC-5 | Existing pitch deck | Supporting evidence | ❌ **Not supplied** |

---

## 1. Missing Source Documents (Material Gap)

The task description referenced an existing architecture document, UI blueprint, and pitch deck. **None of these were present in the session uploads or the repository** (the repository was empty at audit time). Consequences:

1. This audit's conflict detection covers SRC-1 vs SRC-2 and *internal* contradictions within SRC-1 only.
2. The knowledge base was built treating SRC-1 as the sole product truth, which is consistent with its declared authority ("Treat mockups and early documents as evidence and inspiration, not unquestionable truth").
3. **Action required (owner: Talal):** supply SRC-3/4/5. Then run the delta-audit checklist below. Until then, any idea that existed only in those documents is *not represented* in this knowledge base.

### Delta-audit checklist for SRC-3/4/5 (when supplied)

- [ ] Screen inventory: diff against `docs/02-ux/screen-inventory.md`; any screen present only in the blueprint is *proposed*, not confirmed.
- [ ] Navigation: diff against the IA decision in `docs/02-ux/information-architecture.md` (this KB recommends 3 tabs, not 4 — see DEC-002).
- [ ] Any financial formula, number, or rate example in the deck: verify against `docs/03-domain/financial-calculation-spec.md`; deck examples are marketing illustrations until validated.
- [ ] Any integration claim (CRIF, Open Banking) shown as "live" in the deck: must be re-labeled per BR-PROV rules (no fake integrations).
- [ ] Any tech-stack statement in the old architecture PDF: superseded by ADR-0001…ADR-0015 unless it raises a new force not considered there — in that case, open a new ADR, do not silently edit existing ones.

---

## 2. Statement Classification

Every material statement in SRC-1 was classified as **Confirmed** (product truth), **Assumed** (stated but unverified), **Proposed** (design suggestion requiring evaluation), or **Unresolved** (explicitly open). Full assumption registry: `docs/00-product/assumptions-validation-backlog.md`.

### 2.1 Confirmed (product truth — carried into requirements)

| Ref | Statement |
|-----|-----------|
| C-01 | Core mission: unified, understandable view of financial obligations; explain changes, costs, progress, future risk (SRC-1 §1, §4). |
| C-02 | Jordan-first, MENA-ready; Arabic + English + RTL from foundation (§0, §24.3, §35.3). |
| C-03 | Not a bank, bureau, adviser, or settlement service; never claims to modify contracts or guarantee outcomes (§1, §5.3, §17.3). |
| C-04 | Official values must be visibly distinguished from estimates; provenance recorded (§1, §7.2, §35.12–13). |
| C-05 | Decimal-safe arithmetic; JOD 3-decimal precision; calculations outside UI; formula versioning; reproducibility (§22, §35.4–5). |
| C-06 | Islamic financing must be contract-aware, not terminology-swapped (§7.7, §14.2, §37.3). |
| C-07 | Provider abstraction with honest labeling of mock/sandbox/real (§9.3, §32.3). |
| C-08 | Solo developer (web background, no mobile experience); AI agents write much of the code; architecture must resist AI entropy (§25, §7.10, §33.1). |
| C-09 | One cross-platform codebase; Android + iOS design; hackathon delivers Android APK (§35.1–2). |
| C-10 | Non-negotiable engineering constraints list (§35) — all 20 items adopted verbatim as NFRs. |
| C-11 | Calm, non-shaming, education-first UX personality (§7.3–7.5, §24.1). |

### 2.2 Assumed (stated as if true, needs validation)

| Ref | Statement | Risk if wrong | Registry ID |
|-----|-----------|---------------|-------------|
| A-01 | Multi-obligation borrowers in Jordan lack a unified view and want one (§3, §6.1). | Product premise; hackathon pitch weakens | ASM-001 |
| A-02 | Variable-rate + unchanged-installment → residual balloon is a real, common pattern in Jordanian retail lending. | The headline demo story collapses | ASM-002 |
| A-03 | CRIF and Open Banking data would contain the fields listed in §9.1–9.2. | Provider contracts need rework | ASM-003 |
| A-04 | Users will manually enter obligation data with enough accuracy to compute anything useful. | Manual-entry path produces garbage-in | ASM-004 |
| A-05 | JOD amounts displayed at 3 decimals is what users expect (vs. rounded JOD). | Presentation-layer decision only | ASM-005 |
| A-06 | Judges reward architectural quality, not only demo flash (§38.1). | Effort allocation | ASM-006 |

### 2.3 Proposed (design suggestions this KB evaluated rather than copied)

| Ref | Proposal in SRC-1 | Disposition | Where decided |
|-----|-------------------|-------------|---------------|
| P-01 | 4-tab navigation: Home / Obligations / Plan / Learn (§11) | **Modified** → 3 tabs; Plan is contextual to an obligation | DEC-002, `information-architecture.md` |
| P-02 | Data source priority policy (§9.4) | **Adopted & formalized** | BR-PROV-001 |
| P-03 | 8 initial obligation types (§8.1) | **Adopted as domain model; narrowed for MVP** to 3 (variable-rate personal loan, Murabaha, credit card) | `mvp-scope.md`, ADR-0008 |
| P-04 | Auth capabilities list incl. passkeys, OTP, biometrics (§20.1) | **Deferred**; MVP is local demo-mode with explicit boundary; Supabase email auth is post-hackathon phase 1 | DEC-001, ADR-0012 |
| P-05 | Notification categories (§18) | **Narrowed** → in-app insights center in MVP; push infra post-hackathon | DEC-003 |
| P-06 | Education engine with remote content management (§32.4) | **Narrowed** → versioned static content bundled in-app | `mvp-scope.md` |
| P-07 | Status model list (§23) | **Adopted & formalized** as a derived state machine | BR-STAT-001, `domain-model.md` |
| P-08 | OCR statement import (§32.4 stretch) | **Cut from all near-term scope** (privacy + effort vs. value) | `mvp-scope.md` §Not-Build |

### 2.4 Unresolved (SRC-1 §36 open questions → decision/research backlog)

All 18 open questions in §36 were converted into tracked items — none were silently answered. See `docs/00-product/assumptions-validation-backlog.md` (ASM-/RES- items) and `docs/08-delivery/decision-memo.md` (DEC- items needing humans). The three that most affect the hackathon build: judging criteria (RES-001), CRIF/Open-Banking sandbox availability (RES-002), demo-mode vs. auth for judging (DEC-001).

---

## 3. Contradictions & Internal Tensions Found

| ID | Conflict | Resolution in this KB |
|----|----------|----------------------|
| CON-01 | §32.1 lists under **"Must Demonstrate"**: "Credit-card view or second obligation type *if time permits*" — a must-have qualified as optional. | Reclassified: second obligation type (Murabaha, read-only) is **Must** because it proves the extensible domain model cheaply; the credit-card *simulator* is **Stretch**. See `mvp-scope.md`. |
| CON-02 | §11 recommends a global **Plan** tab; §7.9 demands one dominant purpose per screen and §37.1 demands a sharp MVP. A global Plan tab requires an obligation picker and duplicates the per-obligation scenario entry point. | Plan removed as a tab for MVP; simulator is reached from obligation detail. Re-evaluate with usage data post-MVP. DEC-002. |
| CON-03 | §20 specifies a full auth/consent lifecycle; §36 asks whether auth is even wanted for judging; §32.2 lists auth as only "should". | MVP: local demo mode with explicit boundary + local consent acknowledgment. Full auth/consent lifecycle is specified in docs (so nothing is lost) but implemented post-hackathon. DEC-001. |
| CON-04 | §5.1 goal 8 ("evolve from prototype to production without complete rewrite") vs. §37.4 (avoid enterprise complexity at a hackathon). Not a true contradiction but an unpriced tension. | Resolved by architecture choice: production-shaped *boundaries* (packages, provider contracts, schema) with hackathon-sized *implementations* (local-only data, no push infra, no real providers). See ADR-0002, ADR-0013. |
| CON-05 | §8.2 lists ~15 "core modules" while §32 MVP realistically funds ~6. "Core" is ambiguous between product-vision core and MVP core. | Modules re-labeled: vision-scope vs MVP-scope columns in `mvp-scope.md`. |
| CON-06 | §22.1 mandates JOD 3-decimal presentation "normally", §24.2 mandates "no fake precision". Estimates displayed at 3 decimals *are* fake precision. | Presentation rule BR-CALC-014: official values render at 3 dp; estimates render rounded to whole JOD (or 1 dp) with a "≈" prefix and confidence label; exact estimate values available in the calculation explanation view. |
| CON-07 | §9.1 CRIF data listed as providing "outstanding balance… payment performance" while §16.2/§22.3 acknowledge bureau data may be stale/incomplete. The dashboard cannot treat bureau values as live. | Provenance model gives bureau data its own freshness class; it can never be labeled "official current balance", only "as reported on {date}". BR-PROV-003. |
| CON-08 | SRC-2 non-negotiable #12 "Enforce authorization server-side" vs. the recommended local-first MVP (no server in the demo path). | Not weakened: the constraint binds any server-backed deployment. The MVP has no server surface to authorize; the Supabase schema ships with RLS designed-in from the first migration (never retrofitted). Documented in ADR-0002 and `security-controls.md`. |
| CON-09 | §31.5 golden/snapshot tests "if supported by the chosen stack" — chosen stack (React Native) has weaker golden-test culture than Flutter. | Replaced with RNTL render-assertion tests + Maestro screenshots for key screens; recorded as a conscious trade-off in ADR-0011. |

---

## 4. Gaps (information required but absent from all sources)

| ID | Gap | Impact | Handling |
|----|-----|--------|----------|
| GAP-01 | No Jordanian bank conventions: day count, compounding, repricing frequency, rounding used by local lenders. | Engine outputs cannot be claimed to match bank schedules. | Engine uses documented generic conventions; every output labeled estimate; validation task RES-004 for finance teammates. |
| GAP-02 | No hackathon logistics: date, duration, judging criteria, submission format. | Cannot final-size MVP. | MVP sized conservatively; RES-001. |
| GAP-03 | No brand identity, palette, typography, name lockup (Arabic wordmark). | Design tokens are placeholders. | Neutral "calm clarity" token set defined; swap-ready. RES-005. |
| GAP-04 | No sample statements/contracts from Jordanian banks or Islamic banks. | Manual-entry field design is assumption-driven. | Fields marked ASM-004; teammate task to collect 2–3 anonymized statements. RES-006. |
| GAP-05 | No legal review of Jordan PDPL (Law 24/2023) obligations, disclaimers wording, or CBJ boundaries for financial information services. | Consent text and disclaimers are drafts. | Flagged legal-validation items; nothing in-app claims advice. RES-003. |
| GAP-06 | No target device/OS floor. | Build config ambiguity. | Assumed Android 8.0+/iOS 15.5+ (current Expo SDK defaults) — ASM-007. |
| GAP-07 | Early settlement rules for Islamic contracts (ibra'/rebate policies) are institution-specific and undocumented. | Cannot simulate Islamic early settlement honestly. | Islamic simulation excluded from MVP; read-only + education instead. BR-CALC-020. |
| GAP-08 | SRC-3/4/5 absent entirely (see §1). | Unknown unknowns from prior exploration. | Delta-audit checklist above. |

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
