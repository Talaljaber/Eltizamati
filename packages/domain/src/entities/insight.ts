/**
 * Insight — domain-model.md §3.5. Dedup key = (ruleId, obligationId, triggerHash) — FR-INS-004.
 */
import type { Id } from '../value-objects/id.js'

export type InsightSeverity = 'info' | 'attention' | 'urgent' | 'positive'

export interface Insight {
  readonly id: Id<'insight'>
  readonly userId: Id<'user'>
  readonly ruleId: string
  readonly obligationId?: Id<'obligation'>
  readonly severity: InsightSeverity
  /** i18n keys — copy is never inlined in domain entities (AI_AGENT_RULES §8). */
  readonly titleKey: string
  readonly bodyKey: string
  readonly params?: Readonly<Record<string, string | number>>
  /** Hash of the trigger inputs — combines with (ruleId, obligationId) for dedup. */
  readonly triggerHash: string
  readonly deepLink?: string
  readonly readAt?: string
  readonly createdAt: string
}
