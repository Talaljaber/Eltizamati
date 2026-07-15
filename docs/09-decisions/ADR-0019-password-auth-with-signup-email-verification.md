# ADR-0019 — Password Authentication with First-Time Email Verification

**Status:** Accepted  
**Date:** 2026-07-15  
**Supersedes:** ADR-0018

## Decision

Personal accounts use separate email/password sign-up and sign-in flows. New registrations must
verify an eight-digit code from Supabase's **Confirm signup** email. The verified session creates the
RLS-owned profile and continues through the established consent/personal-entry pipeline without a
second sign-in. Returning verified users are not challenged with email OTP.
Supabase remains the sole password-hash, auth-user, JWT, refresh-token, and revocation authority.

New registrations collect full name, E.164 contact phone number, and primary bank name. These values
are held only in memory before verification and are written to the authenticated user's RLS-owned
profile after verification. The phone is contact data, not an authentication factor; a bank name does
not imply a live provider connection. Legacy profiles may keep these columns null.

Passwords never enter routes, application stores, logs, profile rows, or user metadata. The client
requires at least 12 characters; hosted password strength, leaked-password protection, email
confirmation, rate limits, CAPTCHA, and SMTP remain server-side owner settings.

## Consequences

- `/auth/sign-in` accepts email/password and restores the existing post-auth entry pipeline.
- `/auth/sign-up` collects the approved profile fields, email, password, and confirmation.
- `/auth/verify-code` is signup verification only; resend uses Supabase's `signup` type. Successful
  verification provisions the profile and enters personal mode through the established consent gate.
- Existing passwordless test accounts require deletion/re-registration in development or a separately
  reviewed password-recovery transition; calling sign-up again does not set a password.
- Hosted **Confirm signup** must render `{{ .Token }}` and must not render `{{ .ConfirmationURL }}`.
