# Functional Requirements

**ID scheme:** `FR-<AREA>-###`. Areas: ONB onboarding, OBL obligations, PAY payments, RATE rates, CALC calculation, SIM simulation, INS insights, EDU education, SET settings, DATA data sources/providers, AUTH auth, NTF notifications.
**Scope update 2026-07-10 (ADR-0016 / SRC-3 delta-audit):** the three-week timeline promoted auth, consent, biometric lock, local notifications, the card payoff simulator, and duplicate detection into **MVP**. AUTH/NTF are no longer "post-MVP" as an area. The **scripted demo still runs in demo mode** (auth is a real secondary capability — mvp-scope §5a).
**Scope column:** `MVP` (hackathon build), `S` (hackathon stretch), `P1` (first post-hackathon phase), `LATER`.
Acceptance criteria live with user stories (`user-stories.md`) and screen specs (`docs/02-ux/screen-inventory.md`); this file is the requirement inventory and traceability root.

## Onboarding & app shell

| ID         | Requirement                                                                                                                                                                                         | Scope |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-ONB-001 | First launch offers language selection (Arabic/English) before any content; choice is persisted and changeable later.                                                                               | MVP   |
| FR-ONB-002 | ≤3-screen onboarding communicating: unified view / understand changes / plan ahead. Skippable.                                                                                                      | MVP   |
| FR-ONB-003 | User must acknowledge a financial-information disclaimer and privacy notice (locally recorded with version + timestamp) before seeing data.                                                         | MVP   |
| FR-ONB-004 | User chooses a data path: **Demo data** (seeded), **Manual entry**, or **Connect a source** (consent-gated flow against a **labeled-mock** CRIF/Open-Banking provider — never implies live access). | MVP   |
| FR-ONB-006 | Onboarding offers an optional account step (sign up / sign in / continue in demo). Demo path never requires an account; auth is skippable and reversible.                                           | MVP   |
| FR-ONB-005 | Demo mode is visibly indicated at all times (persistent banner/badge).                                                                                                                              | MVP   |

## Obligations

| ID         | Requirement                                                                                                                                                     | Scope |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-OBL-001 | Dashboard shows: total outstanding, total monthly commitment, next payment (amount/date/obligation), overall status, obligation cards, recent material changes. | MVP   |
| FR-OBL-002 | Obligation card shows: nickname, institution, type, remaining balance (+provenance badge), next due amount/date, progress, status.                              | MVP   |
| FR-OBL-003 | Conventional loan detail shows all fields of SRC-1 §13.1 that exist for the record; missing fields render as explicit "unknown", never as 0.                    | MVP   |
| FR-OBL-004 | Murabaha detail renders contract-correct terminology (BR-TERM-001), fixed total sale price, paid/remaining, progress; no rate-recalculation UI.                 | MVP   |
| FR-OBL-005 | Credit-card detail shows: limit, current balance, available credit, utilization, statement balance, minimum payment, due date, rates and fees where known.      | MVP   |
| FR-OBL-006 | User can add an obligation manually (type-specific form; loan, Murabaha, card in MVP).                                                                          | MVP   |
| FR-OBL-007 | User can edit obligation fields and nickname; edits are provenance-recorded as user-entered.                                                                    | MVP   |
| FR-OBL-008 | User can archive/delete an obligation (with confirmation; deletion is real, not soft-hide, for local data).                                                     | MVP   |
| FR-OBL-009 | Unsupported/other facility types render as generic read-only obligations (balance, institution, notes) with a "limited support" label.                          | P1    |
| FR-OBL-010 | Ijara and Diminishing Musharakah render as read-only with contract-specific terminology and limitation notes.                                                   | P1    |

## Payments

| ID         | Requirement                                                                                                        | Scope |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| FR-PAY-001 | Obligation detail shows payment history (date, amount, principal/interest or profit split when known, provenance). | MVP   |
| FR-PAY-002 | User can log a payment against an obligation (date, amount, optional allocation).                                  | MVP   |
| FR-PAY-003 | Logging a payment updates progress, remaining balance (estimate), and status derivation.                           | MVP   |
| FR-PAY-004 | Duplicate-payment detection warns when a logged payment matches an existing one (same obligation, date, amount).   | MVP   |
| FR-PAY-005 | Unknown allocation is handled per BR-CALC-010 (estimated split, labeled).                                          | MVP   |

## Rates

| ID          | Requirement                                                                                                                                                                                         | Scope |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-RATE-001 | Obligation detail shows rate history as a timeline (value, effective date, source).                                                                                                                 | MVP   |
| FR-RATE-002 | User can log a rate change (new rate, effective date); validation rejects overlapping/duplicate effective dates.                                                                                    | MVP   |
| FR-RATE-003 | A logged/imported rate change triggers recalculation of the projection and (if criteria met) a residual-balance insight.                                                                            | MVP   |
| FR-RATE-004 | Rate-change impact view shows: previous rate, new rate, effective date, estimated added total cost, principal-reduction impact, projected residual balance — each labeled estimate with confidence. | MVP   |

## Calculation & explanation

| ID          | Requirement                                                                                                                                                                | Scope |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-CALC-001 | Every derived figure links to an explanation view: inputs used, their provenance, formula (plain language + version id), assumptions/limitations, calculated-at timestamp. | MVP   |
| FR-CALC-002 | Engine computes amortization schedules for fixed and variable-rate loans per `financial-calculation-spec.md`.                                                              | MVP   |
| FR-CALC-003 | Engine projects residual balance at maturity given rate history + actual installment behavior (BR-CALC-012).                                                               | MVP   |
| FR-CALC-004 | Engine refuses precise output and returns a limited-view result when confidence < threshold (BR-CALC-016).                                                                 | MVP   |
| FR-CALC-005 | Calculation runs are persisted with formula version, input snapshot, and result (reproducibility).                                                                         | MVP   |
| FR-CALC-006 | Aggregates (total outstanding, total monthly commitment) computed centrally, never summed in UI.                                                                           | MVP   |

## Simulation

| ID         | Requirement                                                                                                                                                                                                | Scope |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-SIM-001 | Loan scenario planner: extra monthly amount and/or one-time payment (+start date) → new payoff date, months saved, estimated cost saved, projected residual balance, side-by-side with current trajectory. | MVP   |
| FR-SIM-002 | Scenario results carry the same explanation/confidence machinery as any calculation (FR-CALC-001).                                                                                                         | MVP   |
| FR-SIM-003 | Scenario language complies with the recommendation boundary (SRC-1 §17.3): estimation phrasing only.                                                                                                       | MVP   |
| FR-SIM-004 | Card payoff simulator: minimum-only vs fixed amount vs custom → payoff duration, finance charges, total paid, savings vs minimum; warning when payment ≤ monthly finance charge.                           | MVP   |
| FR-SIM-005 | Scenarios are ephemeral by default; user may save a scenario snapshot to the obligation.                                                                                                                   | S     |

## Insights (in-app; the MVP form of "notifications")

| ID         | Requirement                                                                                                                                                                                                                                                                                                       | Scope |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-INS-001 | System generates insights from rules: rate changed, installment unchanged after rate increase, residual-balance risk, payment due soon (≤7 days), payment overdue, financing completed, high card utilization, **user-defined threshold reached** (e.g. surprise-gap crosses a user-set JOD amount — from SRC-4). | MVP   |
| FR-INS-002 | Insights center lists insights with severity (info/attention/urgent... capped visual at "attention" per PRIN-4), read state, and deep link to the relevant screen.                                                                                                                                                | MVP   |
| FR-INS-003 | Every insight explains _why it fired_ in one sentence.                                                                                                                                                                                                                                                            | MVP   |
| FR-INS-004 | Insights deduplicate: same rule + same obligation + same trigger inputs fires once.                                                                                                                                                                                                                               | MVP   |
| FR-NTF-001 | Local scheduled notifications for payment-due reminders (OS notification, content-minimized, permission-gated, respects quiet hours). Reminder day is user-configurable (FR-SET-006).                                                                                                                             | MVP   |
| FR-NTF-002 | Push notification infrastructure (FCM/APNs, server-triggered).                                                                                                                                                                                                                                                    | LATER |

## Education

| ID         | Requirement                                                                                                                    | Scope |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| FR-EDU-001 | Tapping any glossary-labeled term/figure opens its plain-language definition (from `glossary.md` content, bundled, versioned). | MVP   |
| FR-EDU-002 | Learn tab lists education topics by category (conventional / Islamic / cards), Arabic-first content.                           | MVP   |
| FR-EDU-003 | Contextual "questions to ask your bank" checklist attached to rate-change and residual-balance insights.                       | MVP   |
| FR-EDU-004 | Education content is versioned; content updates do not require code changes beyond the content files.                          | MVP   |

## Settings, privacy, data

| ID          | Requirement                                                                                                                                                                                                           | Scope |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| FR-SET-001  | Language switch (AR/EN) at runtime with correct RTL flip (app reload acceptable).                                                                                                                                     | MVP   |
| FR-SET-002  | View acknowledged disclaimer/privacy versions and dates.                                                                                                                                                              | MVP   |
| FR-SET-003  | Erase all local data (destructive, double-confirmed).                                                                                                                                                                 | MVP   |
| FR-SET-004  | Export local data as JSON (share sheet).                                                                                                                                                                              | S     |
| FR-SET-005  | Reset/reload demo data when in demo mode.                                                                                                                                                                             | MVP   |
| FR-SET-006  | Notification preferences: enable/disable payment-due reminders, choose reminder day, set the user-defined gap/threshold value (FR-INS-001).                                                                           | MVP   |
| FR-SET-007  | Account controls when signed in: sign out, view session, biometric app-lock toggle, delete account (server-side erasure + audit, FR-AUTH-003).                                                                        | MVP   |
| FR-DATA-001 | All reads go through the provider abstraction (`DataProvider` contracts); demo and manual providers implement identical contracts.                                                                                    | MVP   |
| FR-DATA-002 | Every stored field carries provenance metadata per BR-PROV-001.                                                                                                                                                       | MVP   |
| FR-DATA-003 | Data-source status screen: which providers are active, last refresh, record counts; mocked sources explicitly labeled "demo/mock".                                                                                    | MVP   |
| FR-AUTH-001 | Supabase email auth: sign-up, email verification, sign-in, session management, sign-out, password reset. Demo mode never requires it.                                                                                 | MVP   |
| FR-AUTH-002 | Versioned consent records (ToS, privacy, disclaimer, per-provider access) — server-backed when signed in, locally recorded in demo mode; re-consent on material change.                                               | MVP   |
| FR-AUTH-003 | Account deletion with server-side erasure workflow + audit event.                                                                                                                                                     | MVP   |
| FR-AUTH-004 | Optional biometric app-lock (local).                                                                                                                                                                                  | MVP   |
| FR-AUTH-005 | Consent-gated provider connect: per-provider consent (CRIF, Open Banking) must be recorded before the connect flow runs; the provider is a **labeled mock** in MVP (identical contract to a real provider, ADR-0009). | MVP   |
| FR-AUTH-006 | All authenticated reads/writes enforced by row-level security (RLS) from the first migration; authorization never depends on the client (§35.8, ADR-0016).                                                            | MVP   |
| FR-AUTH-007 | Phone OTP as an additional verification factor.                                                                                                                                                                       | P1    |

## Traceability

Every `MVP`-scoped FR maps to ≥1 user story (US), ≥1 screen (SCR), applicable business rules (BR), and a delivery milestone (M0–M6) — the matrix lives in `docs/08-delivery/hackathon-plan.md §Traceability`.
