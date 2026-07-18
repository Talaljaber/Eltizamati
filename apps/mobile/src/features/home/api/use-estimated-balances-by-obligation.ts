/**
 * Estimated current balance for conventional loans that have no official
 * `outstandingBalance` on file — the exact same fallback the Loan Overview
 * hero already computes (`variableProjection.v1`'s `outstandingAsOf`), just
 * batched across a list of obligations via `useQueries` (repositories only
 * expose per-obligation lookups, no user-wide "give me every projection").
 *
 * Kept separate from `extractOfficialBalance` (cheap, record-only) since
 * this runs a real calculation per candidate obligation — only obligations
 * actually missing an official balance are queried.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Money,
  engineEstimate,
  extractOfficialBalance,
  isOk,
  type Id,
  type LocalDate,
  type Obligation,
  type RatePeriodRepository,
  type CalculationRunRepository,
  type Sourced,
} from '@eltizamati/domain'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount } from '@/services/calculation-snapshot'
import { ratePeriodKeys } from './keys'

const NO_OBLIGATIONS: readonly Obligation[] = []

export function useEstimatedBalancesByObligation(
  ratePeriodRepository: RatePeriodRepository,
  calculationRunRepository: CalculationRunRepository,
  obligations: readonly Obligation[] | undefined,
  userId: Id<'user'> | null,
  asOf: LocalDate,
): ReadonlyMap<string, Sourced<Money>> {
  const calcService = useMemo(
    () => new CalculationService(calculationRunRepository),
    [calculationRunRepository],
  )

  const candidates = (obligations ?? NO_OBLIGATIONS).filter(
    (o) => o.kind === 'conventionalLoan' && extractOfficialBalance(o) === undefined,
  )

  const results = useQueries({
    queries: candidates.map((obligation) => ({
      queryKey: [...ratePeriodKeys.historyFor(userId ?? '', obligation.id), 'estimatedBalance', asOf],
      queryFn: async (): Promise<Sourced<Money> | undefined> => {
        if (obligation.kind !== 'conventionalLoan' || !userId) return undefined
        const historyResult = await ratePeriodRepository.historyFor(obligation.id)
        if (!isOk(historyResult) || historyResult.value.length === 0) return undefined

        const result = await calcService.runCalculation(
          userId,
          obligation.id,
          'variableProjection',
          1,
          {
            principal: obligation.loanDetails.originalPrincipal.value,
            ratePeriods: historyResult.value,
            termMonths: obligation.loanDetails.termMonths.value,
            startDate: obligation.loanDetails.startDate,
            installment: obligation.loanDetails.installment.value,
            installmentPolicy: { kind: 'unchanged' },
            asOf,
          },
          asOf,
        )
        if (!isOk(result) || result.value.outcome.kind !== 'result') return undefined

        const snapshot = snapshotRecord(result.value.outcome.resultSnapshot)
        const outstanding = snapshotMoneyAmount(snapshot.outstandingAsOf)
        if (outstanding === undefined) return undefined

        return engineEstimate(
          Money.of(outstanding, obligation.currency),
          result.value.id,
          result.value.calculatedAt,
        )
      },
      enabled: !!userId,
    })),
  })

  const data = new Map<string, Sourced<Money>>()
  results.forEach((r, i) => {
    const obligation = candidates[i]
    if (obligation !== undefined && r.data !== undefined) data.set(obligation.id, r.data)
  })
  return data
}
