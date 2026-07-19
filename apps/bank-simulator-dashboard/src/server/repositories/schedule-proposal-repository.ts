import { err, makeError, ok, type AppError, type Result } from '@eltizamati/domain'
import { getServiceRoleSupabaseClient } from '../supabase/client'
import type { Database } from '../supabase/database.types'

export type ScheduleProposalRow = Database['public']['Tables']['loan_schedule_proposals']['Row']

// Reads across all personal accounts (the demo allowlist has been removed).
export async function listAllowlistedScheduleProposals(): Promise<
  Result<readonly ScheduleProposalRow[], AppError>
> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value
    .from('loan_schedule_proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error !== null) {
    return err(
      makeError('storage', {
        safeMetadata: { postgresErrorCode: error.code },
        cause: error,
      }),
    )
  }
  return ok(data)
}

export async function decideScheduleProposal(input: {
  readonly proposalId: string
  readonly decision: 'approved' | 'rejected'
  readonly reason: string | undefined
}): Promise<Result<ScheduleProposalRow, AppError>> {
  const clientResult = getServiceRoleSupabaseClient()
  if (!clientResult.ok) return clientResult

  const { data, error } = await clientResult.value.rpc('demo_decide_schedule_proposal', {
    p_proposal_id: input.proposalId,
    p_decision: input.decision,
    p_reason: input.reason ?? null,
  })
  if (error !== null) {
    return err(
      makeError('storage', {
        safeMetadata: { postgresErrorCode: error.code },
        cause: error,
      }),
    )
  }
  return ok(data)
}
