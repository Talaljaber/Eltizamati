import { calculationAsOf } from '../calculation-as-of'
import { DEMO_DATE } from '@eltizamati/demo-data'
import type { Obligation } from '@eltizamati/domain'

function obligationWithSource(source: 'demo' | 'userEntered'): Obligation {
  return {
    provenance: {
      source,
      observedAt: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    },
  } as Obligation
}

describe('calculationAsOf', () => {
  it('keeps demo calculations anchored to the canonical demo date', () => {
    expect(calculationAsOf(obligationWithSource('demo'), new Date('2030-01-01T12:00:00Z'))).toBe(
      DEMO_DATE,
    )
  })

  it('uses an explicit current local date for personal data', () => {
    expect(
      calculationAsOf(obligationWithSource('userEntered'), new Date(2026, 7, 9, 12, 0, 0)),
    ).toBe('2026-08-09')
  })
})
