# Vision, Problem, Goals, and Principles

**Source of truth:** distilled from `ELTIZAMATI_MASTER_BRIEF.md` (SRC-1) after audit. Where this file and SRC-1 differ, the difference is a recorded decision (see `docs/00-audit/01-critique-and-recommendations.md`).

---

## 1. One-Sentence Product

**Eltizamati gives borrowers one clear, understandable view of all their financial obligations, explains what changed and why, and helps them explore the impact of repayment choices before future costs become surprises.**

## 2. Problem Statement

Borrowers in Jordan (and MENA broadly) experience **financial obligation opacity**:

- Obligations are fragmented across banks, Islamic financiers, and card issuers; each app shows only its own products.
- Statements state figures without explaining long-term impact.
- Variable-rate repricing can silently reduce principal repayment when the installment stays constant, producing a residual ("balloon") balance at maturity the borrower never planned for.
- Credit-card minimum payments create multi-year payoff horizons that are never framed as such.
- Conventional and Islamic products use different contracts and vocabulary, so generic explanations mislead.

The product's job is not "loan tracking." It is **making obligation state, change, and trajectory legible** — with honest boundaries between official figures and estimates.

## 3. Vision & Mission

- **Vision:** every borrower understands their commitments well enough to act on time.
- **Mission:** turn fragmented, hard-to-interpret obligation data into a calm, unified, explainable financial picture.
- **The 10-second test:** an active user opening the app answers, without navigation: _What do I owe? What's due next? What changed? Am I on track?_

## 4. Goals

### Primary (product)

1. Unified obligations view across institutions and product types.
2. Plain-language explanation of every material number (label, source, freshness, definition, derivation).
3. Early surfacing of material changes and future risks (rate changes, residual-balance risk, insufficient payments).
4. Transparent, reproducible, versioned calculations.
5. Scenario exploration clearly framed as estimation, never advice or guarantee.
6. Contract-correct handling of conventional and Islamic products.
7. Trust through privacy, provenance, and calm communication.

### Primary (engineering)

8. An architecture that evolves from hackathon prototype to production **without rewrite**: production-shaped boundaries, hackathon-sized implementations.

### Non-goals (initial product)

Approving credit, regulated advice, negotiating with banks, modifying schedules, moving money, replacing official statements, guaranteeing outcomes, recommending "best" lenders, or general budgeting/expense management.

## 5. Strategic Positioning

|                     | Bank app               | Eltizamati                                             |
| ------------------- | ---------------------- | ------------------------------------------------------ |
| Coverage            | Own products only      | All institutions                                       |
| Incentive           | Sell products          | Explain obligations                                    |
| Rate-change framing | Notice buried in terms | Timeline + cost impact + scenario                      |
| Estimates           | None (only official)   | Clearly-labeled estimates _alongside_ official figures |
| Authority claimed   | Contractual            | None — "questions to ask your bank"                    |

The moat candidate is **trustworthy explanation**, not data aggregation (aggregation commoditizes once Open Banking matures; explanation quality and Arabic-first content do not).

## 6. Product Principles (binding on all design and code)

| #       | Principle                                                                                               | Enforcement hook                                                              |
| ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| PRIN-1  | Clarity before complexity — conclusion first, inspectable derivation after                              | Screen specs: every derived figure links to explanation view                  |
| PRIN-2  | Explain every material number — label, source, updated-at, definition, derivation, official-vs-estimate | `Provenance` value object; design-system `Amount` component requires it       |
| PRIN-3  | Never shame the user                                                                                    | Content rules in `content-terminology.md`; review checklist item              |
| PRIN-4  | Calm but honest — risk shown, framed around control                                                     | Insight severity → visual mapping caps at "attention", no panic red           |
| PRIN-5  | Education, not false authority                                                                          | Copy patterns whitelist/blacklist (§17.3 of SRC-1) enforced in content review |
| PRIN-6  | Financial logic is domain logic                                                                         | `finance-engine` package; lint forbids arithmetic on money in UI              |
| PRIN-7  | Product-type accuracy — contract-aware Islamic support or deliberate limitation                         | Obligation `kind` gates which calculations may run (BR-CALC-020)              |
| PRIN-8  | Privacy by design — minimal collection, understandable consent                                          | Data classification + minimization rules, docs/06                             |
| PRIN-9  | Mobile simplicity — one dominant purpose, one primary CTA per screen                                    | Screen spec template field "primary action"                                   |
| PRIN-10 | Architecture resists AI-generated entropy                                                               | `AI_AGENT_RULES.md`, CI gates, dependency-direction lint                      |

## 7. Success Metrics

**Hackathon:** judges grasp the problem <1 min; demo completes offline-reliably; the rate-change→impact flow is the memorable beat; every calculation is defensible on questioning; mock data honestly labeled; codebase demonstrably professional; development can continue after the event.

**Product (post-hackathon candidates):** activation = first obligation added; time-to-first-clarity; obligations per active user; scenario-planner usage; sync success rate; retention around statement cycles; trust/clarity survey score. (Instrumentation deferred — see observability plan.)
