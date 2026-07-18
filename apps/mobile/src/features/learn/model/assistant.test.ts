import { createLearningAssistantRequest, validateLearningAssistantResponse } from './assistant'

describe('createLearningAssistantRequest', () => {
  it('privacy: serializes only question, language, and temporary public comparison IDs', () => {
    const payload = createLearningAssistantRequest({
      question: 'What fees should I check?',
      language: 'en',
      productIds: ['hbtf-automated-personal'],
      sourceIds: ['hbtf-rates-2026'],
    })
    expect(JSON.stringify(payload)).not.toMatch(
      /email|phone|token|obligation|account|payment|userId/i,
    )
    expect(payload).toEqual({
      question: 'What fees should I check?',
      language: 'en',
      comparison: { productIds: ['hbtf-automated-personal'], sourceIds: ['hbtf-rates-2026'] },
      history: [],
    })
  })

  it('history: caps to the last 15 turns', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: `turn ${i}`,
    }))
    const payload = createLearningAssistantRequest({
      question: 'Next question',
      language: 'en',
      history,
    })
    expect(payload.history).toHaveLength(15)
    expect(payload.history[0]).toEqual({ role: 'assistant', text: 'turn 5' })
    expect(payload.history[14]).toEqual({ role: 'assistant', text: 'turn 19' })
  })

  it('grounding: rejects unsupported numbers and source IDs', () => {
    const response = {
      answer: 'The published rate is 8.50%.',
      comparison: null,
      assumptions: [],
      unknowns: [],
      questionsToAskTheBank: [],
      sourceIds: ['hbtf-rates-2026'],
      disclaimer: 'Confirm final terms.',
      status: 'answered' as const,
    }
    expect(
      validateLearningAssistantResponse(response, {
        sourceIds: ['hbtf-rates-2026'],
        numericValues: ['8.50'],
      }),
    ).toBe(true)
    expect(
      validateLearningAssistantResponse(
        { ...response, answer: 'The published rate is 7.00%.' },
        { sourceIds: ['hbtf-rates-2026'], numericValues: ['8.50'] },
      ),
    ).toBe(false)
    expect(
      validateLearningAssistantResponse(
        { ...response, sourceIds: ['unknown'] },
        { sourceIds: ['hbtf-rates-2026'], numericValues: ['8.50'] },
      ),
    ).toBe(false)
  })
})
