/**
 * payments row -> Payment mapper (read-only). Mirrors
 * apps/mobile/.../mappers/payment-mapper.ts's `paymentRowToDomain`.
 */
import { brandId, DomainInvariantError, Money, toLocalDate, type Payment } from '@eltizamati/domain'
import type { Database } from '../supabase/database.types'
import { jsonToProvenance } from './provenance-json'

type PaymentRow = Database['public']['Tables']['payments']['Row']

function toAllocationSource(value: string): 'official' | 'estimated' {
  if (value === 'official' || value === 'estimated') return value
  throw new DomainInvariantError('validation', `Unexpected payments.alloc_source value: "${value}"`)
}

export function paymentRowToDomain(row: PaymentRow, currency: string): Payment {
  const hasAllocation =
    row.alloc_principal !== null && row.alloc_cost !== null && row.alloc_source !== null

  return {
    id: brandId<'payment'>(row.id),
    obligationId: brandId<'obligation'>(row.obligation_id),
    userId: brandId<'user'>(row.user_id),
    date: toLocalDate(row.paid_on),
    amount: Money.of(String(row.amount), currency),
    allocation: hasAllocation
      ? {
          principal: Money.of(String(row.alloc_principal), currency),
          cost: Money.of(String(row.alloc_cost), currency),
          allocationSource: toAllocationSource(row.alloc_source as string),
        }
      : undefined,
    provenance: jsonToProvenance(row.provenance_json),
    periodRef: row.period_ref !== null ? brandId<'ratePeriod'>(row.period_ref) : undefined,
    createdAt: row.created_at,
  }
}
