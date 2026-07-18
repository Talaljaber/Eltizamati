/**
 * Sentry wiring (ADR-0015 — Sentry-only observability, release builds only).
 *
 * `initSentry()` is a no-op unless both conditions hold: the JS bundle is a
 * release build (`!__DEV__` — true in EAS `preview`/`production` profiles,
 * false in `development` and in Expo Go) AND a DSN has been supplied via
 * `EXPO_PUBLIC_SENTRY_DSN`. Without a DSN (the default until a Sentry
 * project exists), Sentry stays fully inert — no network calls, no SDK
 * initialization — so this file is safe to import unconditionally.
 *
 * Per ADR-0015 / security-controls.md §2 "Crash reporting": `sendDefaultPii:
 * false`, a `beforeSend` scrubber, and breadcrumbs limited to screen names
 * (never route params, which can carry an obligation id or other C2/C3-
 * adjacent value from a deep link).
 */
import * as Sentry from '@sentry/react-native'
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native'

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

/** Field-name denylist mirrors core/logging/logger.ts's C2/C3 pattern, kept
 * independent so a bug in one scrubber can never silently disable the other. */
const FORBIDDEN_KEY_PATTERN =
  /password|passcode|otp|token|secret|email|phone|fullname|address|balance|amount|principal|payment|installment|rate\b|iban|cardnumber|accountnumber|institution|ssn|nationalid/i

function scrubRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (record === undefined) return undefined
  const scrubbed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) continue
    scrubbed[key] = value
  }
  return scrubbed
}

/** Exported for direct unit testing, independent of whether Sentry.init ever runs. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  return {
    ...event,
    user: undefined, // sendDefaultPii:false already prevents this; scrubbed again defensively
    request: undefined, // strip any captured request (headers/cookies could carry a session token)
    extra: scrubRecord(event.extra),
    tags: (scrubRecord(event.tags as Record<string, unknown> | undefined) ??
      {}) as ErrorEvent['tags'],
  }
}

/** Exported for direct unit testing, independent of whether Sentry.init ever runs. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'navigation') {
    // Keep only the destination screen name — never params, which can carry
    // an obligation id or a value that arrived via deep link.
    const to = (breadcrumb.data as Record<string, unknown> | undefined)?.to
    return { ...breadcrumb, data: typeof to === 'string' ? { to } : undefined }
  }
  return { ...breadcrumb, data: scrubRecord(breadcrumb.data) }
}

export function isSentryConfigured(): boolean {
  return !__DEV__ && dsn !== undefined && dsn.length > 0
}

export function initSentry(): void {
  if (!isSentryConfigured()) return

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    // Crash/error reporting only, per ADR-0015 — performance tracing isn't adopted yet.
    tracesSampleRate: 0,
  })
}
