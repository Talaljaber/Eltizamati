import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { isOk, Rate, toLocalDate } from '@eltizamati/domain'
import { RateWhatIfService } from '../rate-what-if-service'

describe('RateWhatIfService', () => {
  it('calculates an ephemeral scenario without changing the loan or rate history', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const originalPeriods = [...loan.loanDetails.ratePeriods]
    const before = JSON.stringify(loan)

    const result = new RateWhatIfService().calculate(
      loan,
      Rate.fromPercent('11'),
      toLocalDate('2026-08-01'),
      DEMO_DATE,
    )

    expect(isOk(result)).toBe(true)
    expect(loan.loanDetails.ratePeriods).toEqual(originalPeriods)
    expect(JSON.stringify(loan)).toBe(before)
  })

  it('surfaces a duplicateEffectiveFrom reason when the date matches an existing rate period', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const existingEffectiveFrom = loan.loanDetails.ratePeriods[0].effectiveFrom

    const result = new RateWhatIfService().calculate(
      loan,
      Rate.fromPercent('11'),
      existingEffectiveFrom,
      DEMO_DATE,
    )

    expect(isOk(result)).toBe(false)
    if (!result.ok) {
      expect(result.error.safeMetadata?.reason).toBe('duplicateEffectiveFrom')
    }
  })
})
