/**
 * EmailGateway (docs/dashboard.md §11). Three modes, derived purely from
 * config state — never a manual toggle a developer could forget to flip
 * back:
 *
 *   - `disabled`  — EMAIL_SENDING_ENABLED is not true. No network call ever.
 *   - `dev-sink`  — sending is enabled but Gmail SMTP isn't fully
 *                   configured. Logs the render and marks the outbox row
 *                   sent, without any network call — a safe local-dev mode.
 *   - `gmail`     — sending is enabled and SMTP_HOST/SMTP_USER/
 *                   SMTP_APP_PASSWORD are all set. Sends for real.
 *
 * The Gmail app password never appears in this file's own code, only
 * inside the transport config object nodemailer builds — never logged,
 * never persisted (the outbox schema has no column that could hold it).
 */
import nodemailer from 'nodemailer'
import { getDashboardEnv } from '../env'
import { isEmailRecipientAllowlisted } from '../allowlist'
import { logger } from '../logging/logger'
import {
  markEmailFailed,
  markEmailSent,
  queueEmail,
  type EmailOutboxStatus,
} from '../repositories/demo-email-outbox-repository'
import { hashEmail, maskEmail } from './masking'
import { renderRateChangeEmail, type RateChangeEmailParams } from './templates'

export type EmailMode = 'disabled' | 'dev-sink' | 'gmail'

export function resolveEmailMode(): EmailMode {
  const env = getDashboardEnv()
  if (!env.emailSendingEnabled) return 'disabled'
  const smtpConfigured =
    env.smtpHost.length > 0 && env.smtpUser.length > 0 && env.smtpAppPassword.length > 0
  return smtpConfigured ? 'gmail' : 'dev-sink'
}

export interface SendRateChangeEmailInput {
  readonly campaignId: string
  readonly userId: string
  readonly recipientEmail: string
  readonly locale: 'en' | 'ar'
  readonly params: RateChangeEmailParams
  readonly idempotencyKey: string
}

export interface SendEmailResult {
  readonly status: EmailOutboxStatus
  readonly outboxId: string | undefined
}

export async function sendRateChangeEmail(
  input: SendRateChangeEmailInput,
): Promise<SendEmailResult> {
  const mode = resolveEmailMode()
  const recipientHash = hashEmail(input.recipientEmail)
  const recipientMasked = maskEmail(input.recipientEmail)
  const templateId = `rate-change-${input.locale}`

  if (!isEmailRecipientAllowlisted(input.recipientEmail)) {
    const outbox = await queueEmail({
      campaignId: input.campaignId,
      userId: input.userId,
      locale: input.locale,
      recipientHash,
      recipientMasked,
      templateId,
      status: 'suppressed',
      idempotencyKey: input.idempotencyKey,
      safeErrorCode: 'recipientNotAllowlisted',
    })
    return { status: 'suppressed', outboxId: outbox.ok ? outbox.value.id : undefined }
  }

  if (mode === 'disabled') {
    const outbox = await queueEmail({
      campaignId: input.campaignId,
      userId: input.userId,
      locale: input.locale,
      recipientHash,
      recipientMasked,
      templateId,
      status: 'sending-disabled',
      idempotencyKey: input.idempotencyKey,
    })
    return { status: 'sending-disabled', outboxId: outbox.ok ? outbox.value.id : undefined }
  }

  const queued = await queueEmail({
    campaignId: input.campaignId,
    userId: input.userId,
    locale: input.locale,
    recipientHash,
    recipientMasked,
    templateId,
    status: 'queued',
    idempotencyKey: input.idempotencyKey,
  })
  if (!queued.ok) return { status: 'failed', outboxId: undefined }

  // Idempotency: queueEmail returns the EXISTING row on a duplicate
  // idempotency key, whatever its current status — if it was already sent,
  // this is a no-op, not a second send.
  if (queued.value.status === 'sent') {
    return { status: 'sent', outboxId: queued.value.id }
  }

  const rendered = renderRateChangeEmail(input.locale, input.params)

  if (mode === 'dev-sink') {
    logger.info('email dev-sink render', { outboxId: queued.value.id, templateId, recipientMasked })
    await markEmailSent(queued.value.id)
    return { status: 'sent', outboxId: queued.value.id }
  }

  try {
    const env = getDashboardEnv()
    const transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpAppPassword },
    })
    await transport.sendMail({
      from: `"${env.smtpSenderName}" <${env.smtpSenderEmail}>`,
      to: input.recipientEmail,
      subject: rendered.subject,
      text: rendered.text,
    })
    await markEmailSent(queued.value.id)
    return { status: 'sent', outboxId: queued.value.id }
  } catch (error) {
    logger.error('gmail send failed', { outboxId: queued.value.id })
    void error
    await markEmailFailed(queued.value.id, 'smtpSendFailed')
    return { status: 'failed', outboxId: queued.value.id }
  }
}
