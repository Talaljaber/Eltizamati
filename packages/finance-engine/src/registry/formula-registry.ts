/**
 * Formula registry — maps FormulaId → metadata.
 * All formulas are registered here. If a formula id doesn't appear here,
 * the engine cannot use it (prevents ad-hoc formula creation in features).
 */
import type { FormulaId, FormulaMetadata } from './types.js'

// ASM-008: monthly payment, payment-in-arrears, nominal-annual/12 are the generic conventions
const GENERIC_LOAN_ASSUMPTIONS = [
  'ASM-008: monthly payment frequency assumed',
  'ASM-008: payment in arrears assumed',
  'ASM-008: periodic rate = nominal annual rate / 12',
  'ASM-009: HALF_UP rounding at 3 dp for JOD payments',
] as const

export const FORMULA_REGISTRY: Record<FormulaId, FormulaMetadata> = {
  amortization: {
    id: 'amortization',
    version: 1,
    description: 'Standard amortization schedule for conventional fixed-rate loans',
    assumptions: [...GENERIC_LOAN_ASSUMPTIONS],
  },
  variableProjection: {
    id: 'variableProjection',
    version: 1,
    description:
      'Projects outstanding balance and residual for variable-rate loans with rate history and unchanged installment',
    assumptions: [
      ...GENERIC_LOAN_ASSUMPTIONS,
      'Rate change effective from the first full period after the effective date',
      'Installment amount does not change unless explicitly recorded',
    ],
  },
  residualDetection: {
    id: 'residualDetection',
    version: 1,
    description: 'Detects projected residual (balloon) balance at maturity',
    assumptions: [...GENERIC_LOAN_ASSUMPTIONS, 'Residual threshold: > 0.500 JOD'],
  },
  allocationEstimate: {
    id: 'allocationEstimate',
    version: 1,
    description:
      'Estimates principal/interest allocation for a payment when not officially provided',
    assumptions: [
      ...GENERIC_LOAN_ASSUMPTIONS,
      'ASM-008: standard amortization split applied retroactively',
    ],
  },
  murabahaProgress: {
    id: 'murabahaProgress',
    version: 1,
    description: 'Murabaha progress: payments made / total sale price (INV-7)',
    assumptions: [
      'ASM-010: total sale price is fixed at contract signing',
      'No rate-change calculations apply (BR-CALC-020)',
    ],
  },
  extraPaymentScenario: {
    id: 'extraPaymentScenario',
    version: 1,
    description: 'Projects payoff date and cost savings for extra-payment scenarios',
    assumptions: [
      ...GENERIC_LOAN_ASSUMPTIONS,
      'Extra payments reduce principal immediately in full',
      'No prepayment penalties modeled (user must ask bank — SCR-BANK-QUESTIONS)',
    ],
  },
  cardPayoff: {
    id: 'cardPayoff',
    version: 1,
    description: 'Credit card payoff simulator: minimum vs fixed payment strategies',
    assumptions: [
      'ASM-011: monthly close interest = balance × APR/12 (daily accrual is more accurate; potential divergence ~10-15% for long horizons)',
      'Statement balance treated as starting balance',
    ],
  },
  aggregates: {
    id: 'aggregates',
    version: 1,
    description: 'Total outstanding + total monthly commitment across all obligations',
    assumptions: [
      'Mixed-source aggregates labeled "includes estimates" (BR-PROV-004)',
      'Excluded obligations counted and named (BR-PROV-005)',
    ],
  },
}
