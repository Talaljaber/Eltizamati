/**
 * Formula registry — maps FormulaId → metadata.
 * All formulas are registered here. If a formula id doesn't appear here,
 * the engine cannot use it (prevents ad-hoc formula creation in features).
 */
import type { ExecutableFormula, FormulaId, FormulaRegistry, FormulaVersion } from './types.js'
import { amortization } from '../formulas/amortization.js'
import { variableProjection } from '../formulas/variable-projection.js'
import { residualDetection } from '../formulas/residual-detection.js'
import { allocationEstimate } from '../formulas/allocation-estimate.js'
import { murabahaProgress } from '../formulas/murabaha-progress.js'
import { extraPaymentScenario } from '../formulas/extra-payment-scenario.js'
import { cardPayoff } from '../formulas/card-payoff.js'
import { aggregates } from '../formulas/aggregates.js'
import { rateChangeScenario } from '../formulas/rate-change-scenario.js'
import { addedCostFromRepricing } from '../formulas/added-cost-from-repricing.js'
import { makeError, err, ok, type Result, type AppError } from '@eltizamati/domain'
import { FORMULA_ASSUMPTIONS } from './formula-assumptions.js'

export const FORMULA_REGISTRY: FormulaRegistry = {
  amortization: {
    id: 'amortization',
    version: 1,
    description: 'Standard amortization schedule for conventional fixed-rate loans',
    assumptions: FORMULA_ASSUMPTIONS.amortization,
    execute: amortization,
  },
  variableProjection: {
    id: 'variableProjection',
    version: 1,
    description:
      'Projects outstanding balance and residual for variable-rate loans with rate history and unchanged installment',
    assumptions: FORMULA_ASSUMPTIONS.variableProjection,
    execute: variableProjection,
  },
  residualDetection: {
    id: 'residualDetection',
    version: 1,
    description: 'Detects projected residual (balloon) balance at maturity',
    assumptions: FORMULA_ASSUMPTIONS.residualDetection,
    execute: residualDetection,
  },
  allocationEstimate: {
    id: 'allocationEstimate',
    version: 1,
    description:
      'Estimates principal/interest allocation for a payment when not officially provided',
    assumptions: FORMULA_ASSUMPTIONS.allocationEstimate,
    execute: allocationEstimate,
  },
  murabahaProgress: {
    id: 'murabahaProgress',
    version: 1,
    description: 'Murabaha progress: payments made / total sale price (INV-7)',
    assumptions: FORMULA_ASSUMPTIONS.murabahaProgress,
    execute: murabahaProgress,
  },
  extraPaymentScenario: {
    id: 'extraPaymentScenario',
    version: 1,
    description: 'Projects payoff date and cost savings for extra-payment scenarios',
    assumptions: FORMULA_ASSUMPTIONS.extraPaymentScenario,
    execute: extraPaymentScenario,
  },
  cardPayoff: {
    id: 'cardPayoff',
    version: 1,
    description: 'Credit card payoff simulator: minimum vs fixed payment strategies',
    assumptions: FORMULA_ASSUMPTIONS.cardPayoff,
    execute: cardPayoff,
  },
  aggregates: {
    id: 'aggregates',
    version: 1,
    description: 'Total outstanding + total monthly commitment across all obligations',
    assumptions: FORMULA_ASSUMPTIONS.aggregates,
    execute: aggregates,
  },
  rateChangeScenario: {
    id: 'rateChangeScenario',
    version: 1,
    description:
      'Compares the authoritative loan projection with an ephemeral hypothetical rate change',
    assumptions: FORMULA_ASSUMPTIONS.rateChangeScenario,
    execute: rateChangeScenario,
  },
  addedCostFromRepricing: {
    id: 'addedCostFromRepricing',
    version: 1,
    description:
      'Estimates the added total interest cost caused by the loan\'s actual rate history vs a flat-original-rate counterfactual (TV-305)',
    assumptions: FORMULA_ASSUMPTIONS.addedCostFromRepricing,
    execute: addedCostFromRepricing,
  },
}

export function resolveFormula<K extends FormulaId>(
  id: K,
  version: FormulaVersion,
): Result<ExecutableFormula<K>, AppError> {
  // `K extends FormulaId` guarantees a lookup hit for any call the type
  // checker accepts — but an unsafe cast (`someString as FormulaId`) can
  // still reach here at runtime with an id absent from the registry, so this
  // stays a real check rather than a type-only guarantee.
  const formula: ExecutableFormula<K> | undefined = FORMULA_REGISTRY[id]
  if (formula === undefined) {
    return err(
      makeError('calculationUnsupported', {
        cause: `Unknown formula id: ${String(id)}`,
        safeMetadata: { formulaId: id, requestedVersion: version },
      }),
    )
  }
  if (formula.version !== version) {
    return err(
      makeError('calculationUnsupported', {
        cause: `Requested version ${String(version)} not available for ${String(id)}. Current is ${String(formula.version)}.`,
        safeMetadata: { formulaId: id, requestedVersion: version },
      }),
    )
  }
  return ok(formula)
}

const FORMULA_ID_SET: ReadonlySet<string> = new Set(Object.keys(FORMULA_REGISTRY))

export function isFormulaId(value: string): value is FormulaId {
  return FORMULA_ID_SET.has(value)
}

/** Runtime-facing resolution for untrusted IDs/versions. */
export function resolveRuntimeFormula(
  id: string,
  version: number,
): Result<ExecutableFormula<FormulaId>, AppError> {
  if (!isFormulaId(id) || version !== 1) {
    return err(
      makeError('calculationUnsupported', {
        safeMetadata: { formulaId: id, requestedVersion: version },
      }),
    )
  }
  return resolveFormula(id, version)
}
