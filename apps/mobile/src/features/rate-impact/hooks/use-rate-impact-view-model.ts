import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Money, DomainInvariantError, type Id, type CalculationRun } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount } from '@/services/calculation-snapshot'

export interface RateImpactViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  projectionRun?: CalculationRun
  hasResidual: boolean
  /** TV-305 (added total cost from repricing) is PENDING-FINANCE — no signed
   * formula output exists yet, so this stays false until finance sign-off
   * lands; the UI must show an honest "pending" state, never a fabricated
   * number (AI_AGENT_RULES). */
  addedCostAvailable: boolean
}

export function useRateImpactViewModel(obligationId: Id<'obligation'>): RateImpactViewModel {
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

  const { data: projectionRun, isError: isProjError } = useQuery({
    queryKey: ['projection', obligationId, activeUser],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'projection query ran while enabled gate was false',
        )
      }
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
          asOf: DEMO_DATE,
        },
        DEMO_DATE,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunProjection,
  })

  if (isOblError || isProjError) {
    return { status: 'error', hasResidual: false, addedCostAvailable: false }
  }

  if (!obligation) {
    return { status: 'loading', hasResidual: false, addedCostAvailable: false }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return { status: 'unsupported', hasResidual: false, addedCostAvailable: false }
  }

  if (!projectionRun) {
    return { status: 'loading', hasResidual: false, addedCostAvailable: false }
  }

  if (projectionRun.outcome.kind === 'refused') {
    return { status: 'refused', projectionRun, hasResidual: false, addedCostAvailable: false }
  }

  const snapshot = snapshotRecord(projectionRun.outcome.resultSnapshot)
  const residualAmount = snapshotMoneyAmount(snapshot.projectedResidualAtMaturity)
  const hasResidual =
    residualAmount !== undefined && Money.of(residualAmount, obligation.currency).isPositive()

  return {
    status: 'success',
    projectionRun,
    hasResidual,
    addedCostAvailable: false,
  }
}
