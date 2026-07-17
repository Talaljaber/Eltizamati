import { describe, expect, it } from 'vitest'
import {
  renderCustomEmail,
  renderLoanApprovedEmail,
  renderLoanRejectedEmail,
  renderRateChangeEmail,
} from './templates'

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

describe('renderCustomEmail', () => {
  const customParams = { subject: 'A note from us', body: 'Please review your recent statement.' }

  it('preserves the operator subject and body, and still appends the demo disclaimer', () => {
    const email = renderCustomEmail('en', customParams)
    expect(email.subject).toBe('A note from us')
    expect(email.text).toContain('Please review your recent statement.')
    expect(email.text).toContain('hackathon simulation')
  })

  it('appends the Arabic demo disclaimer regardless of operator content', () => {
    const email = renderCustomEmail('ar', customParams)
    expect(email.subject).toBe('A note from us')
    expect(email.text).toContain(customParams.body)
    expect(email.text).toContain('هاكاثون')
  })
})

describe('loan decision emails', () => {
  it('renders an approval with the decided terms and the demo disclaimer', () => {
    const email = renderLoanApprovedEmail('en', {
      institutionName: 'Arab Bank',
      approvedAmount: '1000.000',
      approvedTermMonths: 24,
      approvedRatePercent: '8.900',
      currency: 'JOD',
    })
    expect(email.text).toContain('Arab Bank')
    expect(email.text).toContain('1000.000')
    expect(email.text).toContain('8.900')
    expect(email.text).toContain('hackathon simulation')
  })

  it('renders a rejection with the reason and the Arabic demo disclaimer', () => {
    const email = renderLoanRejectedEmail('ar', {
      institutionName: 'Housing Bank for Trade and Finance',
      reason: 'Insufficient supporting information',
    })
    expect(email.text).toContain('Insufficient supporting information')
    expect(email.text).toContain('هاكاثون')
  })
})
