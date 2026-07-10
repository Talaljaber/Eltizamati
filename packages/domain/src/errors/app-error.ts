/**
 * AppError taxonomy — ADR-0014, system-architecture.md §5.
 *
 * Rules:
 *   - Services return Result<T, AppError> — failures are values, not thrown exceptions.
 *   - Each error code declares: retryable, severity, i18n key, safe metadata whitelist.
 *   - PII and financial values MUST NEVER appear in errors (NFR-SEC-004).
 *   - No catch-and-swallow — every AppError must reach a handler (AI_AGENT_RULES §11).
 */

// ─── Error codes ─────────────────────────────────────────────────────────────

export type AppErrorCode =
  // ── Domain / data ──────────────────────────────────────────────────────
  | 'validation'
  | 'notFound'
  | 'dataConflict'
  | 'dataIncomplete'
  // ── Calculation / engine ───────────────────────────────────────────────
  | 'calculationUnsupported'
  | 'calculationRefused'
  // ── Storage / infrastructure ───────────────────────────────────────────
  | 'storage'
  | 'migration'
  // ── Unexpected (programmer errors, caught by ErrorBoundary) ────────────
  | 'unexpected'
  // ── P1: auth / connectivity (defined now so errors.ts doesn't need updating at M6) ──
  | 'auth'
  | 'authorization'
  | 'consent'
  | 'connectivity'
  | 'providerUnavailable'
  | 'rateLimited'
  | 'sync'

// ─── Severity ────────────────────────────────────────────────────────────────

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

// ─── AppError shape ──────────────────────────────────────────────────────────

export interface AppError {
  readonly code: AppErrorCode
  readonly severity: ErrorSeverity
  readonly retryable: boolean
  /** i18n key for the user-visible message (routes through errorToMessage). */
  readonly userMessageKey: string
  /** Allowlisted safe metadata — NO PII, NO monetary values. */
  readonly safeMetadata?: Record<string, string | number | boolean> | undefined
  /** Suggestion for the UI about what the user can do next. */
  readonly recoveryHint?: string | undefined
  /** Original cause for logging (safe metadata only — scrub before sending). */
  readonly cause?: unknown | undefined
}

// ─── Catalogue of codes with their properties ────────────────────────────────

const ERROR_CATALOGUE: Record<
  AppErrorCode,
  Pick<AppError, 'severity' | 'retryable' | 'userMessageKey'>
> = {
  validation: { severity: 'warning', retryable: false, userMessageKey: 'error.validation' },
  notFound: { severity: 'warning', retryable: false, userMessageKey: 'error.notFound' },
  dataConflict: { severity: 'warning', retryable: false, userMessageKey: 'error.dataConflict' },
  dataIncomplete: { severity: 'info', retryable: false, userMessageKey: 'error.dataIncomplete' },
  calculationUnsupported: {
    severity: 'info',
    retryable: false,
    userMessageKey: 'error.calculationUnsupported',
  },
  calculationRefused: {
    severity: 'info',
    retryable: false,
    userMessageKey: 'error.calculationRefused',
  },
  storage: { severity: 'error', retryable: true, userMessageKey: 'error.storage' },
  migration: { severity: 'critical', retryable: false, userMessageKey: 'error.migration' },
  unexpected: { severity: 'critical', retryable: true, userMessageKey: 'error.unexpected' },
  auth: { severity: 'warning', retryable: true, userMessageKey: 'error.auth' },
  authorization: { severity: 'error', retryable: false, userMessageKey: 'error.authorization' },
  consent: { severity: 'warning', retryable: false, userMessageKey: 'error.consent' },
  connectivity: { severity: 'warning', retryable: true, userMessageKey: 'error.connectivity' },
  providerUnavailable: {
    severity: 'warning',
    retryable: true,
    userMessageKey: 'error.providerUnavailable',
  },
  rateLimited: { severity: 'warning', retryable: true, userMessageKey: 'error.rateLimited' },
  sync: { severity: 'warning', retryable: true, userMessageKey: 'error.sync' },
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function makeError(
  code: AppErrorCode,
  options?: {
    safeMetadata?: AppError['safeMetadata']
    recoveryHint?: string
    cause?: unknown
  },
): AppError {
  const catalogue = ERROR_CATALOGUE[code]
  return {
    code,
    severity: catalogue.severity,
    retryable: catalogue.retryable,
    userMessageKey: catalogue.userMessageKey,
    safeMetadata: options?.safeMetadata,
    recoveryHint: options?.recoveryHint,
    cause: options?.cause,
  }
}

// ─── Result type ─────────────────────────────────────────────────────────────

export type Result<T, E = AppError> = Ok<T> | Err<E>

export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

/** Map the ok value, pass through errors. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) return ok(fn(result.value))
  return result
}
