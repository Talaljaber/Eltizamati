import {
  Money,
  Percentage,
  Rate,
  brandId,
  ok,
  type AppError,
  type CreditCard,
  type Id,
  type Result,
} from '@eltizamati/domain'
import type { Repositories } from '@/features/repositories/hooks/use-repositories'
import { ImportService } from './import-service'

export interface MockImportSummary {
  obligationId: Id<'obligation'>
  importedCount: number
}

export interface MockProviderRecord {
  readonly externalId: string
  readonly productType: 'credit-card'
  readonly institutionName: string
  readonly currency: 'JOD'
  readonly creditLimit: string
  readonly currentBalance: string
  readonly purchaseAprPercent: string
  readonly minimumPaymentPercent: string
  readonly minimumPaymentFloor: string
}

const SYNTHETIC_PROVIDER_RECORD: MockProviderRecord = {
  externalId: 'mock-provider-v1-card',
  productType: 'credit-card',
  institutionName: 'Mock Jordan Bank',
  currency: 'JOD',
  creditLimit: '3000',
  currentBalance: '900',
  purchaseAprPercent: '18',
  minimumPaymentPercent: '3',
  minimumPaymentFloor: '10',
}

/** A deterministic, permanently mock-labeled provider adapter for US-017. */
export class MockConnectService {
  /**
   * Synthetic provider adapter: intentionally performs no network I/O so the demo works offline.
   * Keeping retrieval separate from classification mirrors the real-provider boundary without
   * implying that this fixture is a live aggregation integration.
   */
  async retrieve(): Promise<MockProviderRecord> {
    return SYNTHETIC_PROVIDER_RECORD
  }

  classify(record: MockProviderRecord, userId: Id<'user'>): CreditCard {
    const now = new Date().toISOString()
    const obligationId = brandId<'obligation'>(`mock-card-${userId}`)
    const provenance = {
      source: 'demo' as const,
      providerId: 'mock-open-banking',
      sourceReference: record.externalId,
      observedAt: now,
      recordedAt: now,
    }
    return {
      id: obligationId,
      userId,
      kind: 'creditCard',
      connectionType: 'official',
      nickname: 'Mock Provider Card',
      institution: { name: record.institutionName },
      currency: record.currency,
      openedDate: '2025-01-01' as never,
      provenance,
      createdAt: now,
      updatedAt: now,
      cardDetails: {
        creditLimit: { value: Money.of(record.creditLimit, record.currency), provenance },
        currentBalance: { value: Money.of(record.currentBalance, record.currency), provenance },
        purchaseApr: { value: Rate.fromPercent(record.purchaseAprPercent), provenance },
        minimumPaymentRule: {
          type: 'percent',
          value: Percentage.of(record.minimumPaymentPercent),
          floor: Money.of(record.minimumPaymentFloor, record.currency),
        },
      },
    }
  }

  async retrieveAndImport(
    userId: Id<'user'>,
    repos: Repositories,
  ): Promise<Result<MockImportSummary, AppError>> {
    const record = await this.retrieve()
    const card = this.classify(record, userId)
    const obligationId = card.id
    const saved = await new ImportService().importProviderObligation(card, repos)
    if (!saved.ok) return saved
    return ok({ obligationId, importedCount: 1 })
  }
}
