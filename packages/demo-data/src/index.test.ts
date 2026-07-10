import { describe, it, expect } from 'vitest'
import { DEMO_DATE, DEMO_SEED_VERSION } from './constants.js'

describe('Demo data constants (M0 placeholder)', () => {
  it('exports a valid DEMO_DATE', () => {
    expect(DEMO_DATE).toBe('2026-07-01')
  })

  it('exports a seed version', () => {
    expect(DEMO_SEED_VERSION).toBe('v1')
  })
})
