/**
 * Demo email outbox writes (docs/dashboard.md §12). Idempotency is the
 * unique constraint on `idempotency_key` itself — a duplicate insert is
 * treated as "already queued/sent", never a fresh send.
 */
import { err, ok, makeError, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import type { Database } from '../supabase/database.types'

export type EmailOutboxStatus = Database['public']['Tables']['demo_email_outbox']['Row']['status']

export interface QueueEmailInput {
  readonly campaignId: string | undefined
  readonly userId: string
  readonly locale: 'en' | 'ar'
  readonly recipientHash: string
  readonly recipientMasked: string
  readonly templateId: string
  readonly status: EmailOutboxStatus
  readonly idempotencyKey: string
  readonly safeErrorCode?: string
}

export interface EmailOutboxRow {
  readonly id: string
  readonly campaignId: string | null
  readonly userId: string
  readonly locale: string
  readonly recipientMasked: string
  readonly templateId: string
  readonly status: string
  readonly attemptCount: number
  readonly idempotencyKey: string
  readonly createdAt: string
  readonly sentAt: string | null
}

const UNIQUE_VIOLATION = '23505'

/**
 * Inserts a queued outbox row, or — if this idempotency key was already
 * processed — returns the existing row instead of erroring, so a retried
 * publish never sends a duplicate email.
 */
export async function queueEmail(
  input: QueueEmailInput,
): Promise<Result<EmailOutboxRow, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult
  const client = clientResult.value

  const { data, error } = await client
    .from('demo_email_outbox')
    .insert({
      campaign_id: input.campaignId ?? null,
      user_id: input.userId,
      locale: input.locale,
      recipient_hash: input.recipientHash,
      recipient_masked: input.recipientMasked,
      template_id: input.templateId,
      status: input.status,
      idempotency_key: input.idempotencyKey,
      safe_error_code: input.safeErrorCode ?? null,
    })
    .select('*')
    .single()

  if (error !== null) {
    if (error.code === UNIQUE_VIOLATION) {
      const existing = await client
        .from('demo_email_outbox')
        .select('*')
        .eq('idempotency_key', input.idempotencyKey)
        .single()
      if (existing.error !== null) {
        return err(
          makeError('storage', {
            safeMetadata: { postgresErrorCode: existing.error.code },
            cause: existing.error,
          }),
        )
      }
      return ok(toDomain(existing.data))
    }
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(toDomain(data))
}

export async function markEmailSent(id: string): Promise<Result<void, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { error } = await clientResult.value
    .from('demo_email_outbox')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }
  return ok(undefined)
}

export async function markEmailFailed(
  id: string,
  safeErrorCode: string,
): Promise<Result<void, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { error } = await clientResult.value
    .from('demo_email_outbox')
    .update({ status: 'failed', safe_error_code: safeErrorCode })
    .eq('id', id)

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }
  return ok(undefined)
}

export async function listEmailOutbox(): Promise<Result<readonly EmailOutboxRow[], AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('demo_email_outbox')
    .select('*')
    .order('created_at', { ascending: false })

  if (error !== null) {
    return err(
      makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error }),
    )
  }

  return ok(data.map(toDomain))
}

function toDomain(row: Database['public']['Tables']['demo_email_outbox']['Row']): EmailOutboxRow {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    userId: row.user_id,
    locale: row.locale,
    recipientMasked: row.recipient_masked,
    templateId: row.template_id,
    status: row.status,
    attemptCount: row.attempt_count,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }
}
