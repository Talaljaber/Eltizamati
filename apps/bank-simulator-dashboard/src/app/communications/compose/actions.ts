'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError } from '@eltizamati/domain'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { sendCustomEmail } from '@/server/email/gateway'
import {
  recordActivity,
  type DemoActivityEventType,
} from '@/server/repositories/demo-activity-repository'
import { generateUuid } from '@/server/ids'

const MAX_SUBJECT_LENGTH = 200
const MAX_BODY_LENGTH = 5000

function requiredString(formData: FormData, key: string, maxLength: number): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainInvariantError('validation', `compose action: missing required field "${key}"`)
  }
  return value.trim().slice(0, maxLength)
}

export async function sendCustomEmailAction(formData: FormData): Promise<void> {
  const userId = requiredString(formData, 'userId', 200)
  const localeInput = formData.get('locale')
  const locale = localeInput === 'ar' ? 'ar' : 'en'
  const subject = requiredString(formData, 'subject', MAX_SUBJECT_LENGTH)
  const body = requiredString(formData, 'body', MAX_BODY_LENGTH)

  // Re-resolve from the allowlisted profile set rather than trusting a
  // client-supplied email — the only address this can ever send to is the
  // one already on file for an allowlisted account (docs/dashboard.md §6/§11).
  const profilesResult = await listAllowlistedProfiles()
  const profile = profilesResult.ok
    ? profilesResult.value.find((p) => p.userId === userId)
    : undefined

  if (profile === undefined || profile.email === undefined) {
    await recordActivity(
      'operation_failed',
      'Compose message failed — no allowlisted profile or email on file for the selected client.',
    )
    redirect('/communications/compose?sent=noEmailOnFile')
  }

  const result = await sendCustomEmail({
    userId: profile.userId,
    recipientEmail: profile.email,
    locale,
    subject,
    body,
    idempotencyKey: `custom:${generateUuid()}`,
  })

  const activityByStatus: Record<string, DemoActivityEventType> = {
    sent: 'email_sent',
    queued: 'email_queued',
    preview: 'email_queued',
    suppressed: 'email_suppressed',
    'sending-disabled': 'email_queued',
    failed: 'operation_failed',
  }
  await recordActivity(
    activityByStatus[result.status] ?? 'operation_failed',
    `Compose message ${result.status} for an allowlisted client.`,
  )

  redirect(`/communications/compose?sent=${result.status}`)
}
