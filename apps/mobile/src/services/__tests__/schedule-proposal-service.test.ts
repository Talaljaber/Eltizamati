import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { isOk, Money } from '@eltizamati/domain'
import { ScheduleProposalService } from '../schedule-proposal-service'

describe('ScheduleProposalService', () => {
  it('calculates without changing the loan, contractual installment, or rate history', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const before = JSON.stringify(loan)

    const result = new ScheduleProposalService().calculate(
      loan,
      loan.loanDetails.ratePeriods,
      Money.of('400', 'JOD'),
      DEMO_DATE,
      Money.zero('JOD'),
    )

    expect(isOk(result)).toBe(true)
    expect(loan.loanDetails.installment.value.toStorageString()).toBe('310')
    expect(JSON.stringify(loan)).toBe(before)
  })

  it('rejects a non-positive proposed installment', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const result = new ScheduleProposalService().calculate(
      loan,
      loan.loanDetails.ratePeriods,
      Money.zero('JOD'),
      DEMO_DATE,
      Money.zero('JOD'),
    )
    expect(result.ok).toBe(false)
  })

  it('generates a recommended schedule that closes at maturity without a balloon', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const result = new ScheduleProposalService().calculateRecommended(
      loan,
      loan.loanDetails.ratePeriods,
      DEMO_DATE,
      Money.zero('JOD'),
    )

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.projectedResidualAtMaturity.isZero()).toBe(true)
    expect(loan.loanDetails.installment.value.toStorageString()).toBe('310')
  })

  it('nets logged payments out of the principal before projecting', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const withoutPayments = new ScheduleProposalService().calculateRecommended(
      loan,
      loan.loanDetails.ratePeriods,
      DEMO_DATE,
      Money.zero('JOD'),
    )
    const withPayments = new ScheduleProposalService().calculateRecommended(
      loan,
      loan.loanDetails.ratePeriods,
      DEMO_DATE,
      Money.of('2000', 'JOD'),
    )

    expect(isOk(withoutPayments)).toBe(true)
    expect(isOk(withPayments)).toBe(true)
    if (!isOk(withoutPayments) || !isOk(withPayments)) return
    expect(
      withPayments.value.totals.totalPaid.isLessThan(withoutPayments.value.totals.totalPaid),
    ).toBe(true)
  })

  it('calculateSameInstallment pays off earlier when overpayment has reduced principal', () => {
    const loan = buildDemoLoan(DEMO_DATE)
    const result = new ScheduleProposalService().calculateSameInstallment(
      loan,
      loan.loanDetails.ratePeriods,
      DEMO_DATE,
      Money.of('2000', 'JOD'),
    )

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.payoffPeriod).toBeDefined()
    expect(result.value.payoffPeriod as number).toBeLessThan(loan.loanDetails.termMonths.value)
  })
})
