# ADR-0014 — Error Architecture: Typed Result + Central AppError Taxonomy

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low

## Context & forces
SRC-1 §29 requires categorized, structured errors mapped to user-safe messages with retryability/severity/safe-metadata. Anti-patterns to prevent: catch-all handlers, stringly-typed errors, PII in logs (T-02).

## Alternatives
- **Thrown exceptions everywhere:** invisible control flow; AI agents notoriously produce try/catch-swallow blocks. Rejected for business outcomes.
- **Result<T, AppError> at service boundaries — chosen:** failures are values the compiler forces callers to handle; throwing reserved for programmer errors (caught by ErrorBoundary + Sentry).
- **neverthrow/fp-ts:** libraries add idiom weight; a 30-line local `Result` type suffices (anti-dependency rule). fp-ts explicitly rejected (steep idiom tax for agents and humans).

## Decision
`packages/domain/src/errors/`: `AppError` discriminated union (codes listed in system-architecture §5), each code declaring `retryable`, `severity`, `userMessageKey` (i18n), `safeMetadata` whitelist, recovery hint. One `errorToMessage(error, locale)` mapper; one ErrorBoundary; logger consumes only safe metadata.

## Consequences
Screen error states become exhaustive switches (state matrix maps to codes); new error codes require taxonomy entry first (review checklist) — no anonymous `throw new Error('oops')` in features (lint: no-restricted-syntax on `new Error` outside core).
