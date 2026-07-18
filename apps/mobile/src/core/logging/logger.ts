/**
 * The app's one sanctioned `console.*` access point (security-controls.md §2
 * "Logging" row: "logger module is the only console access"). Every other
 * file is blocked from calling `console.*` directly by the root ESLint
 * `no-console: 'error'` rule.
 *
 * Dev builds print to the console for local debugging; release builds never
 * touch the console (there's no one watching it) and instead forward to
 * Sentry (ADR-0015 — release-only observability), as a breadcrumb for
 * info-level events or a captured message for warn/error.
 *
 * `safeMetadata` is a whitelist, not a blocklist: only flat, primitive
 * values are accepted, and any key that looks like it could carry C2/C3 data
 * (personal or financial — security-controls.md §1) is rejected before it
 * can reach either the console or Sentry. In dev this throws immediately so
 * the mistake is caught while writing the code; in release it drops the
 * offending key(s) rather than crash the user's app over a telemetry bug.
 */
import * as Sentry from '@sentry/react-native'
import { DomainInvariantError } from '@eltizamati/domain'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type SafeMetadataValue = string | number | boolean | null

export type SafeMetadata = Record<string, SafeMetadataValue>

export interface LogEvent {
  readonly stage: string
  readonly message?: string
  readonly code?: string
  readonly safeMetadata?: SafeMetadata
}

/**
 * Key-name denylist for C2 (personal) and C3 (sensitive financial) data —
 * defense in depth against a caller accidentally passing a raw entity field
 * as "safe" metadata. Matches by substring, case-insensitive, so both
 * `balance` and `currentBalance`/`balanceAmount` are caught.
 */
const FORBIDDEN_KEY_PATTERN =
  /password|passcode|otp|token|secret|email|phone|fullname|address|balance|amount|principal|payment|installment|rate\b|iban|cardnumber|accountnumber|institution|ssn|nationalid/i

function detectForbiddenKeys(metadata: SafeMetadata): readonly string[] {
  return Object.keys(metadata).filter((key) => FORBIDDEN_KEY_PATTERN.test(key))
}

function isDevRuntime(): boolean {
  return __DEV__ && process.env.NODE_ENV !== 'test'
}

/** Exported for direct unit testing of the detection rule, independent of environment branching. */
export function sanitizeMetadata(
  stage: string,
  metadata: SafeMetadata | undefined,
): SafeMetadata | undefined {
  if (metadata === undefined) return undefined
  const offending = detectForbiddenKeys(metadata)
  if (offending.length === 0) return metadata

  if (isDevRuntime()) {
    throw new DomainInvariantError(
      'validation',
      `logger: metadata key(s) [${offending.join(', ')}] at stage "${stage}" look like personal or financial data (C2/C3) and must not be logged. Use a coarser, pre-approved key instead.`,
    )
  }

  const sanitized: Record<string, SafeMetadataValue> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!offending.includes(key)) sanitized[key] = value
  }
  return sanitized
}

function emit(level: LogLevel, event: LogEvent): void {
  const safeMetadata = sanitizeMetadata(event.stage, event.safeMetadata)

  if (isDevRuntime()) {
    const consoleMethod = level === 'debug' ? 'log' : level
    // eslint-disable-next-line no-console -- this file is the app's one sanctioned console access point
    console[consoleMethod](
      `[${event.stage}]`,
      event.message ?? '',
      event.code ?? '',
      safeMetadata ?? {},
    )
    return
  }

  if (level === 'error' || level === 'warn') {
    Sentry.captureMessage(`${event.stage}: ${event.message ?? event.code ?? level}`, {
      level: level === 'error' ? 'error' : 'warning',
      tags: event.code !== undefined ? { code: event.code } : undefined,
      extra: safeMetadata,
    })
  } else {
    Sentry.addBreadcrumb({
      category: event.stage,
      message: event.message,
      level: 'info',
      data: safeMetadata,
    })
  }
}

export const logger = {
  debug: (event: LogEvent): void => emit('debug', event),
  info: (event: LogEvent): void => emit('info', event),
  warn: (event: LogEvent): void => emit('warn', event),
  error: (event: LogEvent): void => emit('error', event),
}
