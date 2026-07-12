import type {
  Id,
  LocalDate,
  CalculationRun,
  CalculationRunRepository,
  CalculationOutcome,
  CanonicalJsonValue,
  Result,
  AppError,
} from '@eltizamati/domain'
import { hashCanonicalJson, brandId, err, makeError } from '@eltizamati/domain'
import type { EngineOutcome, FormulaId } from '@eltizamati/finance-engine'
import { FORMULA_REGISTRY, isEngineOk, isRefused } from '@eltizamati/finance-engine'

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `calc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * CalculationService orchestrates the execution of pure finance-engine formulas
 * and persists the deterministic results as CalculationRun records.
 *
 * (Phase 6 integration requirement)
 */
export class CalculationService {
  constructor(private readonly repo: CalculationRunRepository) {}

  /**
   * Executes a finance-engine formula and persists the result.
   */
  async runCalculation<TInputs, TResult>(
    userId: Id<'user'>,
    obligationId: Id<'obligation'> | undefined,
    formulaId: FormulaId,
    inputs: TInputs,
    asOf: LocalDate,
    executor: (inputs: TInputs) => EngineOutcome<TResult>,
  ): Promise<Result<CalculationRun, AppError>> {
    const outcome = executor(inputs)

    const inputsSnapshot = inputs as unknown as CanonicalJsonValue
    const inputsHash = hashCanonicalJson(inputsSnapshot)

    let calculationOutcome: CalculationOutcome
    if (isEngineOk(outcome)) {
      calculationOutcome = {
        kind: 'result',
        confidence: outcome.confidence,
        resultSnapshot: outcome.value as unknown as CanonicalJsonValue,
      }
    } else if (isRefused(outcome)) {
      calculationOutcome = {
        kind: 'refused',
        missingFields: outcome.missing.map((m) => m.field),
        partialSnapshot: outcome.partial as unknown as CanonicalJsonValue,
      }
    } else {
      return err(
        makeError('calculationUnsupported', {
          cause: 'Unrecognized outcome from finance engine',
        }),
      )
    }

    const formulaMeta = FORMULA_REGISTRY[formulaId]
    const assumptions = isEngineOk(outcome) ? outcome.assumptions : []

    const run: CalculationRun = {
      id: brandId<'calculationRun'>(generateId()),
      userId,
      obligationId,
      formulaId,
      formulaVersion: formulaMeta.version,
      asOf,
      inputsSnapshot,
      inputsHash,
      outcome: calculationOutcome,
      assumptions,
      calculatedAt: new Date().toISOString(),
    }

    return this.repo.persist(run)
  }
}
