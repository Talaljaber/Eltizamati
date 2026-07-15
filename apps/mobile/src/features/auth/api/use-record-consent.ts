/**
 * Server-backed consent write on sign-up/first sign-in (PHASE-04 §3,
 * FR-ONB-003/FR-AUTH-002). Same docType/version scheme used by the demo
 * mode local consent acknowledgment's server-backed counterpart.
 */
import { useMutation } from '@tanstack/react-query'
import {
  isErr,
  type AppError,
  type ConsentRepository,
  type Id,
  type Result,
} from '@eltizamati/domain'
import {
  CURRENT_CONSENT_DOC_TYPE,
  CURRENT_CONSENT_VERSION,
  generateConsentId,
} from '@/features/consent/consent-policy'

export {
  CURRENT_CONSENT_DOC_TYPE as CONSENT_DOC_TYPE,
  CURRENT_CONSENT_VERSION as CONSENT_VERSION,
} from '@/features/consent/consent-policy'

export interface RecordConsentInput {
  readonly userId: Id<'user'>
  readonly locale: 'en' | 'ar'
}

/** `crypto.randomUUID` isn't guaranteed present on Hermes/RN — same fallback as calculation-service.ts's generateId(). */
export function useRecordConsentMutation(repositoryResult: Result<ConsentRepository, AppError>) {
  return useMutation<undefined, AppError, RecordConsentInput>({
    mutationFn: async ({ userId, locale }: RecordConsentInput): Promise<undefined> => {
      if (!repositoryResult.ok) throw repositoryResult.error
      const result = await repositoryResult.value.acknowledge({
        id: generateConsentId(),
        userId,
        docType: CURRENT_CONSENT_DOC_TYPE,
        version: CURRENT_CONSENT_VERSION,
        locale,
        acknowledgedAt: new Date().toISOString(),
      })
      if (isErr(result)) throw result.error
      return undefined
    },
  })
}
