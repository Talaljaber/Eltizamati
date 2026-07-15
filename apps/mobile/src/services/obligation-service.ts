/**
 * ObligationService — Phase 8 manual entry (FR-OBL-005/006/007/008, FR-PAY-*, BR-RATE-001).
 *
 * Assembles obligation/payment/rate-period domain entities from plain form
 * input and persists them through the repository ports. All manually-entered
 * values are stamped with `userEntered` provenance — never fabricated as
 * 'official' or 'estimate' (data-provenance.md §1).
 *
 * NO Supabase imports. Works against either repository family via the
 * shared `Repositories` union — same port, same code path in both modes.
 */

import {
  ok,
  err,
  makeError,
  isErr,
  brandId,
  userEntered,
  Money,
  Rate,
  validateMurabahaFinancing,
  validateRatePeriods,
  type Result,
  type AppError,
  type Id,
  type LocalDate,
  type RateType,
  type ConventionalLoan,
  type MurabahaFinancing,
  type CreditCard,
  type Obligation,
  type Payment,
  type RatePeriod,
  type Provenance,
} from '@eltizamati/domain'
import type { Repositories } from '@/features/repositories/hooks/use-repositories'
import { generateUuid } from '@/core/ids/generate-uuid'

function nowProvenance(recordedAt: string): Provenance {
  return { source: 'userEntered', providerId: 'manual', observedAt: recordedAt, recordedAt }
}

export interface LoanFormInput {
  readonly nickname: string
  readonly institutionName: string
  readonly openedDate: LocalDate
  readonly originalPrincipal: string
  readonly outstandingBalance?: string
  readonly installment: string
  readonly rateType: RateType
  readonly termMonths: number
  readonly startDate: LocalDate
  readonly maturityDate: LocalDate
}

export interface MurabahaFormInput {
  readonly nickname: string
  readonly institutionName: string
  readonly openedDate: LocalDate
  readonly totalSalePrice: string
  readonly assetCost: string
  readonly disclosedProfit: string
  readonly installment: string
  readonly termMonths: number
  readonly startDate: LocalDate
  readonly profitRateDisclosedPercent?: string
}

export interface CardFormInput {
  readonly nickname: string
  readonly institutionName: string
  readonly openedDate: LocalDate
  readonly creditLimit: string
  readonly currentBalance: string
  readonly purchaseAprPercent?: string
  readonly cashAdvanceAprPercent?: string
  readonly dueDate?: LocalDate
}

const CURRENCY = 'JOD'

export class ObligationService {
  async createLoan(
    userId: Id<'user'>,
    input: LoanFormInput,
    annualRatePercent: string,
    repos: Repositories,
  ): Promise<Result<ConventionalLoan, AppError>> {
    const now = new Date().toISOString()
    const obligationId = brandId<'obligation'>(generateUuid())

    const initialPeriod: RatePeriod = {
      id: brandId<'ratePeriod'>(generateUuid()),
      obligationId,
      annualRate: Rate.fromPercent(annualRatePercent),
      effectiveFrom: input.startDate,
      provenance: nowProvenance(now),
      createdAt: now,
    }
    const periodsValidation = validateRatePeriods([initialPeriod])
    if (isErr(periodsValidation)) return periodsValidation

    const loan: ConventionalLoan = {
      id: obligationId,
      userId,
      kind: 'conventionalLoan',
      nickname: input.nickname,
      institution: { name: input.institutionName },
      currency: CURRENCY,
      openedDate: input.openedDate,
      provenance: nowProvenance(now),
      createdAt: now,
      updatedAt: now,
      loanDetails: {
        originalPrincipal: userEntered(Money.of(input.originalPrincipal, CURRENCY), now),
        outstandingBalance:
          input.outstandingBalance === undefined
            ? undefined
            : userEntered(Money.of(input.outstandingBalance, CURRENCY), now),
        installment: userEntered(Money.of(input.installment, CURRENCY), now),
        rateType: input.rateType,
        ratePeriods: [initialPeriod],
        termMonths: userEntered(input.termMonths, now),
        startDate: input.startDate,
        maturityDate: input.maturityDate,
        paymentFrequency: 'monthly',
      },
    }

    const saveResult = await repos.obligationRepository.save(loan)
    if (isErr(saveResult)) return saveResult

    const appendResult = await repos.ratePeriodRepository.append(initialPeriod)
    if (isErr(appendResult)) return appendResult

    return ok(loan)
  }

  async updateLoan(
    existing: ConventionalLoan,
    input: LoanFormInput,
    repos: Repositories,
  ): Promise<Result<ConventionalLoan, AppError>> {
    const now = new Date().toISOString()
    const updated: ConventionalLoan = {
      ...existing,
      nickname: input.nickname,
      institution: { name: input.institutionName },
      openedDate: input.openedDate,
      updatedAt: now,
      loanDetails: {
        ...existing.loanDetails,
        originalPrincipal: userEntered(Money.of(input.originalPrincipal, CURRENCY), now),
        outstandingBalance:
          input.outstandingBalance === undefined
            ? undefined
            : userEntered(Money.of(input.outstandingBalance, CURRENCY), now),
        installment: userEntered(Money.of(input.installment, CURRENCY), now),
        rateType: input.rateType,
        termMonths: userEntered(input.termMonths, now),
        startDate: input.startDate,
        maturityDate: input.maturityDate,
      },
    }
    const saveResult = await repos.obligationRepository.save(updated)
    if (isErr(saveResult)) return saveResult
    return ok(updated)
  }

  async createMurabaha(
    userId: Id<'user'>,
    input: MurabahaFormInput,
    repos: Repositories,
  ): Promise<Result<MurabahaFinancing, AppError>> {
    const now = new Date().toISOString()
    const murabaha: MurabahaFinancing = {
      id: brandId<'obligation'>(generateUuid()),
      userId,
      kind: 'murabaha',
      nickname: input.nickname,
      institution: { name: input.institutionName },
      currency: CURRENCY,
      openedDate: input.openedDate,
      provenance: nowProvenance(now),
      createdAt: now,
      updatedAt: now,
      murabahaDetails: {
        totalSalePrice: userEntered(Money.of(input.totalSalePrice, CURRENCY), now),
        assetCost: userEntered(Money.of(input.assetCost, CURRENCY), now),
        disclosedProfit: userEntered(Money.of(input.disclosedProfit, CURRENCY), now),
        installment: userEntered(Money.of(input.installment, CURRENCY), now),
        termMonths: userEntered(input.termMonths, now),
        startDate: input.startDate,
        profitRateDisclosed:
          input.profitRateDisclosedPercent === undefined
            ? undefined
            : Rate.fromPercent(input.profitRateDisclosedPercent),
      },
    }

    const validation = validateMurabahaFinancing(murabaha.murabahaDetails)
    if (isErr(validation)) return validation

    const saveResult = await repos.obligationRepository.save(murabaha)
    if (isErr(saveResult)) return saveResult
    return ok(murabaha)
  }

  async updateMurabaha(
    existing: MurabahaFinancing,
    input: MurabahaFormInput,
    repos: Repositories,
  ): Promise<Result<MurabahaFinancing, AppError>> {
    const now = new Date().toISOString()
    const updated: MurabahaFinancing = {
      ...existing,
      nickname: input.nickname,
      institution: { name: input.institutionName },
      openedDate: input.openedDate,
      updatedAt: now,
      murabahaDetails: {
        totalSalePrice: userEntered(Money.of(input.totalSalePrice, CURRENCY), now),
        assetCost: userEntered(Money.of(input.assetCost, CURRENCY), now),
        disclosedProfit: userEntered(Money.of(input.disclosedProfit, CURRENCY), now),
        installment: userEntered(Money.of(input.installment, CURRENCY), now),
        termMonths: userEntered(input.termMonths, now),
        startDate: input.startDate,
        profitRateDisclosed:
          input.profitRateDisclosedPercent === undefined
            ? undefined
            : Rate.fromPercent(input.profitRateDisclosedPercent),
      },
    }

    const validation = validateMurabahaFinancing(updated.murabahaDetails)
    if (isErr(validation)) return validation

    const saveResult = await repos.obligationRepository.save(updated)
    if (isErr(saveResult)) return saveResult
    return ok(updated)
  }

  async createCard(
    userId: Id<'user'>,
    input: CardFormInput,
    repos: Repositories,
  ): Promise<Result<CreditCard, AppError>> {
    const now = new Date().toISOString()
    const card: CreditCard = {
      id: brandId<'obligation'>(generateUuid()),
      userId,
      kind: 'creditCard',
      nickname: input.nickname,
      institution: { name: input.institutionName },
      currency: CURRENCY,
      openedDate: input.openedDate,
      provenance: nowProvenance(now),
      createdAt: now,
      updatedAt: now,
      cardDetails: {
        creditLimit: userEntered(Money.of(input.creditLimit, CURRENCY), now),
        currentBalance: userEntered(Money.of(input.currentBalance, CURRENCY), now),
        purchaseApr:
          input.purchaseAprPercent === undefined
            ? undefined
            : userEntered(Rate.fromPercent(input.purchaseAprPercent), now),
        cashAdvanceApr:
          input.cashAdvanceAprPercent === undefined
            ? undefined
            : userEntered(Rate.fromPercent(input.cashAdvanceAprPercent), now),
        dueDate: input.dueDate,
      },
    }

    const saveResult = await repos.obligationRepository.save(card)
    if (isErr(saveResult)) return saveResult
    return ok(card)
  }

  async updateCard(
    existing: CreditCard,
    input: CardFormInput,
    repos: Repositories,
  ): Promise<Result<CreditCard, AppError>> {
    const now = new Date().toISOString()
    const updated: CreditCard = {
      ...existing,
      nickname: input.nickname,
      institution: { name: input.institutionName },
      openedDate: input.openedDate,
      updatedAt: now,
      cardDetails: {
        ...existing.cardDetails,
        creditLimit: userEntered(Money.of(input.creditLimit, CURRENCY), now),
        currentBalance: userEntered(Money.of(input.currentBalance, CURRENCY), now),
        purchaseApr:
          input.purchaseAprPercent === undefined
            ? undefined
            : userEntered(Rate.fromPercent(input.purchaseAprPercent), now),
        cashAdvanceApr:
          input.cashAdvanceAprPercent === undefined
            ? undefined
            : userEntered(Rate.fromPercent(input.cashAdvanceAprPercent), now),
        dueDate: input.dueDate,
      },
    }
    const saveResult = await repos.obligationRepository.save(updated)
    if (isErr(saveResult)) return saveResult
    return ok(updated)
  }

  async archiveObligation(
    id: Id<'obligation'>,
    repos: Repositories,
  ): Promise<Result<void, AppError>> {
    return repos.obligationRepository.archive(id)
  }

  async deleteObligation(
    id: Id<'obligation'>,
    repos: Repositories,
  ): Promise<Result<void, AppError>> {
    return repos.obligationRepository.delete(id)
  }

  async logPayment(
    userId: Id<'user'>,
    obligation: Obligation,
    date: LocalDate,
    amount: string,
    repos: Repositories,
    allowDuplicate = false,
  ): Promise<Result<Payment, AppError>> {
    if (!allowDuplicate) {
      const existingResult = await repos.paymentRepository.listFor(obligation.id)
      if (isErr(existingResult)) return existingResult
      const amountValue = Money.of(amount, obligation.currency)
      const duplicate = existingResult.value.some(
        (payment) => payment.date === date && payment.amount.equals(amountValue),
      )
      if (duplicate) {
        return err(
          makeError('validation', {
            safeMetadata: { reason: 'duplicatePayment', obligationId: obligation.id, date },
          }),
        )
      }
    }
    const now = new Date().toISOString()
    const payment: Payment = {
      id: brandId<'payment'>(generateUuid()),
      obligationId: obligation.id,
      userId,
      date,
      amount: Money.of(amount, obligation.currency),
      provenance: nowProvenance(now),
      createdAt: now,
    }
    return repos.paymentRepository.log(payment)
  }

  async logRateChange(
    obligation: ConventionalLoan,
    effectiveFrom: LocalDate,
    annualRatePercent: string,
    repos: Repositories,
  ): Promise<Result<RatePeriod, AppError>> {
    const now = new Date().toISOString()
    const historyResult = await repos.ratePeriodRepository.historyFor(obligation.id)
    if (isErr(historyResult)) return historyResult

    const newPeriod: RatePeriod = {
      id: brandId<'ratePeriod'>(generateUuid()),
      obligationId: obligation.id,
      annualRate: Rate.fromPercent(annualRatePercent),
      effectiveFrom,
      provenance: nowProvenance(now),
      createdAt: now,
    }

    const validation = validateRatePeriods([...historyResult.value, newPeriod])
    if (isErr(validation)) return validation

    return repos.ratePeriodRepository.append(newPeriod)
  }
}
