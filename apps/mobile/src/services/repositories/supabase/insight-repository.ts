import type { SupabaseClient } from '@supabase/supabase-js'
import {
  err,
  ok,
  makeError,
  type Result,
  type AppError,
  type Id,
  type Insight,
  type InsightRepository,
} from '@eltizamati/domain'
import type { Database } from '../../../core/supabase/database.types'
import { insightDomainToRow, insightRowToDomain } from './mappers/insight-mapper'

function toStorageAppError(error: { code: string; message: string }): AppError {
  return makeError('storage', { safeMetadata: { postgresErrorCode: error.code }, cause: error })
}

export class SupabaseInsightRepository implements InsightRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: Id<'user'>): Promise<Result<readonly Insight[], AppError>> {
    const { data, error } = await this.client
      .from('insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) return err(toStorageAppError(error))
    return ok(data.map(insightRowToDomain))
  }

  async markRead(id: Id<'insight'>): Promise<Result<void, AppError>> {
    const { error } = await this.client
      .from('insights')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return err(toStorageAppError(error))
    return ok(undefined)
  }

  async raise(insight: Insight): Promise<Result<Insight, AppError>> {
    const { data, error } = await this.client
      .from('insights')
      .insert(insightDomainToRow(insight))
      .select('*')
      .single()
    if (error) return err(toStorageAppError(error))
    return ok(insightRowToDomain(data))
  }
}
