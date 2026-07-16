import { describe, expect, it } from 'vitest'
import { renderRateChangeEmail } from './templates'

const params = {
  obligationNickname: 'Demo loan',
  oldRatePercent: '7.500',
  newRatePercent: '9.250',
  effectiveDate: '2026-08-01',
  projectedResidualAmount: '1234.560',
  currency: 'JOD',
}

describe('renderRateChangeEmail', () => {
  it('renders an English template with the demo disclaimer and no forbidden content', () => {
    const email = renderRateChangeEmail('en', params)
    expect(email.subject).toBe('Demo rate-change notification — Eltizamati')
    expect(email.text).toContain('hackathon simulation')
    expect(email.text).toContain('7.500')
    expect(email.text).toContain('9.250')
    expect(email.text).not.toMatch(/password/i)
    expect(email.text).not.toMatch(/account number/i)
  })

  it('renders an Arabic template with the demo disclaimer', () => {
    const email = renderRateChangeEmail('ar', params)
    expect(email.subject).toContain('Eltizamati')
    expect(email.text).toContain('هاكاثون')
  })

  it('states honestly when no residual could be projected', () => {
    const email = renderRateChangeEmail('en', { ...params, projectedResidualAmount: undefined })
    expect(email.text).toContain('could not estimate')
  })
})
