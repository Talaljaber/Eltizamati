/**
 * ImportService — Phase 5 (ADR-0009, seed-demo-data.md §2).
 *
 * Populates demo repositories from a DemoSeed through a
 * provider → validate → map → persist → events pipeline.
 *
 * Atomic failure: if any persist call fails, all repositories are reset
 * to their pre-import state (no partial state).
 *
 * NO Supabase imports. NO React state mutation.
 * Data enters ONLY through repository interfaces.
 *
 * PHASE 4 INTEGRATION NOTE:
 *   This service is standalone — Phase 4 does not need to change it.
 *   When Phase 4 composition-root.ts is wired for demo mode, it calls
 *   ImportService.importDemoSeed() once on app boot.
 *
 * PHASE 6 INTEGRATION NOTE:
 *   After Phase 6 adds CalculationRun persistence, call
 *   repos.calculationRunRepository.persist(run) to seed any pre-computed runs.
 *   The slot is already in createDemoRepositories().calculationRunRepository.
 */

import { ok, err, makeError, isErr, type Result, type AppError } from '@eltizamati/domain'

import type { DemoSeed } from '@eltizamati/demo-data'
import type { DemoRepositories } from './repositories/demo/index'
import type { Repositories } from '@/features/repositories/hooks/use-repositories'
import type { Id, Obligation } from '@eltizamati/domain'

export interface ImportSummary {
  readonly obligationCount: number
  readonly paymentCount: number
  readonly insightCount: number
}

export type ImportResult = Result<ImportSummary, AppError>

/**
 * Result of importing a batch of provider-classified obligations
 * (connect-plan.md Phase C). `imported` and `failed` are the buckets that
 * matter in practice: an obligation lands in `imported` once its base row
 * AND (for loans) its initial rate period both succeed — including when
 * they already existed from a prior attempt at the exact same ids, since
 * both writes are idempotent no-ops in that case. `skipped` is reserved for
 * a record recognized as a pre-existing duplicate before any write is
 * attempted; the current single-pass import doesn't pre-check, so it stays
 * empty today, but callers must not assume that.
 */
export interface ProviderImportSummary {
  readonly imported: readonly Id<'obligation'>[]
  readonly skipped: readonly Id<'obligation'>[]
  readonly failed: readonly { readonly id: Id<'obligation'>; readonly error: AppError }[]
}

export class ImportService {
  /** Persists one provider-normalized obligation through the shared import boundary. */
  async importProviderObligation(
    obligation: Obligation,
    repos: Repositories,
  ): Promise<Result<Obligation, AppError>> {
    return repos.obligationRepository.save(obligation)
  }

  /**
   * Imports several provider-classified obligations (the "pull from bank"
   * multi-select flow). Never all-or-nothing: each record is attempted
   * independently and the typed summary reports exactly what happened, so
   * the UI can never report full success on a partial write, and a caller
   * can safely retry by passing the SAME obligations again — deterministic
   * ids make every write here a no-op where it already landed.
   *
   * For conventional loans, the base obligation and its initial rate period
   * are two separate writes (`save()` does not touch `rate_periods` —
   * see rate-period-repository.ts). If the obligation write succeeds but the
   * rate-period write fails (or conflicts with a different pre-existing
   * period at the same id), the whole record is reported as `failed` even
   * though the obligation row now exists — a retry of the same record is
   * still safe: the obligation upsert no-ops and only the rate period is
   * attempted again.
   */
  async importProviderObligations(
    obligations: readonly Obligation[],
    repos: Pick<Repositories, 'obligationRepository' | 'ratePeriodRepository'>,
  ): Promise<ProviderImportSummary> {
    const imported: Id<'obligation'>[] = []
    const failed: { id: Id<'obligation'>; error: AppError }[] = []

    for (const obligation of obligations) {
      const saveResult = await repos.obligationRepository.save(obligation)
      if (!saveResult.ok) {
        failed.push({ id: obligation.id, error: saveResult.error })
        continue
      }

      if (obligation.kind === 'conventionalLoan') {
        let loanFailed = false
        for (const period of obligation.loanDetails.ratePeriods) {
          const periodResult = await repos.ratePeriodRepository.appendIfAbsent(period)
          if (!periodResult.ok) {
            failed.push({ id: obligation.id, error: periodResult.error })
            loanFailed = true
            break
          }
        }
        if (loanFailed) continue
      }

      imported.push(obligation.id)
    }

    return { imported, skipped: [], failed }
  }

  /**
   * Imports a DemoSeed into the provided repositories.
   *
   * Pipeline: validate → persist obligations → persist payments → persist rate periods
   *           → persist insights → persist profile → events (noop in Phase 5).
   *
   * Atomic: on any failure, calls repos.reset() then returns err.
   */
  async importDemoSeed(seed: DemoSeed, repos: DemoRepositories): Promise<ImportResult> {
    // Validate seed integrity
    if (seed.loan === undefined || seed.murabaha === undefined || seed.card === undefined) {
      return err(
        makeError('validation', {
          safeMetadata: { reason: 'DemoSeed missing required obligations' },
        }),
      )
    }

    try {
      // 1. Persist obligations
      const loanResult = await repos.obligationRepository.save(seed.loan)
      if (isErr(loanResult)) {
        repos.reset()
        return loanResult
      }

      const murabahaResult = await repos.obligationRepository.save(seed.murabaha)
      if (isErr(murabahaResult)) {
        repos.reset()
        return murabahaResult
      }

      const cardResult = await repos.obligationRepository.save(seed.card)
      if (isErr(cardResult)) {
        repos.reset()
        return cardResult
      }

      // 2. Persist loan payments
      for (const payment of seed.loanPayments) {
        const result = await repos.paymentRepository.log(payment)
        if (isErr(result)) {
          repos.reset()
          return result
        }
      }

      // 3. Persist murabaha payments
      for (const payment of seed.murabahaPayments) {
        const result = await repos.paymentRepository.log(payment)
        if (isErr(result)) {
          repos.reset()
          return result
        }
      }

      // 4. Persist loan rate periods (extracted from the obligation entity)
      for (const rp of seed.loan.loanDetails.ratePeriods) {
        const result = await repos.ratePeriodRepository.append(rp)
        if (isErr(result)) {
          repos.reset()
          return result
        }
      }

      // 5. Persist pre-seeded insights
      for (const insight of seed.insights) {
        const result = await repos.insightRepository.raise(insight)
        if (isErr(result)) {
          repos.reset()
          return result
        }
      }

      // 6. Persist demo user profile
      const profileResult = await repos.userProfileRepository.save({
        userId: seed.userId,
        locale: 'en',
        dataMode: 'demo',
        createdAt: `${seed.demoDate}T00:00:00.000Z`,
        updatedAt: `${seed.demoDate}T00:00:00.000Z`,
      })
      if (isErr(profileResult)) {
        repos.reset()
        return profileResult
      }

      // 7. Events — Phase 5: noop (event bus integration is Phase 6)
      // TODO(Phase6): emit DemoSeedImported event so engine schedules initial calculations

      return ok({
        obligationCount: 3,
        paymentCount: seed.loanPayments.length + seed.murabahaPayments.length,
        insightCount: seed.insights.length,
      })
    } catch (e: unknown) {
      repos.reset()
      return err(makeError('unexpected', { cause: e }))
    }
  }

  /**
   * Reset all repositories and re-import the same seed (FR-SET-005).
   * Deterministic result: calling this twice with the same seed produces identical state.
   */
  async resetDemo(seed: DemoSeed, repos: DemoRepositories): Promise<ImportResult> {
    repos.reset()
    return this.importDemoSeed(seed, repos)
  }
}
