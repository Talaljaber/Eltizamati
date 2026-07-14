/**
 * Query keys for home and obligations features — Phase 5.
 * Centralized per system-architecture.md §4 (no ad-hoc string keys).
 */

export const obligationKeys = {
  all: ['obligations'] as const,
  list: (userId: string) => ['obligations', 'list', userId] as const,
  detail: (userId: string, id: string) => ['obligations', 'detail', userId, id] as const,
} as const

export const paymentKeys = {
  listFor: (userId: string, obligationId: string) => ['payments', 'listFor', userId, obligationId] as const,
} as const

export const insightKeys = {
  all: ['insights'] as const,
  list: (userId: string) => ['insights', 'list', userId] as const,
} as const

export const ratePeriodKeys = {
  historyFor: (userId: string, obligationId: string) =>
    ['ratePeriods', 'historyFor', userId, obligationId] as const,
} as const
