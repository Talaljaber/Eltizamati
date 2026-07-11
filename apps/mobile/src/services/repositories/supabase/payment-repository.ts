import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type Payment,
  type PaymentRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import { paymentDomainToRow, paymentRowToDomain } from './mappers/payment-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Payment rows don't carry their own currency (obligations.currency is the
   * source of truth — MVP is JOD-only, but Money always needs an explicit
   * currency), so this fetches the parent obligation's currency once before
   * mapping every payment row.
   */
  async listFor(obligationId: Id<'obligation'>): Promise<Result<readonly Payment[], AppError>> {
    const { data: obligation, error: obligationError } = await this.client
      .from('obligations')
      .select('currency')
      .eq('id', obligationId)
      .maybeSingle()
    if (obligationError) return err(toStorageAppError(obligationError))
    if (obligation === null) return err(makeError('notFound'))

    const { data, error } = await this.client
      .from('payments')
      .select('*')
      .eq('obligation_id', obligationId)
      .order('paid_on', { ascending: true })
    if (error) return err(toStorageAppError(error))
    return ok(data.map((row) => paymentRowToDomain(row, obligation.currency)))
  }

  async log(payment: Payment): Promise<Result<Payment, AppError>> {
    const { data: obligation, error: obligationError } = await this.client
      .from('obligations')
      .select('currency')
      .eq('id', payment.obligationId)
      .maybeSingle()
    if (obligationError) return err(toStorageAppError(obligationError))
    if (obligation === null) return err(makeError('notFound'))

    const { data, error } = await this.client
      .from('payments')
      .insert(paymentDomainToRow(payment))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(paymentRowToDomain(data, obligation.currency))
  }
}
