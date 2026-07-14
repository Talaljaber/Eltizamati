import { DEMO_DATE } from '@eltizamati/demo-data'
import { toLocalDate } from '@eltizamati/domain'
import { calculationAsOf, calculationAsOfForObligations } from '../calculation-as-of'

describe('mode-authoritative calculation dates', () => {
  const personalAsOf = toLocalDate('2030-01-01')

  it('uses the fixed date for empty demo data', () => {
    expect(calculationAsOfForObligations('demo', personalAsOf)).toBe(DEMO_DATE)
  })

  it('uses the fixed date for partially missing demo data', () => {
    expect(calculationAsOf('demo', personalAsOf)).toBe(DEMO_DATE)
  })

  it('uses the shared current date for personal data regardless of record provenance', () => {
    expect(calculationAsOf('personal', personalAsOf)).toBe(personalAsOf)
  })

  it('keeps demo and personal aggregate dates partitioned', () => {
    expect(calculationAsOfForObligations('demo', personalAsOf)).toBe(DEMO_DATE)
    expect(calculationAsOfForObligations('personal', personalAsOf)).toBe(personalAsOf)
  })
})
