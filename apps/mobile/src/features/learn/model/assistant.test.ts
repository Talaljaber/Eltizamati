import { createLearningAssistantRequest } from './assistant'

describe('createLearningAssistantRequest', () => {
  it('privacy: serializes only question, language, and temporary public comparison IDs', () => {
    const payload = createLearningAssistantRequest({ question: 'What fees should I check?', language: 'en', productIds: ['hbtf-automated-personal'], sourceIds: ['hbtf-rates-2026'] })
    expect(JSON.stringify(payload)).not.toMatch(/email|phone|token|obligation|account|payment|userId/i)
    expect(payload).toEqual({ question: 'What fees should I check?', language: 'en', comparison: { productIds: ['hbtf-automated-personal'], sourceIds: ['hbtf-rates-2026'] } })
  })
})
