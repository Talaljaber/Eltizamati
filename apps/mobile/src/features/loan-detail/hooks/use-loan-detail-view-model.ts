import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Id, Obligation, CalculationRun, Payment, Confidence } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { snapshotRecord, snapshotMoneyAmount } from '@/services/calculation-snapshot'

export interface LoanDetailHeroModel {
  officialBalance: string
  officialBalanceSource: string
  officialBalanceAsOf: string
  estimatedResidual: string | undefined
  residualConfidence: Confidence | undefined
  residualCalculationRunId: string | undefined
}

export interface LoanDetailViewModel {
  status: 'loading' | 'error' | 'success'
  obligation?: Obligation
  hero?: LoanDetailHeroModel
  payments?: readonly Payment[]
}

export function useLoanDetailViewModel(obligationId: Id<'obligation'>): LoanDetailViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  const calcService = useMemo(
    () => new CalculationService(repos.calculationRunRepository),
    [repos.calculationRunRepository],
  )

  const { data: obligation, isError: isObligationError } = useQuery({
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

  const { data: payments } = useQuery({
    queryKey: ['payments', obligationId],
    queryFn: async () => {
      const res = await repos.paymentRepository.listFor(obligationId)
      if (!res.ok) throw res.error
      return res.value
    },
    enabled: !!obligation,
  })

  // Hero calculation using variableProjection.v1
  const { data: projectionRun } = useQuery({
    queryKey: ['projection', obligationId, activeUser],
    queryFn: async (): Promise<CalculationRun | null> => {
      if (!activeUser || !obligation || obligation.kind !== 'conventionalLoan' || !ratePeriods) {
        return null
      }
      // Orchestrate the financial engine call through CalculationService
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
          installmentPolicy: { kind: 'unchanged' }, // Seed assumption
          asOf: DEMO_DATE,
        },
        DEMO_DATE,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: !!activeUser && !!obligation && !!ratePeriods,
  })

  if (isObligationError) {
    return { status: 'error' }
  }

  if (!obligation) {
    return { status: 'loading' }
  }

  // Rich (hero/rate-history/scenario) detail is conventionalLoan-only per
  // Phase 7 scope — murabaha/card obligations still resolve to 'success' so
  // the screen can render their basic fields instead of spinning forever;
  // their rich detail is Phase 8.
  let hero: LoanDetailHeroModel | undefined
  if (
    obligation.kind === 'conventionalLoan' &&
    projectionRun &&
    projectionRun.outcome.kind === 'result'
  ) {
    const snapshot = snapshotRecord(projectionRun.outcome.resultSnapshot)
    hero = {
      officialBalance: obligation.loanDetails.originalPrincipal.value.toStorageString(), // Assuming original for now, MVP uses whatever official is available
      officialBalanceSource: obligation.provenance.source,
      officialBalanceAsOf: obligation.openedDate,
      estimatedResidual: snapshotMoneyAmount(snapshot.projectedResidualAtMaturity),
      residualConfidence: projectionRun.outcome.confidence,
      residualCalculationRunId: projectionRun.id,
    }
  }

  return {
    status: 'success',
    obligation,
    hero,
    payments,
  }
}
