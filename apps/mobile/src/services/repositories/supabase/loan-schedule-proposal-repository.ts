import type { SupabaseClient } from '@supabase/supabase-js'
import {
  brandId,
  err,
  makeError,
  ok,
  type AppError,
  type Id,
  type LoanScheduleProposal,
  type LoanScheduleProposalDraft,
  type LoanScheduleProposalRepository,
  type Result,
} from '@eltizamati/domain'
import type { Database } from '@/core/supabase/database.types'
import { generateUuid } from '@/core/ids/generate-uuid'
import { toSupabaseAppError } from '@/core/supabase/supabase-error'
import {
  scheduleProposalDraftToRow,
  scheduleProposalRowToDomain,
} from './mappers/loan-schedule-proposal-mapper'

export class SupabaseLoanScheduleProposalRepository implements LoanScheduleProposalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listFor(
    userId: Id<'user'>,
    obligationId: Id<'obligation'>,
  ): Promise<Result<readonly LoanScheduleProposal[], AppError>> {
    const { data, error } = await this.client
      .from('loan_schedule_proposals')
      .select('*')
      .eq('user_id', userId)
      .eq('obligation_id', obligationId)
      .order('created_at', { ascending: false })
    if (error) return err(toSupabaseAppError(error))
    return ok(data.map(scheduleProposalRowToDomain))
  }

  async submit(
    userId: Id<'user'>,
    draft: LoanScheduleProposalDraft,
  ): Promise<Result<LoanScheduleProposal, AppError>> {
    const id = brandId<'loanScheduleProposal'>(generateUuid())
    const { data, error } = await this.client
      .from('loan_schedule_proposals')
      .insert(scheduleProposalDraftToRow(id, userId, draft))
      .select('*')
      .single()
    if (error) {
      // Postgres unique_violation on loan_schedule_proposals_one_pending_idx
      // (supabase/migrations/20260718084829) — the one failure mode with a
      // precise, known application meaning; everything else routes through
      // the shared classifier rather than guessing a cause the UI can't
      // actually confirm.
      if (error.code === '23505') {
        return err(makeError('validation', { safeMetadata: { reason: 'alreadyPending' }, cause: error }))
      }
      return err(toSupabaseAppError(error))
    }
    return ok(scheduleProposalRowToDomain(data))
  }

  async selfApprove(
    _userId: Id<'user'>,
    proposalId: Id<'loanScheduleProposal'>,
  ): Promise<Result<LoanScheduleProposal, AppError>> {
    const { data, error } = await this.client.rpc('self_decide_schedule_proposal', {
      p_proposal_id: proposalId,
    })
    if (error) return err(toSupabaseAppError(error))
    return ok(scheduleProposalRowToDomain(data))
  }
}
