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
import { setDefaultResultOrder } from 'node:dns'
import nodemailer from 'nodemailer'

// Some Windows/ISP networks resolve smtp.gmail.com to an IPv6 address whose
// outbound route silently hangs even though IPv4 connects fine — nodemailer
// doesn't expose a per-connection "force IPv4" option, so this reorders
// Node's own dns.lookup() results process-wide. Safe globally: this module
// is the only place in the app that makes outbound network connections.
setDefaultResultOrder('ipv4first')
import { getDashboardEnv } from '../env'
import { isRecipientConsented } from '../repositories/profile-repository'
import { logger } from '../logging/logger'
import type { DemoActivityEventType } from '../repositories/demo-activity-repository'
import {
  markEmailFailed,
  markEmailSent,
  queueEmail,
  type EmailOutboxStatus,
} from '../repositories/demo-email-outbox-repository'
import { hashEmail, maskEmail } from './masking'
import {
  renderCustomEmail,
  renderLoanApprovedEmail,
  renderLoanRejectedEmail,
  renderRateChangeEmail,
  renderScheduleProposalDecisionEmail,
  type LoanApprovedEmailParams,
  type LoanRejectedEmailParams,
  type RateChangeEmailParams,
  type RenderedEmail,
  type ScheduleProposalDecisionEmailParams,
} from './templates'

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

/**
 * Shared status -> activity-log event mapping so every call site logs the
 * same, honest event regardless of which of the four `sendXEmail` wrappers
 * it went through — the four call sites previously each picked their own ad
 * hoc binary split (e.g. "suppressed vs. everything else", "sent vs.
 * everything else"), which let a `sending-disabled` result surface under
 * whichever bucket a given call site happened to lump it into.
 */
export function emailActivityEventType(status: EmailOutboxStatus): DemoActivityEventType {
  if (status === 'sent') return 'email_sent'
  if (status === 'suppressed') return 'email_suppressed'
  if (status === 'failed') return 'operation_failed'
  return 'email_queued'
}

interface DeliverEmailInput {
  readonly campaignId: string | undefined
  readonly userId: string
  readonly recipientEmail: string
  readonly locale: 'en' | 'ar'
  readonly templateId: string
  readonly idempotencyKey: string
  readonly render: () => RenderedEmail
}

async function deliverEmail(input: DeliverEmailInput): Promise<SendEmailResult> {
  const mode = resolveEmailMode()
  const recipientHash = hashEmail(input.recipientEmail)
  const recipientMasked = maskEmail(input.recipientEmail)

  if (!(await isRecipientConsented(input.userId, input.recipientEmail))) {
    const outbox = await queueEmail({
      campaignId: input.campaignId,
      userId: input.userId,
      locale: input.locale,
      recipientHash,
      recipientMasked,
      templateId: input.templateId,
      status: 'suppressed',
      idempotencyKey: input.idempotencyKey,
      safeErrorCode: 'recipientNotConsented',
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
      templateId: input.templateId,
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
    templateId: input.templateId,
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

  const rendered = input.render()

  if (mode === 'dev-sink') {
    logger.info('email dev-sink render', {
      outboxId: queued.value.id,
      templateId: input.templateId,
      recipientMasked,
    })
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
    // SMTP error fields describe the protocol-level failure reason (auth
    // rejected, connection refused, …) and never contain the credentials
    // themselves — the SMTP server response text is what populates these,
    // not the outgoing auth payload — so they're safe to log.
    const smtp = error as {
      code?: unknown
      responseCode?: unknown
      command?: unknown
      message?: unknown
    }
    logger.error('gmail send failed', {
      outboxId: queued.value.id,
      smtpCode: typeof smtp.code === 'string' ? smtp.code : undefined,
      smtpResponseCode: typeof smtp.responseCode === 'number' ? smtp.responseCode : undefined,
      smtpCommand: typeof smtp.command === 'string' ? smtp.command : undefined,
      errorMessage:
        typeof smtp.message === 'string' ? smtp.message.slice(0, 300) : String(error).slice(0, 300),
    })
    await markEmailFailed(queued.value.id, 'smtpSendFailed')
    return { status: 'failed', outboxId: queued.value.id }
  }
}

export async function sendRateChangeEmail(
  input: SendRateChangeEmailInput,
): Promise<SendEmailResult> {
  return deliverEmail({
    campaignId: input.campaignId,
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    templateId: `rate-change-${input.locale}`,
    idempotencyKey: input.idempotencyKey,
    render: () => renderRateChangeEmail(input.locale, input.params),
  })
}

export interface SendCustomEmailInput {
  readonly userId: string
  readonly recipientEmail: string
  readonly locale: 'en' | 'ar'
  readonly subject: string
  readonly body: string
  readonly idempotencyKey: string
}

/** Operator-composed message from Communications → Compose — not tied to a campaign. */
export async function sendCustomEmail(input: SendCustomEmailInput): Promise<SendEmailResult> {
  return deliverEmail({
    campaignId: undefined,
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    templateId: `custom-${input.locale}`,
    idempotencyKey: input.idempotencyKey,
    render: () => renderCustomEmail(input.locale, { subject: input.subject, body: input.body }),
  })
}

export interface SendLoanDecisionEmailInput {
  readonly userId: string
  readonly recipientEmail: string
  readonly locale: 'en' | 'ar'
  readonly idempotencyKey: string
}

export async function sendLoanApprovedEmail(
  input: SendLoanDecisionEmailInput & { readonly params: LoanApprovedEmailParams },
): Promise<SendEmailResult> {
  return deliverEmail({
    campaignId: undefined,
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    templateId: `loan-approved-${input.locale}`,
    idempotencyKey: input.idempotencyKey,
    render: () => renderLoanApprovedEmail(input.locale, input.params),
  })
}

export async function sendLoanRejectedEmail(
  input: SendLoanDecisionEmailInput & { readonly params: LoanRejectedEmailParams },
): Promise<SendEmailResult> {
  return deliverEmail({
    campaignId: undefined,
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    templateId: `loan-rejected-${input.locale}`,
    idempotencyKey: input.idempotencyKey,
    render: () => renderLoanRejectedEmail(input.locale, input.params),
  })
}

export async function sendScheduleProposalDecisionEmail(
  input: SendLoanDecisionEmailInput & {
    readonly proposalId: string
    readonly params: ScheduleProposalDecisionEmailParams
  },
): Promise<SendEmailResult> {
  return deliverEmail({
    campaignId: undefined,
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    templateId: `schedule-proposal-${input.params.decision}-${input.locale}`,
    idempotencyKey: input.idempotencyKey,
    render: () => renderScheduleProposalDecisionEmail(input.locale, input.params),
  })
}
