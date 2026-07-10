# Content & Terminology Rules

**Purpose:** binding rules for all user-facing copy (both languages). These rules implement PRIN-3/4/5/7 and BR-TERM-001/002. Content reviewers (non-developer teammates) validate against this file — it is written to be checkable without reading code.

## 1. Terminology maps by obligation kind

The i18n layer selects a **terminology namespace** per obligation `kind`. Components request semantic keys (`obligation.costLabel`); the namespace resolves the correct word. String replacement in components is forbidden.

| Semantic key | `conventionalLoan`                   | `murabaha`                                              | `ijara` (P1)                       | `diminishingMusharakah` (P1)         | `creditCard`                            |
| ------------ | ------------------------------------ | ------------------------------------------------------- | ---------------------------------- | ------------------------------------ | --------------------------------------- |
| product noun | loan / قرض                           | financing / تمويل                                       | lease financing / تمويل إجارة      | partnership financing / تمويل مشاركة | card / بطاقة                            |
| cost noun    | interest / فائدة (TERM-003)          | profit / ربح (TERM-021)                                 | rental / أجرة                      | rental + share purchase              | finance charges / رسوم تمويل (TERM-018) |
| rate label   | interest rate / سعر الفائدة          | profit rate (disclosed) / نسبة الربح                    | rental rate / نسبة الأجرة          | rental rate                          | APR / معدل النسبة الفعلي                |
| owed amount  | outstanding balance / الرصيد المتبقي | outstanding financing / مبلغ التمويل المتبقي (TERM-020) | remaining rentals + transfer terms | bank's remaining share               | current balance / الرصيد الحالي         |
| early exit   | early repayment / سداد مبكر          | early settlement / تسوية مبكرة (TERM-024)               | early settlement                   | early settlement                     | pay in full / سداد كامل                 |

**Hard rule (BR-TERM-001):** Islamic kinds must never render `interest`, `فائدة`, or rate-recalculation UI. Enforcement: i18n namespaces + review checklist + a unit test asserting the Murabaha detail render tree contains no `interest`-keyed strings.

## 2. Recommendation boundary (verbatim patterns)

Allowed: "At this amount, the model estimates…" · "You may want to ask your bank whether…" · "Confirm that additional payments reduce principal." · "Based on the data available, the projection is…"
Forbidden: "You should definitely…" · "The bank must…" · "This guarantees…" · "This is the optimal decision." · Any sentence presenting an estimate without estimate framing.

## 3. Tone rules

| Rule                   | Do                                                                            | Don't                                     |
| ---------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| No shame (PRIN-3)      | "1 payment needs attention"                                                   | "You missed your payment!"                |
| Calm severity (PRIN-4) | Amber "attention" banner with action                                          | Full red screens, warning sirens, ⚠️ spam |
| Control framing        | "Here's what would restore your trajectory"                                   | "Your debt is growing out of control"     |
| Explain triggers       | "You're seeing this because your rate changed on 12 Mar"                      | Unexplained alerts                        |
| Plain language         | "the amount you borrowed" first mention, term after                           | Jargon-first                              |
| Honest limitation      | "We can't calculate this precisely because the payment allocation is unknown" | Silent precision                          |

## 4. Arabic content rules

- Arabic is authored, not translated (NFR-L10N-004); English and Arabic are written together per key at authoring time.
- Register: modern standard Arabic, warm-neutral; Jordanian-market terms for banking vocabulary (validate in RES-009).
- Financial figures use Western Arabic numerals (design-system §3) with Arabic labels; currency as `د.أ` postfix (confirm preferred JOD abbreviation in RES-009).
- Dates: Gregorian calendar (Jordanian banking standard), Arabic month names in AR locale.
- Plurals: use ICU plural rules — Arabic has 6 plural forms; never concatenate counts ("3 التزامات" must come from ICU, not string-building).
- Text length: Arabic labels may exceed English by ~30%; components must tolerate (NFR-L10N-005).

## 5. Legal/disclaimer copy rules (drafts pending RES-003)

- The disclaimer appears: onboarding (full), every SCR-EXPLAIN footer (one line: "Estimates — not financial advice or official bank figures"), scenario results (one line).
- Never: "advice", "recommendation" (as noun for our output), "guaranteed", "official" (for our derived numbers).
- Demo mode: "Demonstration data — not real accounts" persistent banner text.

## 6. Insight copy templates (MVP rules engine)

| Insight                              | Template (EN; AR authored equivalently)                                                                              | Severity  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------- |
| RATE_INCREASED                       | "Your {rate label} on {nickname} increased from {old}% to {new}% on {date}."                                         | info      |
| INSTALLMENT_UNCHANGED_AFTER_INCREASE | "Your installment didn't change after the rate increase — less of each payment now reduces your {owed-amount term}." | attention |
| RESIDUAL_RISK                        | "At the current pace, ≈ {amount} may remain at maturity ({date}). See what's driving this."                          | attention |
| PAYMENT_DUE_SOON                     | "{amount} for {nickname} is due {relative date}."                                                                    | info      |
| PAYMENT_OVERDUE                      | "The {date} payment for {nickname} appears unpaid. If you've paid, log it."                                          | attention |
| UTILIZATION_HIGH                     | "Your {nickname} is at {pct}% of its limit."                                                                         | attention |
| COMPLETED                            | "You've completed {nickname} — fully repaid. 🎉"                                                                     | positive  |

Every template ends with an implicit deep-link action; "why" line auto-generated from trigger inputs (FR-INS-003).

## 7. Education content format

`content/education/<locale>/<term-id>.md` with frontmatter: `termId, title, category, version, reviewedBy, relatedTerms[]`. Body: definition (2 sentences) → JOD example → contract-specific caveats → "ask your bank" items where relevant. Content PRs require a non-developer reviewer (finance/product teammate) — this is the validation workflow SRC-1 §33.2 asks for.
