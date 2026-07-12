/**
 * Finance engine — public API.
 *
 * M3/Phase 6: Exposing the fully typed pure financial formulas, types, and refusal logic.
 */

export type { FormulaId, FormulaVersion, CalculationConfidence } from './registry/types.js'
export { FORMULA_REGISTRY } from './registry/formula-registry.js'

export * from './types.js'
export * from './refusal.js'

export * from './formulas/amortization.js'
export * from './formulas/variable-projection.js'
export * from './formulas/residual-detection.js'
export * from './formulas/allocation-estimate.js'
export * from './formulas/murabaha-progress.js'
export * from './formulas/extra-payment-scenario.js'
export * from './formulas/card-payoff.js'
export * from './formulas/aggregates.js'

export * from './insights/rules.js'
