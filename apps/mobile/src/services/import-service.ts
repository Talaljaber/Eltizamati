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
import type { Obligation } from '@eltizamati/domain'

export interface ImportSummary {
  readonly obligationCount: number
  readonly paymentCount: number
  readonly insightCount: number
}

export type ImportResult = Result<ImportSummary, AppError>

export class ImportService {
  /** Persists one provider-normalized obligation through the shared import boundary. */
  async importProviderObligation(
    obligation: Obligation,
    repos: Repositories,
  ): Promise<Result<Obligation, AppError>> {
    return repos.obligationRepository.save(obligation)
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
