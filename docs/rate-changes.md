Eltizamati — Jordan Variable-Rate and Benchmark Integration Brief
1. Task objective

Update the current local Eltizamati implementation so it models Jordanian variable-rate conventional loans more accurately.

The changes must support:

the Central Bank of Jordan’s monetary-policy rate;
the actual overnight interbank rate;
bank-specific contractual margins;
introductory fixed-rate periods;
contractual repricing schedules;
unchanged-installment treatment;
term extension or amounts carried to the end;
complete rate history;
customer notifications;
honest separation between contractual facts and Eltizamati estimates.

The remote repository may be stale. Inspect the current local repository and active worktree before making changes.

Do not assume the existing schema, screens, formulas, or dashboard structure from old documentation.

2. Verified facts about Jordan
Fact 1 — The CBJ Main Rate is not directly the customer’s loan rate

The Central Bank of Jordan has a main policy rate and other monetary-policy rates. Its operating framework uses these instruments to steer the overnight interbank lending rate and influence broader banking-market interest rates. The CBJ does not publish one mandatory retail rate that every bank must charge every borrower.

The correct relationship is:

CBJ monetary-policy decision
→ influences overnight interbank market rates
→ contractual loan benchmark may change
→ customer loan reprices only according to its contract

Do not implement:

Customer rate = CBJ Main Rate

unless it is explicitly selected as a clearly labeled hackathon-only assumption.

Fact 2 — Jordanian banks determine their own facility rates

The CBJ states that interest rates on deposits and facilities are determined by banks according to supply, demand, and competition in the local market.

Therefore:

banks do not all offer the same rate;
a CBJ decision does not create a single universal customer rate;
products may have different fixed introductory rates;
products may have different margins;
rates may differ by product, customer, collateral, campaign, and credit policy.
Fact 3 — The recognized variable-rate mechanism is benchmark plus margin

The CBJ’s financial-consumer guidance tells customers to examine the loan’s pricing mechanism, describing it as:

Fixed contractual margin
+
Actual overnight interbank interest rate

The same guidance says the customer must understand the adjustment frequency.

The basic model is therefore:

customerAnnualRate =
  applicableOvernightInterbankRate
  + contractualMargin

That formula may still be affected by:

a fixed introductory period;
a contractual floor;
a contractual cap;
a temporary margin discount;
the benchmark-observation date;
the repricing frequency;
product-specific contractual wording.

Do not assume margin equals zero.

Fact 4 — Margins differ between banks and products

Official Jordanian bank pages demonstrate different margins.

Arab Bank and Housing Bank describe products that become the prevailing interbank rate plus a 2.5% margin after an initial three-year fixed period. INVESTBANK publishes the same interbank-plus-2.5% structure for its first-time apartment product.

Cairo Amman Bank publishes a real-estate product that is fixed for the first year and then becomes interbank plus a 5% margin.

Housing Bank also describes a product where the variable rate is determined on the first day of the second year using the CBJ-announced overnight interbank rate plus a fixed margin written into the borrowing contract.

Therefore, two loans may use the same benchmark while having different customer rates:

Loan A:
5.60% benchmark + 2.50% margin = 8.10%

Loan B:
5.60% benchmark + 5.00% margin = 10.60%

These values are illustrative only. The application must use each loan’s stored contract data.

Fact 5 — Repricing is not necessarily immediate

The CBJ says the relationship is governed by the signed contract. For variable-rate loans, the customer must know the adjustment frequency and its effect on either the monthly installment or the repayment period.

The CBJ’s Arabic consumer FAQ also states that a reduction on a variable-rate loan is applied when the contract’s repricing period becomes due. Fixed-rate loans remain governed by their signed contracts.

Therefore:

Benchmark changes today
≠
Every customer loan changes today

A loan may reprice:

annually;
semiannually;
quarterly;
monthly;
after an introductory fixed period;
on another contractually defined date.

The application must not append a customer rate merely because a new benchmark record was entered.

Fact 6 — The bank must notify the customer

The CBJ says banks notify customers of interest-rate changes and the effect on the installment through the communication method agreed with the customer, such as SMS, email, or written notice.

Eltizamati’s email remains a demo notification, not proof that the institution completed its legal notification obligation.

Fact 7 — The CBJ directed banks to keep individual variable-loan installments fixed

The CBJ published a direction requiring banks to keep monthly installments fixed for individual retail loans granted at a variable interest or return rate. Banks were directed to use an appropriate mechanism, including extending the repayment period or carrying the installment increase to the end of the loan.

Where the increase is carried to the end:

later interest-rate reductions must be reflected against the carried amount;
customers must be informed of the selected mechanism;
customers must be told to contact the bank when they do not want the fixed-installment and term-extension treatment.

Do not reduce this to only one universal behavior.

Support at least:

extendTerm
carryAmountToEnd
unknownContractTreatment

The existing unchanged-installment projection can support the economic effect, but the contractual servicing treatment must remain separate.

Fact 8 — “Balloon payment” has a specific consumer meaning in the CBJ FAQ

The CBJ’s Arabic consumer FAQ describes a balloon payment as an accumulated amount at the end of the loan resulting from installment deferral, installment fixing, or an interest-rate increase.

Eltizamati should nevertheless preserve three separate concepts:

contractualBalloon

A large final amount explicitly contained in the original signed contract.

projectedResidualAtOriginalMaturity

An Eltizamati estimate produced by projecting the unchanged installment under new rates.

confirmedCarriedAmountAtEnd

An amount the institution has confirmed it will carry to the end under its servicing mechanism.

Never silently copy one into another.