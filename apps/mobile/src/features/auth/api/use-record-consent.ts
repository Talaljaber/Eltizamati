/**
 * Server-backed consent write on sign-up/first sign-in (PHASE-04 §3,
 * FR-ONB-003/FR-AUTH-002). Same docType/version scheme used by the demo
 * mode local consent acknowledgment's server-backed counterpart.
 */
import { useMutation } from '@tanstack/react-query'
import {
  isErr,
  brandId,
  type AppError,
  type ConsentRepository,
  type Id,
  type Result,
} from '@eltizamati/domain'

export const CONSENT_DOC_TYPE = 'privacy-policy'
export const CONSENT_VERSION = 'v1'

export interface RecordConsentInput {
  readonly userId: Id<'user'>
  readonly locale: 'en' | 'ar'
}

/** `crypto.randomUUID` isn't guaranteed present on Hermes/RN — same fallback as calculation-service.ts's generateId(). */
function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `consent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

export function useRecordConsentMutation(repositoryResult: Result<ConsentRepository, AppError>) {
  return useMutation<undefined, AppError, RecordConsentInput>({
    mutationFn: async ({ userId, locale }: RecordConsentInput): Promise<undefined> => {
      if (!repositoryResult.ok) throw repositoryResult.error
      const result = await repositoryResult.value.acknowledge({
        id: brandId<'consentRecord'>(generateId()),
        userId,
        docType: CONSENT_DOC_TYPE,
        version: CONSENT_VERSION,
        locale,
        acknowledgedAt: new Date().toISOString(),
      })
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}
