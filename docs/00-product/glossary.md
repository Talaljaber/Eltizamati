# Glossary (Bilingual, Term-ID Keyed)

**Purpose:** single source of truth for domain vocabulary. Every term has a stable `TERM-` id used by: education content keys, UI labels, code identifiers, and translation files. Code must use the English *code name*; UI must use the localized label via i18n key `glossary.<term-id>`.

**Arabic entries are drafts** — final Arabic product language requires native-speaker review (RES-009). Do not treat these as approved copy.

| ID | Code name | English | Arabic (draft) | Definition (plain language) | Notes |
|----|-----------|---------|----------------|------------------------------|-------|
| TERM-001 | `obligation` | Obligation | التزام | Any financial commitment you must repay: a loan, financing, or credit card. | Umbrella term; product name derives from it |
| TERM-002 | `principal` | Principal | أصل المبلغ | The amount you borrowed, excluding interest/profit. | Conventional products only; see TERM-020 for Islamic |
| TERM-003 | `interest` | Interest | فائدة | The cost the bank charges for lending, usually a yearly percentage. | **Never** used for Islamic products (BR-TERM-001) |
| TERM-004 | `interestRate` | Interest rate | سعر الفائدة | The yearly percentage that determines interest. | |
| TERM-005 | `installment` | Installment | قسط | The regular payment you make, usually monthly. | |
| TERM-006 | `outstandingBalance` | Outstanding balance | الرصيد المتبقي | What you still owe right now. | Provenance-labeled always |
| TERM-007 | `maturityDate` | Maturity date | تاريخ الاستحقاق النهائي | The date the obligation is scheduled to be fully repaid. | |
| TERM-008 | `variableRate` | Variable rate | سعر فائدة متغير | A rate the bank can change during the loan, usually following a reference rate. | |
| TERM-009 | `fixedRate` | Fixed rate | سعر فائدة ثابت | A rate that stays the same for the agreed period. | |
| TERM-010 | `amortization` | Amortization | جدول السداد | How each payment splits between principal and interest over time. | |
| TERM-011 | `residualBalance` | Residual balance | رصيد متبقٍ عند الاستحقاق | Money still owed at maturity when payments didn't fully repay the loan. | Preferred over "balloon" in user-facing copy |
| TERM-012 | `balloonPayment` | Balloon payment | دفعة نهائية كبيرة | A large final payment, either by contract design or caused by under-repayment. | |
| TERM-013 | `earlyRepayment` | Early repayment | سداد مبكر | Paying part or all of the obligation before schedule. | Islamic: "early settlement" (TERM-024) |
| TERM-014 | `gracePeriod` | Grace period | فترة سماح | Days you can pay a card statement in full without finance charges. | Card context |
| TERM-015 | `minimumPayment` | Minimum payment | الحد الأدنى للدفع | The smallest card payment that keeps the account current — not the amount that pays it off. | Definition deliberately carries the warning |
| TERM-016 | `utilization` | Utilization | نسبة استخدام البطاقة | Card balance as a share of the credit limit. | |
| TERM-017 | `statementBalance` | Statement balance | رصيد كشف الحساب | What you owed on the statement date. | vs. current balance |
| TERM-018 | `financeCharges` | Finance charges | رسوم التمويل | Interest and fees a card adds when you don't pay in full. | |
| TERM-019 | `murabaha` | Murabaha | مرابحة | The bank buys the item and sells it to you at a disclosed markup, paid in installments. Total price is fixed at contract. | Fixed total → safe progress display |
| TERM-020 | `financingAmount` | Outstanding financing | مبلغ التمويل المتبقي | What remains of the total sale price you owe in Murabaha (or financing generally). | Islamic replacement for TERM-002/006 in copy |
| TERM-021 | `profitRate` | Profit rate | نسبة الربح | The disclosed markup rate used in Islamic financing. | Replaces TERM-004 in copy |
| TERM-022 | `ijara` | Ijara | إجارة | Lease-based financing: you pay rent for use of an asset the bank owns, often ending in ownership transfer. | Read-only in MVP |
| TERM-023 | `diminishingMusharakah` | Diminishing Musharakah | مشاركة متناقصة | You and the bank co-own the asset; you buy the bank's share over time and pay rent on what it still owns. | Read-only in MVP |
| TERM-024 | `earlySettlement` | Early settlement | تسوية مبكرة | Settling Islamic financing before term; any rebate (ibra') is at the bank's discretion. | Never simulated in MVP (BR-CALC-020) |
| TERM-025 | `ibra` | Ibra' (rebate) | إبراء | A discount an Islamic bank may voluntarily grant on early settlement. | Education content only |
| TERM-026 | `provenance` | Data source | مصدر البيانات | Where a number came from: your bank, the credit bureau, your entry, or our estimate. | Rendered as badge |
| TERM-027 | `estimate` | Estimate | قيمة تقديرية | A value we calculated from available data — not an official bank figure. | Rendered with "≈" |
| TERM-028 | `officialValue` | Official figure | قيمة رسمية | A value that came directly from your bank or lender. | |
| TERM-029 | `repricing` | Rate repricing | إعادة تسعير الفائدة | The bank updating a variable rate, usually when a reference rate moves. | |
| TERM-030 | `delinquency` | Missed payment status | تأخر في السداد | The state of being behind on a scheduled payment. | Copy avoids "delinquent" as a user label (PRIN-3) |
| TERM-031 | `dayCount` | Day-count convention | طريقة احتساب الأيام | The rule for counting days when computing interest (e.g. 30/360, actual/365). | Education/advanced |
| TERM-032 | `apr` | Effective annual rate | معدل النسبة المئوية الفعلي | The true yearly cost including compounding (and fees, where stated). | |

## Usage rules

- **BR-TERM-001:** Islamic obligations must never render conventional terms (interest, interest rate, loan) — the terminology map in `docs/02-ux/content-terminology.md` is applied by obligation `kind` at the i18n layer, not by string replacement in components.
- **BR-TERM-002:** new domain vocabulary requires a glossary entry *before* the code identifier is created (enforced in code review).
- Education content files reference `TERM-` ids; definitions live here once, are rendered contextually everywhere.
