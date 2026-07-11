/**
 * Query keys for home and obligations features — Phase 5.
 * Centralized per system-architecture.md §4 (no ad-hoc string keys).
 */

export const obligationKeys = {
  all: ['obligations'] as const,
  list: (userId: string) => ['obligations', 'list', userId] as const,
  detail: (id: string) => ['obligations', 'detail', id] as const,
} as const

export const paymentKeys = {
  listFor: (obligationId: string) => ['payments', 'listFor', obligationId] as const,
} as const

export const insightKeys = {
  all: ['insights'] as const,
  list: (userId: string) => ['insights', 'list', userId] as const,
} as const

export const ratePeriodKeys = {
  historyFor: (obligationId: string) => ['ratePeriods', 'historyFor', obligationId] as const,
} as const
