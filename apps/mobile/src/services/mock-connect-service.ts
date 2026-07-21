import {
  Money,
  Percentage,
  Rate,
  brandId,
  deterministicUuid,
  err,
  makeError,
  ok,
  type AppError,
  type CreditCard,
  type Id,
  type MurabahaFinancing,
  type Obligation,
  type ConventionalLoan,
  type Provenance,
  type RatePeriod,
  type Result,
} from '@eltizamati/domain'
import { buildBankCatalog, type RawProviderRecord } from '@eltizamati/demo-data'
import { JORDAN_BANKS } from '@/features/auth/data/jordan-banks'
import type { Repositories } from '@/features/repositories/hooks/use-repositories'
import { ImportService } from './import-service'

export const MOCK_PROVIDER_ID = 'mock-open-banking'

/**
 * The same deterministic derivation `classify()` uses for an obligation's
 * id, exposed standalone so a caller (the retrieval mutation) can check
 * "would this record resolve to an obligation the user already has?"
 * without needing to fully classify the record first.
 */
export function externalRecordObligationId(
  bankId: string,
  externalId: string,
  userId: Id<'user'>,
): Id<'obligation'> {
  return brandId<'obligation'>(deterministicUuid(`${MOCK_PROVIDER_ID}:${bankId}:${externalId}:${userId}`))
}

export interface MockImportSummary {
  readonly obligationId: Id<'obligation'>
  readonly importedCount: number
}

/**
 * A deterministic, permanently mock-labeled provider adapter (US-017,
 * connect-plan.md Phase C). Synthetic — performs no network I/O so the demo
 * works offline. Keeping retrieval separate from classification mirrors the
 * real-provider boundary without implying this fixture is a live aggregation
 * integration.
 */
export class MockConnectService {
  /**
   * Returns the bank's raw provider records. An unknown bank id (not in
   * `JORDAN_BANKS`) is a typed error — never a silent fallback to another
   * bank's data. A bank id that IS a real Jordan bank but has no catalog
   * entry legitimately returns an empty list (the "zero obligations" case).
   */
  async retrieve(bankId: string): Promise<Result<readonly RawProviderRecord[], AppError>> {
    if (!JORDAN_BANKS.some((bank) => bank.id === bankId)) {
      return err(makeError('notFound', { safeMetadata: { entity: 'bank' } }))
    }
    const catalog = buildBankCatalog()
    return ok(catalog[bankId] ?? [])
  }

  /**
   * Classifies one raw record into the matching domain `Obligation`. Every
   * id (obligation, and the loan's initial rate period) is derived
   * deterministically from `providerId + bankId + externalId + userId` (plus
   * `effectiveFrom` for the rate period) — the same record imported twice
   * produces the same ids, which is what makes retrying a partial import a
   * safe no-op instead of creating duplicates.
   */
  classify(
    record: RawProviderRecord,
    userId: Id<'user'>,
    bankId: string,
    now: () => Date = () => new Date(),
  ): Obligation {
    const timestamp = now().toISOString()
    const seedKey = `${MOCK_PROVIDER_ID}:${bankId}:${record.externalId}:${userId}`
    const obligationId = externalRecordObligationId(bankId, record.externalId, userId)
    const provenance: Provenance = {
      source: 'demo',
      providerId: MOCK_PROVIDER_ID,
      sourceReference: `${bankId}:${record.externalId}`,
      observedAt: timestamp,
      recordedAt: timestamp,
    }
    const base = {
      id: obligationId,
      userId,
      connectionType: 'official' as const,
      institution: { name: record.institutionName },
      currency: record.currency,
      provenance,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    switch (record.productType) {
      case 'creditCard': {
        const card: CreditCard = {
          ...base,
          kind: 'creditCard',
          nickname: `${record.institutionName} Card`,
          openedDate: record.openedDate,
          cardDetails: {
            creditLimit: { value: Money.of(record.creditLimit, record.currency), provenance },
            currentBalance: {
              value: Money.of(record.currentBalance, record.currency),
              provenance,
            },
            purchaseApr: { value: Rate.fromPercent(record.purchaseAprPercent), provenance },
            minimumPaymentRule: {
              type: 'percent',
              value: Percentage.of(record.minimumPaymentPercent),
              floor: Money.of(record.minimumPaymentFloor, record.currency),
            },
          },
        }
        return card
      }
      case 'conventionalLoan': {
        const ratePeriodId = brandId<'ratePeriod'>(
          deterministicUuid(`${seedKey}:ratePeriod:${record.startDate}`),
        )
        const ratePeriod: RatePeriod = {
          id: ratePeriodId,
          obligationId,
          annualRate: Rate.fromPercent(record.annualRatePercent),
          effectiveFrom: record.startDate,
          provenance,
          createdAt: timestamp,
        }
        const loan: ConventionalLoan = {
          ...base,
          kind: 'conventionalLoan',
          nickname: `${record.institutionName} Loan`,
          openedDate: record.startDate,
          loanDetails: {
            originalPrincipal: {
              value: Money.of(record.originalPrincipal, record.currency),
              provenance,
            },
            outstandingBalance: {
              value: Money.of(record.outstandingBalance, record.currency),
              provenance,
            },
            installment: { value: Money.of(record.installment, record.currency), provenance },
            rateType: record.rateType,
            ratePeriods: [ratePeriod],
            termMonths: { value: record.termMonths, provenance },
            startDate: record.startDate,
            maturityDate: record.maturityDate,
            firstPaymentDate: record.firstPaymentDate,
            paymentFrequency: 'monthly',
            purpose: record.purpose,
          },
        }
        return loan
      }
      case 'murabaha': {
        const murabaha: MurabahaFinancing = {
          ...base,
          kind: 'murabaha',
          nickname: `${record.institutionName} Murabaha`,
          openedDate: record.startDate,
          murabahaDetails: {
            assetCost: { value: Money.of(record.assetCost, record.currency), provenance },
            disclosedProfit: {
              value: Money.of(record.disclosedProfit, record.currency),
              provenance,
            },
            totalSalePrice: {
              value: Money.of(record.totalSalePrice, record.currency),
              provenance,
            },
            installment: { value: Money.of(record.installment, record.currency), provenance },
            termMonths: { value: record.termMonths, provenance },
            startDate: record.startDate,
            profitRateDisclosed: Rate.fromPercent(record.profitRatePercent),
          },
        }
        return murabaha
      }
    }
  }

  /**
   * Legacy single-card convenience path kept only for `/connect-mock`
   * (superseded by `/connect-bank` — retired separately, connect-plan.md
   * Phase C/E) so that screen keeps working unmodified during the
   * transition. New code should call `retrieve`/`classify` directly.
   */
  async retrieveAndImport(
    userId: Id<'user'>,
    repos: Repositories,
  ): Promise<Result<MockImportSummary, AppError>> {
    const bankId = 'arab-bank'
    const recordsResult = await this.retrieve(bankId)
    if (!recordsResult.ok) return recordsResult
    const cardRecord = recordsResult.value.find(
      (record): record is Extract<RawProviderRecord, { productType: 'creditCard' }> =>
        record.productType === 'creditCard',
    )
    if (cardRecord === undefined) {
      return err(makeError('notFound', { safeMetadata: { entity: 'mockProviderCard' } }))
    }
    const obligation = this.classify(cardRecord, userId, bankId)
    const saved = await new ImportService().importProviderObligation(obligation, repos)
    if (!saved.ok) return saved
    return ok({ obligationId: obligation.id, importedCount: 1 })
  }
}
