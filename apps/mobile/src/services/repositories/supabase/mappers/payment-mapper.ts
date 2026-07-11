/**
 * payments row <-> Payment mapper. `amount`/`alloc_principal`/`alloc_cost`
 * are generated-type `number` columns — always routed through a decimal
 * string before reaching Money.of, for the same float-precision reason as
 * rate-period-mapper.ts's `annual_rate` handling.
 */
import { brandId, DomainInvariantError, Money, toLocalDate, type Payment } from '@eltizamati/domain'
import type { Database } from '../../../../core/supabase/database.types'
import { jsonToProvenance, provenanceToJson } from './provenance-json'

type PaymentRow = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']

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

export function paymentDomainToRow(payment: Payment): PaymentInsert {
  return {
    id: payment.id,
    obligation_id: payment.obligationId,
    user_id: payment.userId,
    paid_on: payment.date,
    amount: Number(payment.amount.toStorageString()),
    alloc_principal: payment.allocation
      ? Number(payment.allocation.principal.toStorageString())
      : null,
    alloc_cost: payment.allocation ? Number(payment.allocation.cost.toStorageString()) : null,
    alloc_source: payment.allocation ? payment.allocation.allocationSource : null,
    provenance_json: provenanceToJson(payment.provenance),
    period_ref: payment.periodRef ?? null,
    created_at: payment.createdAt,
  }
}
