import { describe, expect, it } from 'vitest'
import { classifyDataQuality } from './data-quality'

describe('classifyDataQuality', () => {
  it('returns undefined for no contributing sources', () => {
    expect(classifyDataQuality([])).toBeUndefined()
  })

  it('labels official/bureau/demo as official', () => {
    expect(classifyDataQuality(['official'])).toBe('official')
    expect(classifyDataQuality(['bureau'])).toBe('official')
    expect(classifyDataQuality(['demo'])).toBe('official')
    expect(classifyDataQuality(['official', 'bureau', 'demo'])).toBe('official')
  })

  it('labels userEntered', () => {
    expect(classifyDataQuality(['userEntered'])).toBe('userEntered')
  })

  it('labels estimate as estimated', () => {
    expect(classifyDataQuality(['estimate'])).toBe('estimated')
  })

  it('labels a mix of buckets as mixed', () => {
    expect(classifyDataQuality(['official', 'userEntered'])).toBe('mixed')
    expect(classifyDataQuality(['demo', 'estimate'])).toBe('mixed')
    expect(classifyDataQuality(['official', 'userEntered', 'estimate'])).toBe('mixed')
  })
})
