import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type AppError,
  type Id,
  type LoanApplication,
  type LoanApplicationDraft,
  type LoanApplicationRepository,
  type Result,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import {
  loanApplicationDraftToRow,
  loanApplicationRowToDomain,
} from './mappers/loan-application-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabaseLoanApplicationRepository implements LoanApplicationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: Id<'user'>): Promise<Result<readonly LoanApplication[], AppError>> {
    const { data, error } = await this.client
      .from('loan_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) return err(toStorageAppError(error))
    return ok(data.map(loanApplicationRowToDomain))
  }

  async submit(
    userId: Id<'user'>,
    draft: LoanApplicationDraft,
  ): Promise<Result<LoanApplication, AppError>> {
    const { data, error } = await this.client
      .from('loan_applications')
      .insert(loanApplicationDraftToRow(userId, draft))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(loanApplicationRowToDomain(data))
  }
}
