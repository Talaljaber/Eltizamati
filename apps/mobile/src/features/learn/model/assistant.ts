export interface LearningAssistantRequest {
  readonly question: string
  readonly language: 'ar' | 'en'
  readonly comparison: { readonly productIds: readonly string[]; readonly sourceIds: readonly string[] } | null
}

export interface LearningAssistantResponse {
  readonly answer: string
  readonly comparison: { readonly title: string; readonly productIds: readonly string[]; readonly rankingBasis: readonly string[] } | null
  readonly assumptions: readonly string[]
  readonly unknowns: readonly string[]
  readonly questionsToAskTheBank: readonly string[]
  readonly sourceIds: readonly string[]
  readonly disclaimer: string
  readonly status: 'answered' | 'insufficient-verified-data' | 'needs-user-input' | 'refused'
}

export interface LearningAssistantGateway {
  answer(request: LearningAssistantRequest): Promise<LearningAssistantResponse>
}

/** Builds the only client-to-server assistant shape; user/account data has no path into it. */
export function createLearningAssistantRequest(input: { question: string; language: 'ar' | 'en'; productIds?: readonly string[]; sourceIds?: readonly string[] }): LearningAssistantRequest {
  return { question: input.question.trim().slice(0, 1200), language: input.language, comparison: input.productIds || input.sourceIds ? { productIds: input.productIds ?? [], sourceIds: input.sourceIds ?? [] } : null }
}
