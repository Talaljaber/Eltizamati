import { getSupabaseClient } from '@/core/supabase/client'
import { err, makeError, ok, type Result, type AppError } from '@eltizamati/domain'
import type {
  LearningAssistantGateway,
  LearningAssistantRequest,
  LearningAssistantResponse,
} from './assistant'

export class SupabaseLearningAssistantGateway implements LearningAssistantGateway {
  async answer(
    request: LearningAssistantRequest,
  ): Promise<Result<LearningAssistantResponse, AppError>> {
    const clientResult = getSupabaseClient()
    if (!clientResult.ok) return clientResult
    const { data, error } = await clientResult.value.functions.invoke<LearningAssistantResponse>(
      'learn-assistant',
      { body: request },
    )
    if (error !== null || data === null) {
      return err(makeError('providerUnavailable', { recoveryHint: 'Retry the assistant request.' }))
    }
    return ok(data)
  }
}
