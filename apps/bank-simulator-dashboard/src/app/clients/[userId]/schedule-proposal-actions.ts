'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError } from '@eltizamati/domain'
import { listAllowlistedProfiles } from '@/server/repositories/profile-repository'
import { listAllowlistedObligations } from '@/server/repositories/obligation-repository'
import {
  decideScheduleProposal,
  listAllowlistedScheduleProposals,
} from '@/server/repositories/schedule-proposal-repository'
import { sendScheduleProposalDecisionEmail } from '@/server/email/gateway'
import { recordActivity } from '@/server/repositories/demo-activity-repository'

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainInvariantError('validation', `schedule proposal action: missing "${key}"`)
  }
  return value.trim()
}

export async function decideScheduleProposalAction(formData: FormData): Promise<void> {
  const proposalId = requiredString(formData, 'proposalId')
  const decision = requiredString(formData, 'decision') === 'approve' ? 'approved' : 'rejected'
  const suppliedReason = formData.get('decisionReason')
  const reason =
    typeof suppliedReason === 'string' && suppliedReason.trim().length > 0
      ? suppliedReason.trim()
      : undefined

  const proposalsResult = await listAllowlistedScheduleProposals()
  const proposal = proposalsResult.ok
    ? proposalsResult.value.find((candidate) => candidate.id === proposalId)
    : undefined
  if (proposal === undefined || proposal.status !== 'pending') {
    await recordActivity(
      'operation_failed',
      'Schedule proposal decision failed: proposal was unavailable or no longer pending.',
    )
    redirect('/clients?proposalDecision=notFound')
  }
  if (decision === 'rejected' && reason === undefined) {
    redirect(`/clients/${proposal.user_id}?proposalDecision=reasonRequired`)
  }

  const result = await decideScheduleProposal({ proposalId, decision, reason })
  if (!result.ok) {
    await recordActivity('operation_failed', `Schedule proposal ${decision} decision failed.`)
    redirect(`/clients/${proposal.user_id}?proposalDecision=error`)
  }

  const profilesResult = await listAllowlistedProfiles()
  const profile = profilesResult.ok
    ? profilesResult.value.find((candidate) => candidate.userId === proposal.user_id)
    : undefined
  if (profile?.email !== undefined) {
    const obligationsResult = await listAllowlistedObligations()
    const obligationNickname = obligationsResult.ok
      ? (obligationsResult.value.find((item) => item.id === proposal.obligation_id)?.nickname ??
        'your loan')
      : 'your loan'
    const email = await sendScheduleProposalDecisionEmail({
      proposalId,
      userId: proposal.user_id,
      recipientEmail: profile.email,
      locale: profile.locale === 'ar' ? 'ar' : 'en',
      idempotencyKey: `schedule-proposal:${proposalId}:${decision}`,
      params: {
        obligationNickname,
        decision,
        proposedInstallment: String(proposal.proposed_installment),
        finalBalloon: String(proposal.final_balloon),
        currency: proposal.currency,
        reason,
      },
    })
    await recordActivity(
      email.status === 'sent' ? 'email_sent' : 'email_suppressed',
      `Schedule proposal decision email ${email.status} for an allowlisted client.`,
    )
  }

  redirect(`/clients/${proposal.user_id}?proposalDecision=${decision}`)
}
