import {
  brandId,
  err,
  makeError,
  type AppError,
  type Result,
  type UserProfile,
  type UserProfileRepository,
} from '@eltizamati/domain'
import type { AppAuthSession } from '@/services/auth/auth-service'

const inFlightByUser = new Map<string, Promise<Result<UserProfile, AppError>>>()

function logProvisioning(stage: string, metadata?: Record<string, unknown>): void {
  if (!__DEV__ || process.env.NODE_ENV === 'test') return
  // eslint-disable-next-line no-console -- Temporary development-only signup diagnostics; metadata excludes client identity and profile values.
  console.info('[signup-profile-debug] Profile provisioning', { stage, ...metadata })
}

export type ProfileProvisioningDetails = Pick<
  UserProfile,
  'fullName' | 'phoneNumber' | 'primaryBank'
>

export function ensureAuthenticatedUserProfile(
  session: AppAuthSession,
  locale: 'en' | 'ar',
  repository: UserProfileRepository,
  details: ProfileProvisioningDetails = {},
  now: () => Date = () => new Date(),
): Promise<Result<UserProfile, AppError>> {
  const existing = inFlightByUser.get(session.user.id)
  if (existing !== undefined) return existing

  const operation = (async (): Promise<Result<UserProfile, AppError>> => {
    const userId = brandId<'user'>(session.user.id)
    logProvisioning('read_started')
    const readResult = await repository.get(userId)
    if (readResult.ok) {
      logProvisioning('existing_profile_found')
      return readResult
    }
    if (readResult.error.code !== 'notFound') {
      logProvisioning('read_failed', {
        appErrorCode: readResult.error.code,
        safeMetadata: readResult.error.safeMetadata,
      })
      return readResult
    }

    const timestamp = now().toISOString()
    logProvisioning('create_started', {
      locale,
      hasFullName: details.fullName !== undefined,
      hasPhoneNumber: details.phoneNumber !== undefined,
      hasPrimaryBank: details.primaryBank !== undefined,
    })
    const createResult = await repository.createIfAbsent({
      userId,
      locale,
      dataMode: 'personal',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...details,
    })
    if (!createResult.ok) {
      logProvisioning('create_failed', {
        appErrorCode: createResult.error.code,
        safeMetadata: createResult.error.safeMetadata,
      })
      return err(
        makeError(createResult.error.code, {
          safeMetadata: {
            ...createResult.error.safeMetadata,
            operation: 'ensure_authenticated_profile',
          },
          cause: createResult.error.cause,
        }),
      )
    }
    logProvisioning('create_succeeded')
    return createResult
  })().finally(() => {
    inFlightByUser.delete(session.user.id)
  })

  inFlightByUser.set(session.user.id, operation)
  return operation
}

export function __resetProfileProvisioningForTest(): void {
  inFlightByUser.clear()
}
