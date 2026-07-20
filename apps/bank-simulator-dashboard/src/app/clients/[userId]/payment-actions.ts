'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError } from '@eltizamati/domain'
import { recordBankPayment } from '@/server/repositories/payment-repository'
import { recordActivity } from '@/server/repositories/demo-activity-repository'

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainInvariantError('validation', `payment action: missing "${key}"`)
  }
  return value.trim()
}

/**
 * The bank's only way to log a payment against an official (bank-connected)
 * loan — the payments_authority_guard trigger rejects a direct customer
 * write for these, so this server action's RPC call is the sole path.
 */
export async function recordBankPaymentAction(formData: FormData): Promise<void> {
  const obligationId = requiredString(formData, 'obligationId')
  const userId = requiredString(formData, 'userId')
  const amount = requiredString(formData, 'amount')
  const paidOn = requiredString(formData, 'paidOn')

  const result = await recordBankPayment({ obligationId, amount, paidOn })
  if (!result.ok) {
    await recordActivity('operation_failed', 'Recording a bank payment failed.')
    redirect(`/clients/${userId}?paymentRecorded=error`)
  }

  redirect(`/clients/${userId}?paymentRecorded=success`)
}
