/** Query keys for the loan-application feature (no ad-hoc string keys — system-architecture.md §4). */
export const loanApplicationKeys = {
  all: ['loanApplications'] as const,
  list: (userId: string) => ['loanApplications', 'list', userId] as const,
} as const
