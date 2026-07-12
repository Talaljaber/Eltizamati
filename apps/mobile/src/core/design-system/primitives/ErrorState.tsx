import { useTranslation } from 'react-i18next'
import type { ErrorUiState } from '../../errors/error-ui-state'
import { EmptyState } from './EmptyState'

export interface ErrorStateProps {
  readonly state: ErrorUiState
  /** Omit to render without a retry CTA even for a retryable error. */
  readonly onRetry?: () => void
  /** SCR-AUTH-SIGNIN's "Continue in demo mode" — offered on `authRequired`. */
  readonly onContinueInDemoMode?: () => void
  readonly testID?: string
}

/**
 * ErrorState — renders the honest UI surface for a `toErrorUiState()`
 * result (core/errors/error-ui-state.ts): offline, auth-required, a
 * retryable failure, or a fatal one. No silent failures, no fake retry on
 * unrecoverable errors (screen-inventory.md's OF/ER states).
 */
export function ErrorState({ state, onRetry, onContinueInDemoMode, testID }: ErrorStateProps) {
  const { t } = useTranslation()

  switch (state.kind) {
    case 'offline':
      return (
        <EmptyState
          title={t('error.offlineTitle')}
          subtitle={t('error.offlineBody')}
          ctaLabel={onRetry ? t('common.retry') : undefined}
          onCta={onRetry}
          testID={testID}
        />
      )
    case 'authRequired':
      return (
        <EmptyState
          title={t('error.authRequiredTitle')}
          subtitle={t('error.authRequiredBody')}
          ctaLabel={onContinueInDemoMode ? t('onboarding.modeDemo') : undefined}
          onCta={onContinueInDemoMode}
          testID={testID}
        />
      )
    case 'retryable':
      return (
        <EmptyState
          title={t('common.errorTitle')}
          subtitle={t(state.userMessageKey)}
          ctaLabel={onRetry ? t('common.retry') : undefined}
          onCta={onRetry}
          testID={testID}
        />
      )
    case 'fatal':
      return (
        <EmptyState
          title={t('common.errorTitle')}
          subtitle={t(state.userMessageKey)}
          testID={testID}
        />
      )
  }
}
