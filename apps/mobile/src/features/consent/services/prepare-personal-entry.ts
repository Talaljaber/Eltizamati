import { brandId, ok, type AppError, type Result } from '@eltizamati/domain'
import { logger, type SafeMetadata } from '@/core/logging/logger'
import type { AppAuthSession } from '@/services/auth/auth-service'
import type { RepositoryRegistry } from '@/services/composition-root'
import { setDataMode, setOnboardingComplete } from '@/features/demo/stores/demo-mode-store'
import { notifyAuthBoundaryChanged } from '@/features/auth/services/auth-boundary-events'
import { ensureAuthenticatedUserProfile } from '@/features/auth/services/ensure-authenticated-user-profile'
import type { ProfileProvisioningDetails } from '@/features/auth/services/ensure-authenticated-user-profile'
import {
  CURRENT_CONSENT_DOC_TYPE,
  CURRENT_CONSENT_VERSION,
  acknowledgeLocalConsent,
  ensurePersonalConsent,
  isCurrentLocalConsent,
  readLocalConsent,
} from '@/features/consent/consent-policy'
import { enableNotificationNavigation } from '@/services/local-notification-service'
import { hasCompletedBankConnect } from '@/features/connect-bank/bank-connect-policy'

export type PersonalEntryPreparation = 'ready' | 'consentRequired' | 'bankConnectRequired'

export interface PreparePersonalEntryDependencies {
  readonly session: AppAuthSession
  readonly locale: 'en' | 'ar'
  readonly repositories: RepositoryRegistry
  readonly bootPersonalMode: () => Promise<void>
  readonly profileDetails?: ProfileProvisioningDetails
}

function logPersonalEntry(stage: string, safeMetadata?: SafeMetadata): void {
  const level = stage.endsWith('_failed') ? 'warn' : 'debug'
  logger[level]({ stage: `personalEntry:${stage}`, safeMetadata })
}

export async function preparePersonalEntry({
  session,
  locale,
  repositories,
  bootPersonalMode,
  profileDetails,
}: PreparePersonalEntryDependencies): Promise<Result<PersonalEntryPreparation, AppError>> {
  // The verified/restored session is already the auth boundary. Mark personal
  // mode before notifying the boundary coordinator so it can reconcile it.
  await setDataMode('personal')
  logPersonalEntry('data_mode_saved')
  notifyAuthBoundaryChanged()
  logPersonalEntry('auth_boundary_notified')

  logPersonalEntry('profile_started')
  const profileResult = await ensureAuthenticatedUserProfile(
    session,
    locale,
    repositories.userProfileRepository,
    profileDetails,
  )
  if (!profileResult.ok) {
    logPersonalEntry('profile_failed', { appErrorCode: profileResult.error.code })
    return profileResult
  }
  logPersonalEntry('profile_ready')

  const userId = brandId<'user'>(session.user.id)

  logPersonalEntry('local_consent_read_started')
  const localResult = await readLocalConsent()
  if (!localResult.ok) {
    logPersonalEntry('local_consent_read_failed', { appErrorCode: localResult.error.code })
    return localResult
  }

  if (isCurrentLocalConsent(localResult.value)) {
    logPersonalEntry('local_consent_ready')
    logPersonalEntry('server_consent_started')
    const consentResult = await ensurePersonalConsent(userId, repositories.consentRepository)
    if (!consentResult.ok) {
      logPersonalEntry('server_consent_failed', { appErrorCode: consentResult.error.code })
      return consentResult
    }
    logPersonalEntry('server_consent_ready')
  } else {
    // Consent is account-scoped, not device-scoped: if this account already
    // acknowledged the current policy (at sign-up, or on another device), a
    // missing local flag must NOT force the consent screen again on sign-in.
    logPersonalEntry('local_consent_missing_checking_server')
    const statusResult = await repositories.consentRepository.status(userId)
    if (!statusResult.ok) {
      logPersonalEntry('server_consent_status_failed', { appErrorCode: statusResult.error.code })
      return statusResult
    }
    const hasServerConsent = statusResult.value.some(
      (record) =>
        record.docType === CURRENT_CONSENT_DOC_TYPE && record.version === CURRENT_CONSENT_VERSION,
    )
    if (!hasServerConsent) {
      logPersonalEntry('local_consent_required')
      return ok('consentRequired')
    }
    // Re-seed the local flag so subsequent cold starts are fast and offline-safe.
    await acknowledgeLocalConsent(locale)
    logPersonalEntry('server_consent_ready')
  }

  // Resolves only after RepositoriesProvider has committed the registry.
  logPersonalEntry('repository_boot_started')
  await bootPersonalMode()
  logPersonalEntry('repository_boot_ready')
  await setOnboardingComplete()
  logPersonalEntry('onboarding_saved')
  enableNotificationNavigation()

  // The single decision point both post-verification entry (use-entry-completion.ts)
  // and cold start (StartupCoordinator.tsx) rely on — neither computes this
  // independently, so an app killed mid-/connect-bank/ always resumes there
  // instead of one path remembering the interruption and the other not.
  if (!hasCompletedBankConnect(profileResult.value)) {
    logPersonalEntry('bank_connect_required')
    return ok('bankConnectRequired')
  }

  logPersonalEntry('ready')
  return ok('ready')
}
