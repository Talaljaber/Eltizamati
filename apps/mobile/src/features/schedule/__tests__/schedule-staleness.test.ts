import { Money } from '@eltizamati/domain'
import { computeScheduleStaleness } from '../schedule-staleness'

describe('computeScheduleStaleness', () => {
  it('is not stale when nothing has drifted', () => {
    const result = computeScheduleStaleness({
      paymentsTotal: Money.of('600', 'JOD'),
      expectedPaidByAsOf: Money.of('600', 'JOD'),
      installment: Money.of('300', 'JOD'),
      rateDrifted: false,
      balloonPositive: false,
    })
    expect(result).toEqual({ stale: false, reasons: [] })
  })

  it('flags paymentDrift when paid more than one installment ahead of the schedule', () => {
    const result = computeScheduleStaleness({
      paymentsTotal: Money.of('2000', 'JOD'),
      expectedPaidByAsOf: Money.of('300', 'JOD'),
      installment: Money.of('300', 'JOD'),
      rateDrifted: false,
      balloonPositive: false,
    })
    expect(result.stale).toBe(true)
    expect(result.reasons).toEqual(['paymentDrift'])
  })

  it('flags rateChanged and balloon independently of payments', () => {
    const result = computeScheduleStaleness({
      paymentsTotal: Money.of('300', 'JOD'),
      expectedPaidByAsOf: Money.of('300', 'JOD'),
      installment: Money.of('300', 'JOD'),
      rateDrifted: true,
      balloonPositive: true,
    })
    expect(result.stale).toBe(true)
    expect(result.reasons).toEqual(['rateChanged', 'balloon'])
  })

  it('tolerates drift within one installment', () => {
    const result = computeScheduleStaleness({
      paymentsTotal: Money.of('580', 'JOD'),
      expectedPaidByAsOf: Money.of('600', 'JOD'),
      installment: Money.of('300', 'JOD'),
      rateDrifted: false,
      balloonPositive: false,
    })
    expect(result.stale).toBe(false)
  })
})
