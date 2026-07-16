import { FINANCING_PRODUCTS } from './catalogue-snapshot'
import { comparePublishedProducts } from './comparison-service'

describe('comparePublishedProducts', () => {
  it('keeps incomplete published terms visible and never treats them as eligibility approval', () => {
    const results = comparePublishedProducts(FINANCING_PRODUCTS, {
      purpose: 'housing',
      structurePreference: 'islamic',
      salaryTransferPreference: 'no-preference',
      priorities: ['clearer-published-terms'],
    })
    expect(results).toHaveLength(1)
    expect(results[0]?.eligibilityState).toBe('unknown')
    expect(results[0]?.unknowns).toContain('some product fields')
    expect(results[0]?.matchedPreferences).toContain('financing structure')
  })
})
