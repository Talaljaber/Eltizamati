/**
 * INV-2: per payment, principal + cost = amount within the named CONV-5
 * per-period rounding tolerance. Only checked when an allocation is present —
 * unallocated payments are valid (allocation is optional pending
 * `allocationEstimate.v1`, Phase 6).
 */
import { err, ok, makeError, type Result, type AppError } from '../errors/app-error.js'
import type { Payment } from '../entities/payment.js'
import { conv5PerPeriodTolerance } from '../constants.js'

export function validatePaymentAllocation(payment: Payment): Result<void, AppError> {
  if (!payment.allocation) {
    return ok(undefined)
  }

  const { principal, cost } = payment.allocation
  const currency = payment.amount.currency
  const computed = principal.add(cost)
  const difference = computed.subtract(payment.amount).abs()
  const tolerance = conv5PerPeriodTolerance(currency)

  if (difference.isGreaterThan(tolerance)) {
    return err(
      makeError('validation', {
        safeMetadata: { field: 'allocation', reason: 'INV-2' },
        recoveryHint:
          'allocation.principal + allocation.cost must equal amount (within CONV-5 tolerance).',
      }),
    )
  }

  return ok(undefined)
}
