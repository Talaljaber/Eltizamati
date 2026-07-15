/**
 * Live wiring for FR-INS-001's "user-defined threshold reached" rule
 * (FR-SET-006 stores the threshold on the user's profile). Mirrors
 * `useCardInsightEvaluation`'s pattern: a query with no meaningful return
 * value, run purely for its evaluate-and-invalidate side effect.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Money, type Obligation } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'
import { useProfileQuery } from '@/features/auth/api/use-profile'
import { InsightEvaluationService } from '@/services/insight-evaluation-service'
import { CalculationService } from '@/services/calculation-service'
import { calculationAsOf } from '@/services/calculation-as-of'
import { usePersonalCalculationAsOf } from '@/services/calculation-as-of-context'
import { insightKeys } from '@/features/home/api/keys'

export function useUserThresholdInsightEvaluation(
  obligation: Obligation | undefined,
  gapAmount: Money | undefined,
) {
  const repos = useRepositories()
  const activeUser = useActiveUser()
  const personalAsOf = usePersonalCalculationAsOf()
  const queryClient = useQueryClient()
  const asOf = calculationAsOf(
    typeof repos.reset === 'function' ? 'demo' : 'personal',
    personalAsOf,
  )

  const { data: profile } = useProfileQuery(repos.userProfileRepository, activeUser)
  const thresholdAmount = profile?.userThresholdAmount

  useQuery({
    queryKey: [
      'userThresholdInsightEvaluation',
      obligation?.id,
      activeUser,
      gapAmount?.toStorageString(),
      thresholdAmount,
      asOf,
    ],
    queryFn: async () => {
      if (!activeUser || !obligation || !gapAmount || thresholdAmount === undefined) return null
      const service = new InsightEvaluationService(
        repos.insightRepository,
        new CalculationService(repos.calculationRunRepository),
      )
      const result = await service.evaluateUserThreshold(
        activeUser,
        obligation.id,
        gapAmount,
        Money.of(thresholdAmount, obligation.currency),
        asOf,
      )
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: insightKeys.list(activeUser) })
      }
      return null
    },
    enabled: !!activeUser && !!obligation && !!gapAmount && thresholdAmount !== undefined,
    staleTime: Infinity,
  })
}
