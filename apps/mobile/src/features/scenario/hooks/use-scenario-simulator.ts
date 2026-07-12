import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Money, DomainInvariantError, type Id, type CalculationRun } from '@eltizamati/domain'
import { DEMO_DATE } from '@eltizamati/demo-data'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'

export interface ScenarioSimulatorViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  run?: CalculationRun
  extraMonthly: number
  setExtraMonthly: (val: number) => void
}

export function useScenarioSimulator(obligationId: Id<'obligation'>): ScenarioSimulatorViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const [extraMonthly, setExtraMonthly] = useState<number>(50) // Default to +50 JOD for TV-304 structural test

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

  const canRunScenario =
    !!activeUser && obligation?.kind === 'conventionalLoan' && !!ratePeriods && extraMonthly > 0

  const { data: run, isError: isRunError } = useQuery({
    queryKey: ['scenario', obligationId, activeUser, extraMonthly],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'scenario query ran while enabled gate was false',
        )
      }
      const result = await calcService.runCalculation(
        activeUser,
        obligationId,
        'extraPaymentScenario',
        1,
        {
          principal: obligation.loanDetails.originalPrincipal.value,
          ratePeriods,
          termMonths: obligation.loanDetails.termMonths.value,
          startDate: obligation.loanDetails.startDate,
          installment: obligation.loanDetails.installment.value,
          installmentPolicy: { kind: 'unchanged' }, // MVP assumption
          extraMonthly: Money.of(
            extraMonthly,
            obligation.loanDetails.originalPrincipal.value.currency,
          ),
          asOf: DEMO_DATE,
        },
        DEMO_DATE,
      )

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunScenario,
  })

  if (isOblError || isRunError) {
    return { status: 'error', extraMonthly, setExtraMonthly }
  }

  if (!obligation) {
    return { status: 'loading', extraMonthly, setExtraMonthly }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return { status: 'unsupported', extraMonthly, setExtraMonthly }
  }

  if (!run) {
    return { status: 'loading', extraMonthly, setExtraMonthly }
  }

  if (run.outcome.kind === 'refused') {
    return { status: 'refused', run, extraMonthly, setExtraMonthly }
  }

  return { status: 'success', run, extraMonthly, setExtraMonthly }
}
