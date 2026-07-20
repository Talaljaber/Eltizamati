'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError, Rate } from '@eltizamati/domain'
import {
  decideLoanApplication,
  listAllowlistedLoanApplications,
} from '@/server/repositories/loan-application-repository'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import {
  emailActivityEventType,
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
} from '@/server/email/gateway'
import { recordActivity } from '@/server/repositories/demo-activity-repository'
import { generateUuid } from '@/server/ids'

const CURRENCY = 'JOD'

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainInvariantError('validation', `loan-application action: missing field "${key}"`)
  }
  return value.trim()
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function decideLoanApplicationAction(formData: FormData): Promise<void> {
  const applicationId = requiredString(formData, 'applicationId')
  const decisionInput = requiredString(formData, 'decision')
  const decision = decisionInput === 'approve' ? 'approve' : 'reject'

  // Resolve the applicant's own record so we know who this is, their locale,
  // and — for the email — their on-file address. Never trust a
  // client-supplied user id or email.
  const applicationsResult = await listAllowlistedLoanApplications()
  const application = applicationsResult.ok
    ? applicationsResult.value.find((a) => a.id === applicationId)
    : undefined
  if (application === undefined) {
    await recordActivity('operation_failed', 'Loan decision failed — application not found.')
    redirect('/loan-applications?decided=notFound')
  }

  const profilesResult = await listAllowlistedProfiles()
  const profile = profilesResult.ok
    ? profilesResult.value.find((p) => p.userId === application.userId)
    : undefined
  const locale = profile?.locale === 'ar' ? 'ar' : 'en'

  if (decision === 'reject') {
    const reason = requiredString(formData, 'decisionReason')
    const result = await decideLoanApplication({ applicationId, decision: 'reject', decisionReason: reason })
    if (!result.ok) {
      await recordActivity(
        'operation_failed',
        `Loan rejection failed (${String(result.error.safeMetadata?.['postgresErrorMessage'] ?? result.error.code)})`,
      )
      redirect('/loan-applications?decided=error')
    }
    if (profile?.email !== undefined) {
      const emailResult = await sendLoanRejectedEmail({
        userId: application.userId,
        recipientEmail: profile.email,
        locale,
        idempotencyKey: `loan-rejected:${applicationId}:${generateUuid()}`,
        params: { institutionName: application.institutionName, reason },
      })
      await recordActivity(
        emailActivityEventType(emailResult.status),
        `Loan rejection email: ${emailResult.status}`,
      )
    }
    redirect('/loan-applications?decided=rejected')
  }

  // approve
  const approvedAmount = optionalNumber(formData, 'approvedAmount')
  const approvedTermMonths = optionalNumber(formData, 'approvedTermMonths')
  const approvedRatePercentInput = requiredString(formData, 'approvedRatePercent')
  if (approvedAmount === undefined || approvedAmount <= 0 || approvedTermMonths === undefined || approvedTermMonths <= 0) {
    redirect('/loan-applications?decided=invalid')
  }

  let rate: Rate
  try {
    rate = Rate.fromPercent(approvedRatePercentInput)
  } catch (error) {
    if (error instanceof DomainInvariantError) redirect('/loan-applications?decided=invalid')
    throw error
  }

  const result = await decideLoanApplication({
    applicationId,
    decision: 'approve',
    approvedAmount: String(approvedAmount),
    approvedTermMonths,
    approvedAnnualRateDecimal: rate.toStorageString(),
  })
  if (!result.ok) {
    await recordActivity(
      'operation_failed',
      `Loan approval failed (${String(result.error.safeMetadata?.['postgresErrorMessage'] ?? result.error.code)})`,
    )
    redirect('/loan-applications?decided=error')
  }

  if (profile?.email !== undefined) {
    const emailResult = await sendLoanApprovedEmail({
      userId: application.userId,
      recipientEmail: profile.email,
      locale,
      idempotencyKey: `loan-approved:${applicationId}:${generateUuid()}`,
      params: {
        institutionName: application.institutionName,
        approvedAmount: String(approvedAmount),
        approvedTermMonths,
        approvedRatePercent: rate.toPercent().toFixed(3),
        currency: CURRENCY,
      },
    })
    await recordActivity(
      emailActivityEventType(emailResult.status),
      `Loan approval email: ${emailResult.status}`,
    )
  }

  redirect('/loan-applications?decided=approved')
}
