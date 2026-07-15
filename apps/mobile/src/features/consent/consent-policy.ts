import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  brandId,
  err,
  makeError,
  ok,
  type AppError,
  type ConsentRepository,
  type Id,
  type Result,
} from '@eltizamati/domain'
import { generateUuid } from '@/core/ids/generate-uuid'

export const CURRENT_CONSENT_DOC_TYPE = 'privacy-policy'
export const CURRENT_CONSENT_VERSION = 'v1'

const LOCAL_CONSENT_KEY = '@Eltizamati:consent:privacy-policy'

export interface LocalConsentAcknowledgement {
  readonly docType: typeof CURRENT_CONSENT_DOC_TYPE
  readonly version: string
  readonly locale: 'en' | 'ar'
  readonly acknowledgedAt: string
}

function isLocalConsentAcknowledgement(value: unknown): value is LocalConsentAcknowledgement {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LocalConsentAcknowledgement>
  return (
    candidate.docType === CURRENT_CONSENT_DOC_TYPE &&
    typeof candidate.version === 'string' &&
    (candidate.locale === 'en' || candidate.locale === 'ar') &&
    typeof candidate.acknowledgedAt === 'string'
  )
}

function storageError(cause: unknown): AppError {
  return makeError('storage', {
    safeMetadata: { operation: 'local_consent' },
    cause,
  })
}

export function generateConsentId(): Id<'consentRecord'> {
  return brandId<'consentRecord'>(generateUuid())
}

export async function readLocalConsent(): Promise<
  Result<LocalConsentAcknowledgement | undefined, AppError>
> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CONSENT_KEY)
    if (raw === null) return ok(undefined)
    const parsed: unknown = JSON.parse(raw)
    return ok(isLocalConsentAcknowledgement(parsed) ? parsed : undefined)
  } catch (cause) {
    return err(storageError(cause))
  }
}

export async function acknowledgeLocalConsent(
  locale: 'en' | 'ar',
  now: Date = new Date(),
): Promise<Result<LocalConsentAcknowledgement, AppError>> {
  const acknowledgement: LocalConsentAcknowledgement = {
    docType: CURRENT_CONSENT_DOC_TYPE,
    version: CURRENT_CONSENT_VERSION,
    locale,
    acknowledgedAt: now.toISOString(),
  }
  try {
    await AsyncStorage.setItem(LOCAL_CONSENT_KEY, JSON.stringify(acknowledgement))
    return ok(acknowledgement)
  } catch (cause) {
    return err(storageError(cause))
  }
}

export async function clearLocalConsent(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_CONSENT_KEY)
}

export function isCurrentLocalConsent(
  acknowledgement: LocalConsentAcknowledgement | undefined,
): acknowledgement is LocalConsentAcknowledgement {
  return (
    acknowledgement?.docType === CURRENT_CONSENT_DOC_TYPE &&
    acknowledgement.version === CURRENT_CONSENT_VERSION
  )
}

/**
 * The one mode-independent completion policy. The affirmative act is first
 * persisted locally; authenticated users then receive the corresponding
 * server-backed record before any product route is allowed to mount.
 */
export async function ensurePersonalConsent(
  userId: Id<'user'>,
  repository: ConsentRepository,
): Promise<Result<void, AppError>> {
  const localResult = await readLocalConsent()
  if (!localResult.ok) return localResult
  if (!isCurrentLocalConsent(localResult.value)) {
    return err(
      makeError('consent', {
        safeMetadata: { requiredVersion: CURRENT_CONSENT_VERSION },
      }),
    )
  }

  const statusResult = await repository.status(userId)
  if (!statusResult.ok) return statusResult
  const alreadyRecorded = statusResult.value.some(
    (record) =>
      record.docType === CURRENT_CONSENT_DOC_TYPE && record.version === CURRENT_CONSENT_VERSION,
  )
  if (alreadyRecorded) return ok(undefined)

  const acknowledgeResult = await repository.acknowledge({
    id: generateConsentId(),
    userId,
    docType: CURRENT_CONSENT_DOC_TYPE,
    version: CURRENT_CONSENT_VERSION,
    locale: localResult.value.locale,
    acknowledgedAt: localResult.value.acknowledgedAt,
  })
  return acknowledgeResult.ok ? ok(undefined) : acknowledgeResult
}
