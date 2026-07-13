import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreditCard } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { CalculationService } from '@/services/calculation-service'
import { InsightEvaluationService } from '@/services/insight-evaluation-service'
import { calculationAsOf } from '@/services/calculation-as-of'
import { insightKeys } from '@/features/home/api/keys'

/** Runs HIGH_CARD_UTILIZATION evaluation once per card-detail view (utilization can change between visits). */
export function useCardInsightEvaluation(obligation: CreditCard | undefined): void {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const queryClient = useQueryClient()

  const service = useMemo(
    () =>
      new InsightEvaluationService(
        repos.insightRepository,
        new CalculationService(repos.calculationRunRepository),
      ),
    [repos.insightRepository, repos.calculationRunRepository],
  )

  useQuery({
    queryKey: ['cardInsightEvaluation', obligation?.id, activeUser],
    queryFn: async () => {
      if (!activeUser || !obligation) return null
      const result = await service.evaluateForCard(
        activeUser,
        obligation,
        calculationAsOf(obligation),
      )
      if (!result.ok) throw result.error
      await queryClient.invalidateQueries({ queryKey: insightKeys.list(activeUser) })
      return result.value
    },
    enabled: !!activeUser && !!obligation,
    staleTime: Infinity,
  })
}
