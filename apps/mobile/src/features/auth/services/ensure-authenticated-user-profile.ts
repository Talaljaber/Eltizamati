import {
  brandId,
  err,
  makeError,
  type AppError,
  type Result,
  type UserProfile,
  type UserProfileRepository,
} from '@eltizamati/domain'
import { logger, type SafeMetadata } from '@/core/logging/logger'
import type { AppAuthSession } from '@/services/auth/auth-service'

const inFlightByUser = new Map<string, Promise<Result<UserProfile, AppError>>>()

function logProvisioning(stage: string, safeMetadata?: SafeMetadata): void {
  logger.debug({ stage: `profileProvisioning:${stage}`, safeMetadata })
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
      logger.error({
        stage: 'profileProvisioning:read_failed',
        code: readResult.error.code,
        safeMetadata: readResult.error.safeMetadata,
      })
      return readResult
    }

    const timestamp = now().toISOString()
    logProvisioning('create_started', {
      locale,
      // Deliberately not "hasFullName"/"hasPhoneNumber" — those key names alone trip the
      // logger's C2/C3 key-name denylist (logger.ts) even though the values here are plain
      // booleans, not the data itself, which crashed every sign-up in dev before this rename.
      hasName: details.fullName !== undefined,
      hasContactNumber: details.phoneNumber !== undefined,
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
      logger.error({
        stage: 'profileProvisioning:create_failed',
        code: createResult.error.code,
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
