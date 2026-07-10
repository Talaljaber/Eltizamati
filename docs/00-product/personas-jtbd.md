# Personas & Jobs-to-be-Done

**Basis:** SRC-1 §6, refined. These are _assumption-backed archetypes_ (ASM-001), not researched personas — validation tasks are listed at the end.

---

## PER-1 — Omar, the Multi-Obligation Professional (primary)

- 34, engineer in Amman. Salary-banked at Bank A; car financing (Murabaha) at Islamic Bank B; personal loan (variable rate) at Bank C; one credit card.
- Pays everything on time via standing orders; could not state his total outstanding balance within 5,000 JOD.
- Received an SMS 14 months ago that his loan rate changed; his installment did not change; he assumed that meant "no impact."

**Jobs-to-be-done**

| ID       | When…                         | I want to…                                                                     | So that…                               |
| -------- | ----------------------------- | ------------------------------------------------------------------------------ | -------------------------------------- |
| JTBD-1.1 | I think about my finances     | see every obligation, total balance, and total monthly commitment in one place | I stop holding a fuzzy mental model    |
| JTBD-1.2 | a rate or installment changes | understand what it costs me over the remaining term                            | I can react before maturity, not at it |
| JTBD-1.3 | I have spare cash             | see what an extra payment actually does                                        | I can decide whether it's worth it     |
| JTBD-1.4 | I meet my bank                | arrive with the right questions and numbers                                    | the conversation is on my terms        |

**MVP moments that serve Omar:** dashboard totals (SCR-HOME), rate timeline + balloon insight (SCR-OBL-DETAIL, SCR-RATE-HIST), scenario planner (SCR-SIM-LOAN), bank-questions checklist.

## PER-2 — Lina, the First-Time Borrower (secondary)

- 26, first personal loan for a car down payment. Knows her installment; does not know the principal/interest split, what "variable" means for her, or what she'll have paid in total.
- Wants reassurance and explanation without condescension; Arabic-first user.

**Jobs-to-be-done**

| ID       | When…                              | I want to…                                       | So that…                               |
| -------- | ---------------------------------- | ------------------------------------------------ | -------------------------------------- |
| JTBD-2.1 | I look at my loan                  | understand what each part of it means, in Arabic | I feel in control, not lectured        |
| JTBD-2.2 | I pay an installment               | see progress that means something                | staying on track feels rewarding       |
| JTBD-2.3 | I hear "rates changed" in the news | know whether that affects _me_                   | I don't have to guess or call the bank |

**MVP moments that serve Lina:** contextual education (tap any figure → plain-language definition, Arabic-first), progress visualization, fixed-vs-variable badge with explanation.

## PER-3 — Khalil, Islamic-Financing Customer (validating persona)

- 41, deliberately banks Islamic-only: Murabaha auto financing, Ijara home financing.
- Alert to terminology: an app that says "interest rate" about his Murabaha loses him instantly.

**Jobs-to-be-done**

| ID       | When…                       | I want to…                                                                     | So that…                                |
| -------- | --------------------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| JTBD-3.1 | I add my financing          | see it described in contract-correct terms (profit, financing amount, rental)  | I trust the app understands my products |
| JTBD-3.2 | I consider early settlement | understand what is and isn't knowable in advance (ibra' is bank-discretionary) | I ask the bank the right question       |

**MVP moments that serve Khalil:** Murabaha detail view with correct terminology and _honest limitation labels_ ("early-settlement rebate is set by your bank — ask about it"), Islamic education content. Khalil is the persona that most tests PRIN-7; getting him wrong is worse than excluding him.

## Future segments (out of MVP, kept in domain design)

Credit-card-heavy users (payoff simulator, stretch); households; self-employed irregular-income borrowers; near-maturity residual-risk users; advisers/white-label (both require regulated models — far future).

## Persona validation backlog

- [ ] RES-007: 3–5 interviews matching PER-1 profile (teammates' network) — confirm JTBD-1.2 resonance and current coping mechanisms (spreadsheets? nothing?).
- [ ] RES-008: 2 interviews matching PER-3 — validate terminology map in `content-terminology.md` with real Islamic-banking customers, not just documentation.
- [ ] RES-006: collect 2–3 anonymized real statements (conventional + Murabaha + card) to validate manual-entry field list.
