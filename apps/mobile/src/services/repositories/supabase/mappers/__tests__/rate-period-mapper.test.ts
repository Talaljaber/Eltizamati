import { toCanonicalJsonValue } from '@eltizamati/domain'
import { ratePeriodRowToDomain } from '../rate-period-mapper'
import type { Database } from '../../../../../core/supabase/database.types'

type RatePeriodRow = Database['public']['Tables']['rate_periods']['Row']

describe('rate-period-mapper', () => {
  const row: RatePeriodRow = {
    id: '20000000-0000-0000-0000-000000000001',
    obligation_id: '10000000-0000-0000-0000-000000000001',
    user_id: 'a0000000-0000-0000-0000-00000000000a',
    annual_rate: 0.0695,
    effective_from: '2024-01-15',
    superseded_by: null,
    provenance_json: {
      source: 'userEntered',
      observedAt: '2024-01-15T00:00:00.000Z',
      recordedAt: '2024-01-15T00:00:00.000Z',
    },
    created_at: '2024-01-15T00:00:00.000Z',
  }

  it('omits supersededBy entirely (not as an undefined-valued key) when the row column is null', () => {
    const period = ratePeriodRowToDomain(row)
    expect('supersededBy' in period).toBe(false)
  })

  it('sets supersededBy when the row column is non-null', () => {
    const period = ratePeriodRowToDomain({
      ...row,
      superseded_by: '20000000-0000-0000-0000-000000000002',
    })
    expect(period.supersededBy).toBe('20000000-0000-0000-0000-000000000002')
  })

  it('an unsuperseded period survives toCanonicalJsonValue (regression: an explicit undefined-valued supersededBy key previously made every real rate period fail every calculation that includes it)', () => {
    const period = ratePeriodRowToDomain(row)
    const result = toCanonicalJsonValue({ ratePeriods: [period] })
    expect(result.ok).toBe(true)
  })
})
