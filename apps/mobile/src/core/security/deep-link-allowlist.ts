/**
 * Deep-link route allow-list (ADR-0005 — "deep-link allow-list implemented
 * as a route-guard module + tests"; security-controls.md §2 "Deep links"
 * row: "Allow-listed routes; params re-resolved").
 *
 * Expo Router auto-routes any URL matching a file under `app/` — including
 * paths a deep link (external website, SMS, QR code) supplies, which this
 * app never explicitly reviews per-link. This module is the explicit,
 * testable allow-list that a link is checked against before it's trusted:
 * anything not matching a known pattern here is rejected. Every entry below
 * corresponds to a real file under `apps/mobile/app/` — see that directory
 * for the source of truth if the two drift.
 *
 * Dynamic segments (`obligation/[id]`, `learn/[id]`) are pattern-checked
 * here for a plausible id *shape* only — the actual id is re-resolved
 * against real data by the destination screen, which already renders a
 * safe not-found state for an id that doesn't exist (obligation/[id].tsx,
 * learn/[id].tsx) rather than crashing or exposing another user's data.
 */

const ID_SEGMENT = '[A-Za-z0-9_-]{1,128}'

const ALLOWED_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/?$/,
  /^\(tabs\)\/?$/,
  /^\(tabs\)\/(learn|loans|obligations)\/?$/,
  /^\+not-found\/?$/,
  /^auth\/(callback|reset|sign-in|sign-up|update-password|verify-code)\/?$/,
  /^connect-mock(\/consent)?\/?$/,
  /^insights\/?$/,
  /^learn\/(assistant|compare|glossary)\/?$/,
  new RegExp(`^learn/${ID_SEGMENT}/?$`),
  /^legal-doc\/?$/,
  /^loan-application\/apply\/?$/,
  /^obligation\/add\/?$/,
  new RegExp(`^obligation/${ID_SEGMENT}\\/?$`),
  new RegExp(
    `^obligation/${ID_SEGMENT}/(bank-questions|card-simulator|edit|log-payment|log-rate|rate-history|rate-impact|scenario|schedule)/?$`,
  ),
  /^onboarding\/(consent|intro|language|mode)\/?$/,
  /^profile\/?$/,
  /^settings(\/(acknowledgments|data-status))?\/?$/,
]

function normalizePath(path: string): string {
  // Strip a leading scheme (`eltizamati://...`), leading slashes, and any
  // query string or fragment — only the route path itself is checked here.
  const withoutScheme = path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
  const withoutQuery = withoutScheme.split(/[?#]/)[0] ?? ''
  return withoutQuery.replace(/^\/+/, '')
}

export function isAllowedDeepLinkPath(path: string): boolean {
  const normalized = normalizePath(path)
  return ALLOWED_ROUTE_PATTERNS.some((pattern) => pattern.test(normalized))
}
