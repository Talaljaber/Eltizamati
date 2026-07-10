# ADR-0015 — Observability: Sentry Only (MVP); Analytics Deferred

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low

## Context & forces

Solo dev needs release-crash truth (demo APK on judges' hands); privacy-by-design posture (PRIN-8) makes analytics a liability without a consent story; SRC-1 §30 lists candidate events but nothing in the MVP decision loop consumes them.

## Alternatives

- **Sentry (expo SDK) — chosen for crashes/errors:** first-class Expo support, sourcemaps via EAS, scrubbing hooks (NFR-SEC-004). Config: release builds only, `sendDefaultPii:false`, beforeSend scrubber, navigation breadcrumbs limited to screen names.
- **Firebase Crashlytics:** fine, but adds the Firebase SDK for one function; Sentry's TS/Expo path is cleaner. Rejected.
- **PostHog/Amplitude now:** deferred — adopting analytics before users exist optimizes nothing and taxes trust. When adopted (P3): self-hostable option preferred, event schemas reviewed against NFR-PRIV-004, and consent-gated per §20.2.

## Decision

Sentry in `preview`/`production` profiles; structured local logger elsewhere; the metric names that will matter (sync success, calculation refusal rate, app-start) are pre-registered in ci-cd-environments §4 so instrumentation lands with features, not as archaeology.
