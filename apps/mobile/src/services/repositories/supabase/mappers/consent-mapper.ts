/**
 * consent_records row <-> ConsentRecord mapper. `locale` is validated even
 * though the DB CHECK constraint already restricts it — see the identical
 * rationale in user-profile-mapper.ts.
 */
import { brandId, DomainInvariantError, type ConsentRecord } from '@eltizamati/domain'
import type { Database } from '../../../../core/supabase/database.types'

type ConsentRow = Database['public']['Tables']['consent_records']['Row']
type ConsentInsert = Database['public']['Tables']['consent_records']['Insert']

function toLocale(value: string): 'en' | 'ar' {
  if (value === 'en' || value === 'ar') return value
  throw new DomainInvariantError(
    'validation',
    `Unexpected consent_records.locale value: "${value}"`,
  )
}

export function consentRowToDomain(row: ConsentRow): ConsentRecord {
  return {
    id: brandId<'consentRecord'>(row.id),
    userId: brandId<'user'>(row.user_id),
    docType: row.doc_type,
    version: row.version,
    locale: toLocale(row.locale),
    acknowledgedAt: row.acknowledged_at,
  }
}

export function consentDomainToRow(record: ConsentRecord): ConsentInsert {
  return {
    id: record.id,
    user_id: record.userId,
    doc_type: record.docType,
    version: record.version,
    locale: record.locale,
    acknowledged_at: record.acknowledgedAt,
  }
}
