/**
 * insights row -> Insight mapper (read-only). Mirrors
 * apps/mobile/.../mappers/insight-mapper.ts's `insightRowToDomain`. The
 * dashboard reads insights the mobile app (or, from Phase 4, its own
 * publish flow) already raised — it never fabricates one here.
 */
import {
  brandId,
  DomainInvariantError,
  type Insight,
  type InsightSeverity,
} from '@eltizamati/domain'
import type { Database, Json } from '../supabase/database.types'

type InsightRow = Database['public']['Tables']['insights']['Row']

function toSeverity(value: string): InsightSeverity {
  if (value === 'info' || value === 'attention' || value === 'urgent' || value === 'positive') {
    return value
  }
  throw new DomainInvariantError('validation', `Unexpected insights.severity value: "${value}"`)
}

function paramsFromJson(value: Json | null): Readonly<Record<string, string | number>> | undefined {
  if (value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainInvariantError('validation', 'insights.params_json is not a plain object')
  }
  return value as unknown as Record<string, string | number>
}

export function insightRowToDomain(row: InsightRow): Insight {
  return {
    id: brandId<'insight'>(row.id),
    userId: brandId<'user'>(row.user_id),
    obligationId: row.obligation_id !== null ? brandId<'obligation'>(row.obligation_id) : undefined,
    ruleId: row.rule_id,
    severity: toSeverity(row.severity),
    titleKey: row.title_key,
    bodyKey: row.body_key,
    params: paramsFromJson(row.params_json),
    triggerHash: row.trigger_hash,
    deepLink: row.deep_link ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  }
}
