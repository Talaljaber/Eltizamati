/**
 * Allowlist-gated payment reads. Currency is looked up per-obligation from
 * the caller (mirrors mobile's repository, which resolves currency the same
 * way — payments rows carry no currency column of their own).
 */
import {
  err,
  ok,
  makeError,
  type AppError,
  type Obligation,
  type Payment,
  type Result,
} from '@eltizamati/domain'
import { assertAllowlistConfigured } from '../allowlist'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { paymentRowToDomain } from '../mappers/payment-mapper'

export async function listAllowlistedPayments(
  obligations: readonly Obligation[],
): Promise<Result<readonly Payment[], AppError>> {
  const allowedUserIds = assertAllowlistConfigured()

  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('payments')
    .select('*')
    .in('user_id', allowedUserIds)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  const currencyByObligationId = new Map<string, string>(obligations.map((o) => [o.id, o.currency]))

  return ok(
    data.map((row) =>
      paymentRowToDomain(row, currencyByObligationId.get(row.obligation_id) ?? 'JOD'),
    ),
  )
}
