// Assumption text is shared by formula outcomes and registry metadata. Keeping
// it in a dependency-free module avoids a registry <-> formula import cycle.
const GENERIC_LOAN_ASSUMPTIONS = [
  'ASM-008: monthly payment frequency assumed',
  'ASM-008: payment in arrears assumed',
  'ASM-008: periodic rate = nominal annual rate / 12',
  'ASM-009: HALF_UP rounding at 3 dp for JOD payments',
] as const

export const FORMULA_ASSUMPTIONS = {
  amortization: [...GENERIC_LOAN_ASSUMPTIONS],
  variableProjection: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'Rate change effective from the first full period after the effective date',
    'Installment amount does not change unless explicitly recorded',
  ],
  residualDetection: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'Residual threshold: max(1% of original principal, 1 × current installment)',
  ],
  allocationEstimate: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'ASM-008: standard amortization split applied retroactively',
  ],
  murabahaProgress: [
    'ASM-010: total sale price is fixed at contract signing',
    'No rate-change calculations apply (BR-CALC-020)',
  ],
  extraPaymentScenario: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'Extra payments reduce principal immediately in full',
    'No prepayment penalties modeled (user must ask bank — SCR-BANK-QUESTIONS)',
  ],
  rateChangeScenario: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'Hypothetical rate change is not saved to the loan or rate history',
    'Projected total still payable equals future scheduled payments after as-of date plus projected residual',
    'Installment amount remains unchanged in this scenario',
  ],
  addedCostFromRepricing: [
    ...GENERIC_LOAN_ASSUMPTIONS,
    'Compares the actual rate history against a counterfactual holding the original rate constant for the full term',
    'Installment amount unchanged in both the actual and counterfactual projections',
    'Reported at estimate/medium confidence — TV-305 exact figure is PENDING-FINANCE (calculation-test-vectors.md)',
  ],
  cardPayoff: [
    'ASM-011: monthly close interest = balance × APR/12 (daily accrual is more accurate; potential divergence ~10-15% for long horizons)',
    'Statement balance treated as starting balance',
  ],
  aggregates: [
    'Mixed-source aggregates labeled "includes estimates" (BR-PROV-004)',
    'Excluded obligations counted and named (BR-PROV-005)',
  ],
} as const
