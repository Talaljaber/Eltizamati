import {
  isOk,
  isErr,
  brandId,
  type ConventionalLoan,
  type MurabahaFinancing,
} from '@eltizamati/domain'
import { ObligationService } from '../obligation-service'
import { createDemoRepositories } from '../repositories/demo/index'

const userId = brandId<'user'>('test-user')

function makeService() {
  return new ObligationService()
}

describe('ObligationService — loans', () => {
  it('creates a loan with a valid initial rate period and persists it through both repositories', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const result = await service.createLoan(
      userId,
      {
        nickname: 'My Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '10000',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      '5.5',
      repos,
    )

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    expect(result.value.kind).toBe('conventionalLoan')
    expect(result.value.loanDetails.ratePeriods).toHaveLength(1)

    const stored = await repos.obligationRepository.get(result.value.id)
    expect(isOk(stored)).toBe(true)

    const history = await repos.ratePeriodRepository.historyFor(result.value.id)
    expect(isOk(history)).toBe(true)
    if (isOk(history)) {
      expect(history.value).toHaveLength(1)
      expect(history.value[0]?.annualRate.toPercent().toNumber()).toBe(5.5)
    }
  })

  it('updateLoan preserves existing rate periods (edit does not touch rate history)', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const created = await service.createLoan(
      userId,
      {
        nickname: 'My Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '10000',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      '5.5',
      repos,
    )
    expect(isOk(created)).toBe(true)
    if (!isOk(created)) return

    const updated = await service.updateLoan(
      created.value,
      {
        nickname: 'Renamed Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '9500',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      repos,
    )

    expect(isOk(updated)).toBe(true)
    if (isOk(updated)) {
      expect(updated.value.nickname).toBe('Renamed Loan')
      expect(updated.value.loanDetails.ratePeriods).toEqual(created.value.loanDetails.ratePeriods)
    }
  })

  it('logRateChange appends a new period and rejects a duplicate effectiveFrom date', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const created = await service.createLoan(
      userId,
      {
        nickname: 'My Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '10000',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      '5.5',
      repos,
    )
    expect(isOk(created)).toBe(true)
    if (!isOk(created)) return
    const loan = created.value as ConventionalLoan

    const change = await service.logRateChange(loan, '2024-06-01' as never, '6.25', repos)
    expect(isOk(change)).toBe(true)

    const history = await repos.ratePeriodRepository.historyFor(loan.id)
    expect(isOk(history)).toBe(true)
    if (isOk(history)) expect(history.value).toHaveLength(2)

    const duplicate = await service.logRateChange(loan, '2024-01-01' as never, '7', repos)
    expect(isErr(duplicate)).toBe(true)
  })

  it('logPayment records a payment with userEntered provenance and no allocation', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const created = await service.createLoan(
      userId,
      {
        nickname: 'My Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '10000',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      '5.5',
      repos,
    )
    expect(isOk(created)).toBe(true)
    if (!isOk(created)) return

    const payment = await service.logPayment(
      userId,
      created.value,
      '2024-02-01' as never,
      '300',
      repos,
    )
    expect(isOk(payment)).toBe(true)
    if (isOk(payment)) {
      expect(payment.value.provenance.source).toBe('userEntered')
      expect(payment.value.allocation).toBeUndefined()
    }

    const listed = await repos.paymentRepository.listFor(created.value.id)
    expect(isOk(listed)).toBe(true)
    if (isOk(listed)) expect(listed.value).toHaveLength(1)
  })

  it('archiveObligation sets closedDate; deleteObligation removes the obligation', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const created = await service.createLoan(
      userId,
      {
        nickname: 'My Loan',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        originalPrincipal: '10000',
        installment: '300',
        rateType: 'fixed',
        termMonths: 36,
        startDate: '2024-01-01' as never,
        maturityDate: '2027-01-01' as never,
      },
      '5.5',
      repos,
    )
    expect(isOk(created)).toBe(true)
    if (!isOk(created)) return

    const archived = await service.archiveObligation(created.value.id, repos)
    expect(isOk(archived)).toBe(true)
    const afterArchive = await repos.obligationRepository.get(created.value.id)
    expect(isOk(afterArchive)).toBe(true)
    if (isOk(afterArchive)) expect(afterArchive.value.closedDate).toBeDefined()

    const deleted = await service.deleteObligation(created.value.id, repos)
    expect(isOk(deleted)).toBe(true)
    const afterDelete = await repos.obligationRepository.get(created.value.id)
    expect(isErr(afterDelete)).toBe(true)
  })
})

describe('ObligationService — murabaha', () => {
  it('rejects creation when assetCost + disclosedProfit does not equal totalSalePrice', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const result = await service.createMurabaha(
      userId,
      {
        nickname: 'My Murabaha',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        totalSalePrice: '12000',
        assetCost: '10000',
        disclosedProfit: '1000', // 10000 + 1000 != 12000
        installment: '300',
        termMonths: 40,
        startDate: '2024-01-01' as never,
      },
      repos,
    )

    expect(isErr(result)).toBe(true)
  })

  it('creates a murabaha when the sale-price identity holds', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const result = await service.createMurabaha(
      userId,
      {
        nickname: 'My Murabaha',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        totalSalePrice: '12000',
        assetCost: '10000',
        disclosedProfit: '2000',
        installment: '300',
        termMonths: 40,
        startDate: '2024-01-01' as never,
      },
      repos,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const stored = await repos.obligationRepository.get(result.value.id)
      expect(isOk(stored)).toBe(true)
    }
  })

  it('updateMurabaha re-validates the sale-price identity', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const created = await service.createMurabaha(
      userId,
      {
        nickname: 'My Murabaha',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        totalSalePrice: '12000',
        assetCost: '10000',
        disclosedProfit: '2000',
        installment: '300',
        termMonths: 40,
        startDate: '2024-01-01' as never,
      },
      repos,
    )
    expect(isOk(created)).toBe(true)
    if (!isOk(created)) return
    const murabaha = created.value as MurabahaFinancing

    const badUpdate = await service.updateMurabaha(
      murabaha,
      {
        nickname: 'My Murabaha',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        totalSalePrice: '12000',
        assetCost: '10000',
        disclosedProfit: '500',
        installment: '300',
        termMonths: 40,
        startDate: '2024-01-01' as never,
      },
      repos,
    )
    expect(isErr(badUpdate)).toBe(true)
  })
})

describe('ObligationService — credit card', () => {
  it('creates a card with only the required fields', async () => {
    const service = makeService()
    const repos = createDemoRepositories()

    const result = await service.createCard(
      userId,
      {
        nickname: 'My Card',
        institutionName: 'Test Bank',
        openedDate: '2024-01-01' as never,
        creditLimit: '2000',
        currentBalance: '500',
      },
      repos,
    )

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.cardDetails.purchaseApr).toBeUndefined()
      const stored = await repos.obligationRepository.get(result.value.id)
      expect(isOk(stored)).toBe(true)
    }
  })
})
