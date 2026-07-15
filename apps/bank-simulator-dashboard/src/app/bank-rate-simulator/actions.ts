'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError, Rate, localDateFromDate, toLocalDate } from '@eltizamati/domain'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import { evaluateRateCampaignEligibility } from '@/server/rate-campaign-eligibility'
import { getUserEmailsByUserId } from '@/server/auth-admin'
import {
  publishCampaign,
  type PublishCampaignRequest,
} from '@/server/rate-campaign-publish-service'
import type { ServicingPolicy } from '@/server/impact-preview-service'

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.length === 0) {
    throw new DomainInvariantError(
      'validation',
      `bank-rate-simulator publish action: missing required field "${key}"`,
    )
  }
  return value
}

export async function publishCampaignAction(formData: FormData): Promise<void> {
  const institutionName = requiredString(formData, 'institution')
  const newAnnualRateInput = requiredString(formData, 'newAnnualRate')
  const effectiveDateInput = requiredString(formData, 'effectiveDate')
  const servicingPolicy = requiredString(formData, 'servicingPolicy') as ServicingPolicy
  const campaignName = requiredString(formData, 'campaignName')
  const emailNotificationEnabled = formData.get('emailNotificationEnabled') === 'on'
  const reason = formData.get('reason')
  const sourceNote = formData.get('sourceNote')

  const today = localDateFromDate(new Date())

  const obligationsResult = await listAllowlistedObligations()
  if (!obligationsResult.ok) {
    redirect('/bank-rate-simulator?publishError=couldNotLoadData')
  }

  const eligibility = evaluateRateCampaignEligibility(obligationsResult.value, institutionName)
  const recipientEmailByUserId = emailNotificationEnabled
    ? await getUserEmailsByUserId(eligibility.eligible.map((t) => t.obligation.userId))
    : new Map<string, string>()

  const request: PublishCampaignRequest = {
    campaignName,
    institutionName,
    reason: typeof reason === 'string' && reason.length > 0 ? reason : undefined,
    sourceNote: typeof sourceNote === 'string' && sourceNote.length > 0 ? sourceNote : undefined,
    newAnnualRate: Rate.fromPercent(newAnnualRateInput),
    effectiveDate: toLocalDate(effectiveDateInput),
    servicingPolicy,
    emailNotificationEnabled,
    recipientEmailByUserId,
    asOf: today,
  }

  const result = await publishCampaign(request)

  if (!result.ok) {
    redirect(`/bank-rate-simulator?publishError=${encodeURIComponent(result.reason)}`)
  }

  redirect(`/activity-log?campaignId=${result.value.campaignId}`)
}
