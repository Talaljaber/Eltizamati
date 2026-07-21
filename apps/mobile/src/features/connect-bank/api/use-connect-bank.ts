/**
 * Mutation hooks for the `/connect-bank` flow (connect-plan.md Phase C/E).
 * Screens stay thin — all repository access and query-cache invalidation
 * lives here, not in route components (UI -> application -> repository).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isErr, type AppError, type Id } from '@eltizamati/domain'
import type { RawProviderRecord } from '@eltizamati/demo-data'
import { MockConnectService, externalRecordObligationId } from '@/services/mock-connect-service'
import { ImportService, type ProviderImportSummary } from '@/services/import-service'
import type { Repositories } from '@/features/repositories/hooks/use-repositories'
import { obligationKeys, insightKeys } from '@/features/home/api/keys'
import { CURRENT_BANK_CONNECT_VERSION } from '../bank-connect-policy'

const mockConnectService = new MockConnectService()
const importService = new ImportService()

export interface RetrieveBankRecordsInput {
  readonly bankId: string
  readonly userId: Id<'user'>
  readonly repos: Pick<Repositories, 'obligationRepository'>
}

export interface RetrieveBankRecordsResult {
  readonly records: readonly RawProviderRecord[]
  /** True when the bank had records but every one of them was filtered out
   * below because the user already imported it — distinct from the bank
   * genuinely returning nothing, so the empty state can say the right thing. */
  readonly allAlreadyImported: boolean
}

/**
 * Same obligation ids are deterministic (providerId+bankId+externalId+userId
 * — see mock-connect-service.ts classify()), so re-connecting to a bank the
 * user already pulled from would otherwise show the exact same records again
 * with no way to tell they're duplicates. Filtering them out here means the
 * selection list only ever shows what's actually new to import.
 */
export function useRetrieveBankRecordsMutation() {
  return useMutation<RetrieveBankRecordsResult, AppError, RetrieveBankRecordsInput>({
    mutationFn: async ({ bankId, userId, repos }) => {
      const result = await mockConnectService.retrieve(bankId)
      if (isErr(result)) throw result.error

      const existingResult = await repos.obligationRepository.list(userId)
      if (isErr(existingResult)) throw existingResult.error
      const existingIds = new Set(existingResult.value.map((obligation) => obligation.id))

      const records = result.value.filter(
        (record) => !existingIds.has(externalRecordObligationId(bankId, record.externalId, userId)),
      )
      return {
        records,
        allAlreadyImported: result.value.length > 0 && records.length === 0,
      }
    },
  })
}

export interface ImportSelectedInput {
  readonly bankId: string
  readonly userId: Id<'user'>
  readonly records: readonly RawProviderRecord[]
  readonly repos: Pick<Repositories, 'obligationRepository' | 'ratePeriodRepository'>
}

/**
 * Classifies and imports the ticked records, then invalidates the
 * obligation/insight query keys so Home and Obligations refresh
 * immediately (connect-plan.md #12) instead of showing a stale empty state.
 */
export function useImportSelectedMutation() {
  const queryClient = useQueryClient()
  return useMutation<ProviderImportSummary, AppError, ImportSelectedInput>({
    mutationFn: async ({ bankId, userId, records, repos }) => {
      const obligations = records.map((record) =>
        mockConnectService.classify(record, userId, bankId),
      )
      return importService.importProviderObligations(obligations, repos)
    },
    onSuccess: (_summary, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: obligationKeys.all })
      void queryClient.invalidateQueries({ queryKey: insightKeys.list(userId) })
    },
  })
}

export function useMarkBankConnectCompleteMutation() {
  return useMutation<
    undefined,
    AppError,
    { userId: Id<'user'>; repos: Pick<Repositories, 'userProfileRepository'> }
  >({
    mutationFn: async ({ userId, repos }) => {
      const result = await repos.userProfileRepository.markBankConnectComplete(
        userId,
        CURRENT_BANK_CONNECT_VERSION,
      )
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}
