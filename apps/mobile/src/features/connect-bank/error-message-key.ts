import type { AppError } from '@eltizamati/domain'
import { toErrorUiState } from '@/core/errors/error-ui-state'

/**
 * Resolves an AppError to a single i18n message key for inline error text
 * (as opposed to `ErrorState`'s full empty-state treatment) — used where a
 * mutation failure (skip/finish/import) needs a short, retryable inline
 * message rather than replacing the whole screen.
 */
export function errorMessageKey(error: AppError): string {
  const state = toErrorUiState(error)
  switch (state.kind) {
    case 'offline':
      return 'error.offlineBody'
    case 'authRequired':
      return 'error.authRequiredBody'
    case 'retryable':
    case 'fatal':
      return state.userMessageKey
  }
}
