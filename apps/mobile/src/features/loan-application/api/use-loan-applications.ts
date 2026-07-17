import { useQuery } from '@tanstack/react-query'
import { isOk, type Id, type LoanApplicationRepository } from '@eltizamati/domain'
import { loanApplicationKeys } from './keys'

export function useLoanApplications(
  repository: LoanApplicationRepository,
  userId: Id<'user'>,
  isDemoMode = false,
) {
  return useQuery({
    queryKey: loanApplicationKeys.list(userId),
    queryFn: async () => {
      const result = await repository.list(userId)
      if (!isOk(result)) throw result.error
      return result.value
    },
    enabled: userId !== '',
    staleTime: isDemoMode ? Infinity : 30_000,
  })
}
