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

/** A deterministic, permanently mock-labeled provider adapter for US-017. */
export class MockConnectService {
  async retrieveAndImport(
    userId: Id<'user'>,
    repos: Repositories,
  ): Promise<Result<MockImportSummary, AppError>> {
    const now = new Date().toISOString()
    const obligationId = brandId<'obligation'>(`mock-card-${userId}`)
    const provenance = {
      source: 'demo' as const,
      providerId: 'mock-open-banking',
      sourceReference: 'mock-provider-v1',
      observedAt: now,
      recordedAt: now,
    }
    const card: CreditCard = {
      id: obligationId,
      userId,
      kind: 'creditCard',
      nickname: 'Mock Provider Card',
      institution: { name: 'Mock Jordan Bank' },
      currency: 'JOD',
      openedDate: '2025-01-01' as never,
      provenance,
      createdAt: now,
      updatedAt: now,
      cardDetails: {
        creditLimit: { value: Money.of('3000', 'JOD'), provenance },
        currentBalance: { value: Money.of('900', 'JOD'), provenance },
        purchaseApr: { value: Rate.fromPercent('18'), provenance },
        minimumPaymentRule: {
          type: 'percent',
          value: Percentage.of('3'),
          floor: Money.of('10', 'JOD'),
        },
      },
    }
    const saved = await new ImportService().importProviderObligation(card, repos)
    if (!saved.ok) return saved
    return ok({ obligationId, importedCount: 1 })
  }
}
