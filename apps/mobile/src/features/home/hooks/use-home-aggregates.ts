/**
 * Home dashboard aggregation — financial-calculation-spec.md §4.7
 * (`aggregates.v1`, FR-CALC-006) for total monthly commitment, plus the
 * earliest `getNextDueInfo` across obligations for the "next payment" card.
 *
 * Per-obligation balance/commitment resolution is owned by domain
 * (`extractOfficialBalance`, `resolveMonthlyCommitment`, `getNextDueInfo`) —
 * this hook only orchestrates the finance-engine call and picks the minimum
 * next-due-date, it does not itself decide what counts as a balance or a
 * commitment (AI_AGENT_RULES §6/§10). Formatting stays out of this hook too
 * (DS-2) — it returns `Money`, screens call `core/formatting`.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Obligation, LocalDate } from '@eltizamati/domain'
import {
  extractOfficialBalance,
  resolveMonthlyCommitment,
  getNextDueInfo,
  compareLocalDate,
  Money,
} from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount } from '@/services/calculation-snapshot'

export interface HomeAggregatesViewModel {
  status: 'loading' | 'error' | 'success'
  totalMonthlyCommitment?: Money
  includesEstimates?: boolean
  nextDueDate?: LocalDate
  nextDueAmount?: Money
}

export function useHomeAggregates(obligations: readonly Obligation[]): HomeAggregatesViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data, isError } = useQuery({
    queryKey: ['homeAggregates', activeUser, obligations.map((o) => o.id).join(',')],
    queryFn: async () => {
      if (!activeUser) return null

      const balances = obligations.map((o) => {
        const balance = extractOfficialBalance(o)
        return {
          obligationId: o.id,
          nickname: o.nickname,
          isEstimate: balance?.provenance.source === 'estimate',
          ...(balance !== undefined ? { balance: balance.value } : {}),
        }
      })

      const commitments = obligations.map((o) => {
        const commitment = resolveMonthlyCommitment(o, DEMO_DATE)
        return {
          obligationId: o.id,
          nickname: o.nickname,
          isEstimate: commitment?.provenance.source === 'estimate',
          ...(commitment !== undefined ? { monthlyCommitment: commitment.value } : {}),
        }
      })

      const result = await calcService.runCalculation(
        activeUser,
        undefined,
        'aggregates',
        1,
        { balances, commitments, currency: 'JOD', asOf: DEMO_DATE },
        DEMO_DATE,
      )
      if (!result.ok) throw result.error

      let nextDueDate: LocalDate | undefined
      let nextDueAmount: Money | undefined
      for (const obligation of obligations) {
        const info = getNextDueInfo(obligation, DEMO_DATE)
        if (!info) continue
        if (!nextDueDate || compareLocalDate(info.dueDate, nextDueDate) < 0) {
          nextDueDate = info.dueDate
          nextDueAmount = info.amount.value
        }
      }

      return { run: result.value, nextDueDate, nextDueAmount }
    },
    enabled: !!activeUser,
  })

  if (isError) return { status: 'error' }
  if (!data) return { status: 'loading' }

  if (data.run.outcome.kind !== 'result') {
    return { status: 'success', nextDueDate: data.nextDueDate, nextDueAmount: data.nextDueAmount }
  }

  const snapshot = snapshotRecord(data.run.outcome.resultSnapshot)
  const totalMonthlyCommitmentAmount = snapshotMoneyAmount(snapshot.totalMonthlyCommitment)

  return {
    status: 'success',
    totalMonthlyCommitment:
      totalMonthlyCommitmentAmount !== undefined
        ? Money.of(totalMonthlyCommitmentAmount, 'JOD')
        : undefined,
    includesEstimates: snapshot.includesEstimates === true,
    nextDueDate: data.nextDueDate,
    nextDueAmount: data.nextDueAmount,
  }
}
