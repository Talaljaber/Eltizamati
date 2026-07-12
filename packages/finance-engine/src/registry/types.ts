/**
 * Formula registry types.
 * Each formula has an immutable id + version; changing math bumps the version.
 * (AI_AGENT_RULES §7, financial-calculation-spec.md §1.3)
 */
import type { EngineOutcome } from '../refusal.js'
import type { AmortizationInputs, AmortizationResult } from '../formulas/amortization.js'
import type {
  VariableProjectionInputs,
  VariableProjectionResult,
} from '../formulas/variable-projection.js'
import type {
  ResidualDetectionInputs,
  ResidualDetectionResult,
} from '../formulas/residual-detection.js'
import type {
  AllocationEstimateInputs,
  AllocationEstimateResult,
} from '../formulas/allocation-estimate.js'
import type {
  MurabahaProgressInputs,
  MurabahaProgressResult,
} from '../formulas/murabaha-progress.js'
import type {
  ExtraPaymentScenarioInputs,
  ExtraPaymentScenarioResult,
} from '../formulas/extra-payment-scenario.js'
import type { CardPayoffInputs, CardPayoffResult } from '../formulas/card-payoff.js'
import type { AggregatesInputs, AggregatesResult } from '../formulas/aggregates.js'

export interface FormulaContracts {
  readonly amortization: { readonly input: AmortizationInputs; readonly output: AmortizationResult }
  readonly variableProjection: {
    readonly input: VariableProjectionInputs
    readonly output: VariableProjectionResult
  }
  readonly residualDetection: {
    readonly input: ResidualDetectionInputs
    readonly output: ResidualDetectionResult
  }
  readonly allocationEstimate: {
    readonly input: AllocationEstimateInputs
    readonly output: AllocationEstimateResult
  }
  readonly murabahaProgress: {
    readonly input: MurabahaProgressInputs
    readonly output: MurabahaProgressResult
  }
  readonly extraPaymentScenario: {
    readonly input: ExtraPaymentScenarioInputs
    readonly output: ExtraPaymentScenarioResult
  }
  readonly cardPayoff: { readonly input: CardPayoffInputs; readonly output: CardPayoffResult }
  readonly aggregates: { readonly input: AggregatesInputs; readonly output: AggregatesResult }
}

export type FormulaId = keyof FormulaContracts

export type FormulaVersion = 1 // increment when math changes

export interface ExecutableFormula<K extends FormulaId> {
  readonly id: K
  readonly version: FormulaVersion
  readonly description: string
  readonly assumptions: readonly string[]
  readonly execute: (
    inputs: FormulaContracts[K]['input'],
  ) => EngineOutcome<FormulaContracts[K]['output']>
}

export type FormulaRegistry = { readonly [K in FormulaId]: ExecutableFormula<K> }
export type FormulaInput<K extends FormulaId> = FormulaContracts[K]['input']
export type FormulaOutput<K extends FormulaId> = FormulaContracts[K]['output']
