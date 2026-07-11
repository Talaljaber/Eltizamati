/**
 * Provenance factory + priority/staleness tests (data-provenance.md §1–3).
 * Pre-existing utility functions with no prior coverage — filled in as part
 * of Phase 2's "provenance preservation" test requirement.
 */
import { describe, it, expect } from 'vitest'
import {
  userEntered,
  demoSourced,
  engineEstimate,
  isHigherPriority,
  isStale,
} from './provenance.js'

describe('provenance factories', () => {
  it('userEntered stamps the userEntered source class with matching observed/recorded timestamps', () => {
    const sourced = userEntered('123', '2026-06-01T00:00:00.000Z')
    expect(sourced.value).toBe('123')
    expect(sourced.provenance.source).toBe('userEntered')
    expect(sourced.provenance.providerId).toBe('manual')
    expect(sourced.provenance.observedAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('demoSourced stamps the demo source class with a seed version reference', () => {
    const sourced = demoSourced(
      Symbol('x') as unknown as string,
      'v1',
      '2026-01-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
    )
    expect(sourced.provenance.source).toBe('demo')
    expect(sourced.provenance.providerId).toBe('demo-seed')
    expect(sourced.provenance.sourceReference).toBe('v1')
  })

  it('engineEstimate stamps the estimate source class with the calculation run reference', () => {
    const sourced = engineEstimate(42, 'run-1', '2026-07-01T00:00:00.000Z')
    expect(sourced.provenance.source).toBe('estimate')
    expect(sourced.provenance.sourceReference).toBe('run-1')
  })
})

describe('isHigherPriority (BR-PROV-001)', () => {
  it('official outranks bureau, userEntered, and estimate', () => {
    expect(isHigherPriority('official', 'bureau')).toBe(true)
    expect(isHigherPriority('official', 'userEntered')).toBe(true)
    expect(isHigherPriority('official', 'estimate')).toBe(true)
  })

  it('estimate never outranks anything else', () => {
    expect(isHigherPriority('estimate', 'userEntered')).toBe(false)
    expect(isHigherPriority('estimate', 'official')).toBe(false)
  })

  it('equal priority is not higher priority', () => {
    expect(isHigherPriority('userEntered', 'demo')).toBe(false)
  })
})

describe('isStale (BR-PROV-003)', () => {
  const recent = {
    source: 'official' as const,
    observedAt: '2026-06-28T00:00:00.000Z',
    recordedAt: '2026-06-28T00:00:00.000Z',
  }
  const oldOfficial = {
    source: 'official' as const,
    observedAt: '2026-01-01T00:00:00.000Z',
    recordedAt: '2026-01-01T00:00:00.000Z',
  }
  const oldUserEntered = {
    source: 'userEntered' as const,
    observedAt: '2026-01-01T00:00:00.000Z',
    recordedAt: '2026-01-01T00:00:00.000Z',
  }

  it('official is stale after 7 days', () => {
    expect(isStale(oldOfficial, '2026-07-01T00:00:00.000Z')).toBe(true)
    expect(isStale(recent, '2026-07-01T00:00:00.000Z')).toBe(false)
  })

  it('userEntered is stale after 90 days', () => {
    expect(isStale(oldUserEntered, '2026-07-01T00:00:00.000Z')).toBe(true)
  })

  it('estimate is never stale (recomputed on input change)', () => {
    expect(
      isStale(
        {
          source: 'estimate',
          observedAt: '2020-01-01T00:00:00.000Z',
          recordedAt: '2020-01-01T00:00:00.000Z',
        },
        '2026-07-01T00:00:00.000Z',
      ),
    ).toBe(false)
  })

  it('bureau is never stale via this gate (always shown with an as-of date instead)', () => {
    expect(
      isStale(
        {
          source: 'bureau',
          observedAt: '2020-01-01T00:00:00.000Z',
          recordedAt: '2020-01-01T00:00:00.000Z',
        },
        '2026-07-01T00:00:00.000Z',
      ),
    ).toBe(false)
  })
})
