/**
 * AppError -> typed UI error state (Phase 4, system-architecture.md §5,
 * ADR-0017's offline contract). Query/mutation hooks map their Result's
 * error through this once, centrally, instead of each screen re-deriving
 * "is this offline / retryable / needs re-auth" from raw AppError codes.
 *
 * This is the mapping logic only — the actual message strings and
 * error/retry/offline UI components are built alongside the screens that
 * use them (Phase 7/8), per screen-inventory.md's per-screen state matrix.
 */
import type { AppError } from '@eltizamati/domain'

export type ErrorUiState =
  | { readonly kind: 'offline' }
  | { readonly kind: 'authRequired' }
  | { readonly kind: 'retryable'; readonly userMessageKey: string }
  | { readonly kind: 'fatal'; readonly userMessageKey: string }

export function toErrorUiState(error: AppError): ErrorUiState {
  if (error.code === 'connectivity') return { kind: 'offline' }
  if (error.code === 'auth') return { kind: 'authRequired' }
  if (error.code === 'authorization') {
    return { kind: 'fatal', userMessageKey: error.userMessageKey }
  }
  if (error.retryable) return { kind: 'retryable', userMessageKey: error.userMessageKey }
  return { kind: 'fatal', userMessageKey: error.userMessageKey }
}
