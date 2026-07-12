import { useQuery } from '@tanstack/react-query'
import type { Id, Insight } from '@eltizamati/domain'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import { useActiveUser } from '@/features/auth/hooks/use-active-user'

export interface InsightsViewModel {
  status: 'loading' | 'error' | 'success'
  insights: readonly Insight[]
}

export function useInsightsViewModel(obligationId?: Id<'obligation'>): InsightsViewModel {
  const repos = useRepositories()
  const activeUser = useActiveUser()

  // If obligationId is provided, filter for that obligation. Otherwise, all user insights.
  const { data: insights, isError } = useQuery({
    queryKey: ['insights', obligationId, activeUser],
    queryFn: async () => {
      if (!activeUser) return []
      const res = await repos.insightRepository.list(activeUser)
      if (!res.ok) throw res.error
      const all = res.value
      if (obligationId) {
        return all.filter((i) => i.obligationId === obligationId)
      }
      return all
    },
    enabled: !!activeUser,
  })

  if (isError) return { status: 'error', insights: [] }
  if (!insights) return { status: 'loading', insights: [] }

  return {
    status: 'success',
    insights,
  }
}
