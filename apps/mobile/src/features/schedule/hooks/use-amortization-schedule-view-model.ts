import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DomainInvariantError, type Id, type CalculationRun } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotArray, snapshotMoneyAmount } from '@/services/calculation-snapshot'
import { calculationAsOf } from '@/services/calculation-as-of'

/**
 * Display row for one amortization period. `CalculationRun.resultSnapshot` is
 * opaque canonical JSON (finance-engine's `ScheduleEntry` — with real `Money`
 * instances — never survives the round trip), so this is the JSON-safe shape
 * screens actually receive: decimal strings, not `Money`.
 */
export interface AmortizationScheduleRow {
  period: number
  date: string
  payment: string
  principal: string
  cost: string
  closingBalance: string
}

export interface AmortizationScheduleViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  schedule: AmortizationScheduleRow[]
  run?: CalculationRun
}

export function useAmortizationScheduleViewModel(
  obligationId: Id<'obligation'>,
): AmortizationScheduleViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data: obligation, isError: isOblError } = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      const res = await repos.obligationRepository.get(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
  })

  const { data: ratePeriods } = useQuery({
    queryKey: ['ratePeriods', obligationId],
    queryFn: async () => {
      const res = await repos.ratePeriodRepository.historyFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!obligation,
  })

  const canRunProjection = !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods

  const { data: run, isError: isProjError } = useQuery({
    queryKey: ['projection', obligationId, activeUser],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'projection query ran while enabled gate was false',
        )
      }
      const asOf = calculationAsOf(obligation)
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'variableProjection',
        1,
        {
          principal: obligation.loanDetails.originalPrincipal.value,
          ratePeriods,
          termMonths: obligation.loanDetails.termMonths.value,
          startDate: obligation.loanDetails.startDate,
          installment: obligation.loanDetails.installment.value,
          installmentPolicy: { kind: 'unchanged' }, // MVP assumption
          asOf,
        },
        asOf,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunProjection,
  })

  if (isOblError || isProjError) {
    return { status: 'error', schedule: [] }
  }

  if (!obligation) {
    return { status: 'loading', schedule: [] }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return { status: 'unsupported', schedule: [] }
  }

  if (!run) {
    return { status: 'loading', schedule: [] }
  }

  if (run.outcome.kind === 'refused') {
    return { status: 'refused', schedule: [], run }
  }

  const snapshot = snapshotRecord(run.outcome.resultSnapshot)
  const schedule = snapshotArray(snapshot.schedule).map((entryValue, index) => {
    const entry = snapshotRecord(entryValue)
    return {
      period: typeof entry.period === 'number' ? entry.period : index + 1,
      date: typeof entry.date === 'string' ? entry.date : '',
      payment: snapshotMoneyAmount(entry.payment) ?? '?',
      principal: snapshotMoneyAmount(entry.principal) ?? '?',
      cost: snapshotMoneyAmount(entry.cost) ?? '?',
      closingBalance: snapshotMoneyAmount(entry.closingBalance) ?? '?',
    }
  })

  return {
    status: 'success',
    schedule,
    run,
  }
}
