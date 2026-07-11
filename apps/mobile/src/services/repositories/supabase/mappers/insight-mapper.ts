import {
  brandId,
  DomainInvariantError,
  type Insight,
  type InsightSeverity,
} from '@eltizamati/domain'
import type { Database, Json } from '../../../../core/supabase/database.types'

type InsightRow = Database['public']['Tables']['insights']['Row']
type InsightInsert = Database['public']['Tables']['insights']['Insert']

const VALID_SEVERITIES: readonly InsightSeverity[] = ['info', 'attention', 'urgent', 'positive']

function toSeverity(value: string): InsightSeverity {
  if ((VALID_SEVERITIES as readonly string[]).includes(value)) return value as InsightSeverity
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
    ruleId: row.rule_id,
    obligationId: row.obligation_id !== null ? brandId<'obligation'>(row.obligation_id) : undefined,
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

export function insightDomainToRow(insight: Insight): InsightInsert {
  return {
    id: insight.id,
    user_id: insight.userId,
    rule_id: insight.ruleId,
    obligation_id: insight.obligationId ?? null,
    severity: insight.severity,
    title_key: insight.titleKey,
    body_key: insight.bodyKey,
    params_json: insight.params ? (insight.params as unknown as Json) : null,
    trigger_hash: insight.triggerHash,
    deep_link: insight.deepLink ?? null,
    read_at: insight.readAt ?? null,
    created_at: insight.createdAt,
  }
}
