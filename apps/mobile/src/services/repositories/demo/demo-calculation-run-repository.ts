/**
 * In-memory demo calculation-run repository — Phase 5.
 * Stores Phase 6 CalculationRun results when they become available.
 * No Supabase imports.
 */

import {
  ok,
  type CalculationRunRepository,
  type CalculationRun,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoCalculationRunRepository implements CalculationRunRepository {
  readonly #store: CalculationRun[] = []

  async latestFor(
    obligationId: Id<'obligation'> | undefined,
    formulaId: string,
  ): Promise<Result<CalculationRun | undefined, AppError>> {
    const matching = this.#store
      .filter(
        (r) =>
          r.formulaId === formulaId &&
          (obligationId === undefined || r.obligationId === obligationId),
      )
      .sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt))
    return ok(matching[0])
  }

  async persist(run: CalculationRun): Promise<Result<CalculationRun, AppError>> {
    this.#store.push(run)
    return ok(run)
  }

  reset(): void {
    this.#store.length = 0
  }
}
