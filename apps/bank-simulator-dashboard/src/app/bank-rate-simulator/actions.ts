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
import { ALL_INSTITUTIONS } from '@/server/rate-campaign-constants'
import { listBenchmarkSimulations } from '@/server/repositories/demo-benchmark-repository'

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
  const institutionInput = requiredString(formData, 'institution')
  const marginInput = requiredString(formData, 'margin')
  const effectiveDateInput = requiredString(formData, 'effectiveDate')
  const campaignNameInput = requiredString(formData, 'campaignName')
  const emailNotificationEnabled = formData.get('emailNotificationEnabled') === 'on'
  const reason = formData.get('reason')
  const sourceNote = formData.get('sourceNote')

  const today = localDateFromDate(new Date())
  const effectiveDate = toLocalDate(effectiveDateInput)
  const applyToAll = institutionInput === ALL_INSTITUTIONS

  // Re-fetch the CBJ benchmark server-side rather than trusting a hidden form
  // field for it — the bank only ever chooses the margin; the benchmark
  // itself is read-only and always the latest one the CBJ page recorded.
  const benchmarkResult = await listBenchmarkSimulations()
  const latestBenchmark = benchmarkResult.ok ? benchmarkResult.value[0] : undefined
  if (latestBenchmark === undefined) {
    redirect('/bank-rate-simulator?publishError=noBenchmark')
  }
  const benchmarkRate = Rate.fromPercent(String(latestBenchmark.newRatePercent))
  const margin = Rate.fromPercent(marginInput)
  const newAnnualRate = benchmarkRate.plus(margin)

  const obligationsResult = await listAllowlistedObligations()
  if (!obligationsResult.ok) {
    redirect('/bank-rate-simulator?publishError=couldNotLoadData')
  }

  const eligibility = evaluateRateCampaignEligibility(
    obligationsResult.value,
    applyToAll ? undefined : institutionInput,
    effectiveDate,
  )
  const recipientEmailByUserId = emailNotificationEnabled
    ? await getUserEmailsByUserId(eligibility.eligible.map((t) => t.obligation.userId))
    : new Map<string, string>()

  const baseRequest: Omit<PublishCampaignRequest, 'campaignName' | 'institutionName'> = {
    reason: typeof reason === 'string' && reason.length > 0 ? reason : undefined,
    sourceNote: typeof sourceNote === 'string' && sourceNote.length > 0 ? sourceNote : undefined,
    newAnnualRate,
    benchmarkRate,
    margin,
    effectiveDate,
    servicingPolicy: 'unchanged',
    emailNotificationEnabled,
    recipientEmailByUserId,
    asOf: today,
  }

  if (!applyToAll) {
    const result = await publishCampaign({
      ...baseRequest,
      campaignName: campaignNameInput,
      institutionName: institutionInput,
    })
    if (!result.ok) {
      redirect(`/bank-rate-simulator?publishError=${encodeURIComponent(result.reason)}`)
    }
    redirect(`/activity-log?campaignId=${result.value.campaignId}`)
  }

  // "Apply to all banks": fan out into one atomic publish per distinct
  // institution among the eligible loans — demo_publish_rate_campaign is
  // scoped to a single institution per campaign row by design, so this
  // reuses that exact same safe, atomic path once per institution rather
  // than attempting a wider (and unproven) multi-institution transaction.
  const institutionNames = [
    ...new Set(eligibility.eligible.map((e) => e.obligation.institution.name)),
  ]
  if (institutionNames.length === 0) {
    redirect('/bank-rate-simulator?publishError=noEligibleLoans')
  }

  let successCount = 0
  let lastCampaignId: string | undefined
  for (const institutionName of institutionNames) {
    const result = await publishCampaign({
      ...baseRequest,
      campaignName: `${campaignNameInput} — ${institutionName}`,
      institutionName,
    })
    if (result.ok) {
      successCount += 1
      lastCampaignId = result.value.campaignId
    }
  }

  if (successCount === 0) {
    redirect('/bank-rate-simulator?publishError=allInstitutionsFailed')
  }
  redirect(
    lastCampaignId !== undefined ? `/activity-log?campaignId=${lastCampaignId}` : '/activity-log',
  )
}
