import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Money, DomainInvariantError, type Id, type CalculationRun } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { calculationAsOf } from '@/services/calculation-as-of'

/** NFR-PERF-002 — debounce the recalculation trigger, not every keystroke. */
const SCENARIO_INPUT_DEBOUNCE_MS = 300

export interface ScenarioSimulatorViewModel {
  status: 'loading' | 'error' | 'unsupported' | 'refused' | 'success'
  run?: CalculationRun
  /** Debounced value actually driving the calculation (query key + engine input). */
  extraMonthly: number
  /** Immediate value bound to the input field, for responsive typing. */
  draftExtraMonthly: number
  setDraftExtraMonthly: (val: number) => void
  oneTimeAmount: number
  setOneTimeAmount: (val: number) => void
  /** Wall-clock duration of the last engine call, ms (NFR-PERF-002: measure and record, target <300ms). */
  perfMs?: number
}

export function useScenarioSimulator(obligationId: Id<'obligation'>): ScenarioSimulatorViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  // Default to +50 JOD (TV-304 structural anchor) until the user edits it.
  const [draftExtraMonthly, setDraftExtraMonthly] = useState<number>(50)
  const [extraMonthly, setExtraMonthly] = useState<number>(50)
  const [perfMs, setPerfMs] = useState<number | undefined>(undefined)
  const [oneTimeAmount, setOneTimeAmount] = useState(0)

  useEffect(() => {
    const handle = setTimeout(() => setExtraMonthly(draftExtraMonthly), SCENARIO_INPUT_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [draftExtraMonthly])

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
    !!activeUser &&
    obligation?.kind === 'conventionalLoan' &&
    !!ratePeriods &&
    (extraMonthly > 0 || oneTimeAmount > 0)

  const { data: run, isError: isRunError } = useQuery({
    queryKey: ['scenario', obligationId, activeUser, extraMonthly, oneTimeAmount],
    queryFn: async (): Promise<CalculationRun> => {
      if (!activeUser || obligation?.kind !== 'conventionalLoan' || !ratePeriods) {
        throw new DomainInvariantError(
          'unexpected',
          'scenario query ran while enabled gate was false',
        )
      }
      const startedAt = performance.now()
      const asOf = calculationAsOf(obligation)
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
          ...(oneTimeAmount > 0
            ? { oneTime: { amount: Money.of(oneTimeAmount, obligation.currency), period: 1 } }
            : {}),
          asOf,
        },
        asOf,
      )
      setPerfMs(performance.now() - startedAt)

      if (!result.ok) throw result.error
      return result.value
    },
    enabled: canRunScenario,
  })

  const base = {
    extraMonthly,
    draftExtraMonthly,
    setDraftExtraMonthly,
    oneTimeAmount,
    setOneTimeAmount,
    perfMs,
  }

  if (isOblError || isRunError) {
    return { status: 'error', ...base }
  }

  if (!obligation) {
    return { status: 'loading', ...base }
  }

  if (obligation.kind !== 'conventionalLoan') {
    return { status: 'unsupported', ...base }
  }

  if (!run) {
    return { status: 'loading', ...base }
  }

  if (run.outcome.kind === 'refused') {
    return { status: 'refused', run, ...base }
  }

  return { status: 'success', run, ...base }
}
