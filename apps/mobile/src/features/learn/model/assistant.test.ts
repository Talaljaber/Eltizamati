import { createLearningAssistantRequest, validateLearningAssistantResponse } from './assistant'

describe('createLearningAssistantRequest', () => {
  it('privacy: serializes only question, language, and temporary public comparison IDs', () => {
    const payload = createLearningAssistantRequest({ question: 'What fees should I check?', language: 'en', productIds: ['hbtf-automated-personal'], sourceIds: ['hbtf-rates-2026'] })
    expect(JSON.stringify(payload)).not.toMatch(/email|phone|token|obligation|account|payment|userId/i)
    expect(payload).toEqual({ question: 'What fees should I check?', language: 'en', comparison: { productIds: ['hbtf-automated-personal'], sourceIds: ['hbtf-rates-2026'] } })
  })

  it('grounding: rejects unsupported numbers and source IDs', () => {
    const response = { answer: 'The published rate is 8.50%.', comparison: null, assumptions: [], unknowns: [], questionsToAskTheBank: [], sourceIds: ['hbtf-rates-2026'], disclaimer: 'Confirm final terms.', status: 'answered' as const }
    expect(validateLearningAssistantResponse(response, { sourceIds: ['hbtf-rates-2026'], numericValues: ['8.50'] })).toBe(true)
    expect(validateLearningAssistantResponse({ ...response, answer: 'The published rate is 7.00%.' }, { sourceIds: ['hbtf-rates-2026'], numericValues: ['8.50'] })).toBe(false)
    expect(validateLearningAssistantResponse({ ...response, sourceIds: ['unknown'] }, { sourceIds: ['hbtf-rates-2026'], numericValues: ['8.50'] })).toBe(false)
  })
})
