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
    if (error) return err(makeError('storage', { cause: error }))
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
    if (error) return err(makeError('storage', { cause: error }))
    return ok(scheduleProposalRowToDomain(data))
  }
}
