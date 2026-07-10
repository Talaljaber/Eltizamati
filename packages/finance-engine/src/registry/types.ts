/**
 * Formula registry types.
 * Each formula has an immutable id + version; changing math bumps the version.
 * (AI_AGENT_RULES §7, financial-calculation-spec.md §1.3)
 */

export type FormulaId =
  | 'amortization'
  | 'variableProjection'
  | 'residualDetection'
  | 'allocationEstimate'
  | 'murabahaProgress'
  | 'extraPaymentScenario'
  | 'cardPayoff'
  | 'aggregates'

export type FormulaVersion = 1 // increment when math changes

export type CalculationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'REFUSED'

export interface FormulaMetadata {
  readonly id: FormulaId
  readonly version: FormulaVersion
  readonly description: string
  /** Assumptions baked into this formula (maps to assumption notes in CalculationRun). */
  readonly assumptions: readonly string[]
}
