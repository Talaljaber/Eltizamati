/**
 * In-memory demo insight repository — Phase 5.
 * No Supabase imports.
 */

import {
  ok,
  err,
  makeError,
  type InsightRepository,
  type Insight,
  type Id,
  type Result,
  type AppError,
} from '@eltizamati/domain'

export class DemoInsightRepository implements InsightRepository {
  readonly #store = new Map<string, Insight>()

  async list(userId: Id<'user'>): Promise<Result<readonly Insight[], AppError>> {
    const insights = [...this.#store.values()].filter((i) => i.userId === userId)
    // Sort by createdAt descending (newest first)
    const sorted = insights.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(sorted)
  }

  async markRead(id: Id<'insight'>): Promise<Result<void, AppError>> {
    const insight = this.#store.get(id)
    if (!insight) {
      return err(makeError('notFound', { safeMetadata: { id } }))
    }
    // Demo uses a fixed non-wall-clock timestamp (no Date.now() per AI_AGENT_RULES §6)
    this.#store.set(id, { ...insight, readAt: '2026-07-01T00:00:00.000Z' })
    return ok(undefined)
  }

  async raise(insight: Insight): Promise<Result<Insight, AppError>> {
    this.#store.set(insight.id, insight)
    return ok(insight)
  }

  reset(): void {
    this.#store.clear()
  }
}
