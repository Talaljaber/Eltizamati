/**
 * Payment reads across all personal accounts (the demo allowlist has been
 * removed). Currency is looked up per-obligation from the caller (mirrors
 * mobile's repository, which resolves currency the same way — payments rows
 * carry no currency column of their own).
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
import { getServiceRoleSupabaseClient } from '../supabase/client'
import { paymentRowToDomain } from '../mappers/payment-mapper'

export async function listAllowlistedPayments(
  obligations: readonly Obligation[],
): Promise<Result<readonly Payment[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.from('payments').select('*')

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

/**
 * The bank's only way to log a payment — official (bank-connected) loans
 * reject direct customer writes (payments_authority_guard trigger), so this
 * RPC is the sole path. Mirrors the mobile app's ObligationService.logPayment
 * for personal loans.
 */
export async function recordBankPayment(input: {
  readonly obligationId: string
  readonly amount: string
  readonly paidOn: string
}): Promise<Result<void, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { error } = await clientResult.value.rpc('record_bank_payment', {
    p_obligation_id: input.obligationId,
    p_amount: Number(input.amount),
    p_paid_on: input.paidOn,
  })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }
  return ok(undefined)
}
