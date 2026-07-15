# ADR-0018 — Passwordless Email OTP for Personal Authentication

- **Status:** Accepted
- **Date:** 2026-07-15
- **Supersedes:** password, password-reset, password-update, and email-callback portions of ADR-0017 and Phase 4
- **Confidence:** High
- **Reversal cost:** Medium

## Context

Password sign-up/sign-in introduced separate screens, recovery callbacks, and a profile-provisioning gap. A row in `auth.users` and a row in `public.profiles` are different boundaries: missing profile data can block personal-mode startup, but it cannot cause Supabase password authentication to reject credentials.

## Decision

Eltizamati uses one email-only flow for new and returning personal-mode users:

1. `signInWithOtp({ email, options: { shouldCreateUser: true } })` requests a six-digit code.
2. The user enters that code in the app.
3. `verifyOtp({ email, token, type: 'email' })` must return a valid Supabase session.
4. The app establishes the user boundary, selects personal mode, obtains personal repositories, idempotently ensures the authenticated profile, enforces consent, waits for repository-provider commit, completes onboarding, enables authenticated notification navigation, and enters Home.
5. Later launches restore the Supabase session and repeat the profile/consent/repository readiness checks without another OTP.

Supabase remains the authority for auth users, sessions, refresh-token rotation, revocation, JWT identity, and `auth.uid()`. The mobile app does not implement passwords, custom JWTs, token refresh, or email delivery.

The OTP attempt owner is app-scoped and memory-only. It may hold the normalized email, masked display email, request/resend timestamps, and operation state. OTP codes are never persisted or logged, and full email addresses never enter routes.

Profile provisioning occurs only after successful OTP verification or valid session restoration. `createIfAbsent` is insert-only and re-reads on a uniqueness race, preserving locale, reminders, thresholds, timestamps, and future preferences.

Demo mode remains unauthenticated, network-independent, and visibly labeled.

## Email delivery and abuse controls

The local Supabase template uses `{{ .Token }}` and Mailpit. Hosted template, sender identity, custom SMTP, OTP expiry, resend frequency, rate limits, and SPF/DKIM/DMARC are owner-managed server-side settings. No SMTP or service-role credential belongs in the repository or Expo public environment.

The UI applies a 60-second resend cooldown, blocks concurrent request/verification operations, and maps invalid/expired codes, rate limits, connectivity failures, revoked sessions, authorization failures, and unexpected failures separately.

## Compatibility

`/auth/sign-up`, `/auth/reset`, `/auth/update-password`, and `/auth/callback` remain temporary safe redirects to `/auth/sign-in` so old navigation targets cannot activate password or magic-link behavior. They may be deleted after one release confirms no issued links or internal navigation depend on them.

## Consequences

- One non-enumerating entry flow replaces sign-up/sign-in distinctions.
- OTP delivery depends on correct server-side email configuration.
- An OTP request may create an unverified auth user; no profile is created until a verified session exists.
- Valid sessions continue to restore automatically.
- Password reset/update and callback code are removed.
- RLS policies and the account-deletion server contract are unchanged.

## Verification

Repository-verifiable evidence includes auth service tests, mounted email/code screens, profile idempotency/preservation tests, startup/entry ordering tests, existing user-boundary cleanup tests, pgTAP RLS tests, and local Mailpit integration harnesses. Hosted SMTP delivery and device OTP autofill require owner/device validation and must not be claimed from repository tests.
