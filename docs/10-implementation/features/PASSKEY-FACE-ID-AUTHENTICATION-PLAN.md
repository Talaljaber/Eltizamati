# Passkey ("Face ID") Authentication Implementation Plan

**Status:** Future vision — deferred indefinitely, not scheduled. No implementation work is in
progress or planned until the blocker below is resolved.  
**Date:** 2026-07-17  
**Owner:** Mobile and Identity Engineering  
**Risk:** High integration risk, moderate application-code complexity  
**Scope:** Expo React Native mobile app, Supabase Auth, iOS, Android, and existing auth UX

## 0. Why this is deferred

The iOS half of this feature has a hard, non-technical blocker: Apple gates the **Associated
Domains** capability (required to verify a passkey relying-party domain against the app) behind a
paid Apple Developer Program membership ($99/year). There is no free-tier path around it. That cost
is not available right now, so this feature is shelved rather than partially built.

A brief code spike (Supabase client passkey wiring, service contracts, error mapping, unit tests)
was written and then **deliberately discarded** rather than left half-integrated in the working
tree, so the codebase stays exactly as it was: email/password sign-in fully functional, Face ID and
Sanad both showing their existing preview-only buttons. Nothing about this feature is blocking or
partially wired into the app today.

If revisited later — whether funding appears specifically for this, or the team enrolls in Apple
Developer for App Store distribution anyway and the cost is no longer incremental — the plan below
remains valid as written and Phase 0 is the correct re-entry point. One addition worth folding in at
that time: `eltizamati.netlify.app` was identified as an available, dedicated (not shared with other
projects) Netlify site that could serve as the relying-party domain and host the
`.well-known` association files, which resolves the "shared relying-party domain" open item in §10.1
for free. Android passkey support (§10.3) has no equivalent cost blocker and could proceed
independently if ever prioritized.

## 1. Executive Summary

Implement the existing **Face ID** sign-in option as passwordless authentication backed by
**passkeys**, not as a local biometric lock and not as storage for the user's email or password.
Supabase Auth remains the authority for users, passkey public keys, challenges, verification,
sessions, and revocation. The device credential provider keeps the private key and protects its use
with the device's available user-verification method, such as face recognition, fingerprint, device
PIN, or screen lock.

The sign-in screen will always show the same three methods:

1. Email and password, fully functional.
2. Face ID, implemented as a discoverable passkey flow that does not ask for email first.
3. Sanad, retained as a separate future integration and left unavailable until its own project is
   approved.

Passkey enrollment is optional. New clients are offered enrollment after email verification and
profile provisioning. Existing authenticated clients can enroll and manage passkeys from Settings.
Clients who skip enrollment, cancel a biometric prompt, use an unsupported device, or have no
matching passkey can always use email and password.

This is not a code-only release. It does not require users to install another app, but production
passkeys require Supabase Auth configuration, a stable relying-party domain, native app signing
identities, Apple and Android domain-association files, native development builds, and real-device
testing.

## 2. Product Decisions Already Agreed

| Decision               | Required behavior                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Sign-in choices        | Email/password, Face ID, and Sanad remain visible at all times.                                        |
| Face ID meaning        | A real passwordless passkey sign-in, not local session unlock.                                         |
| Identifierless sign-in | Face ID sign-in does not request email or password before the OS prompt.                               |
| New-client setup       | Offer passkey enrollment after verified sign-up and profile provisioning.                              |
| Existing-client setup  | Add passkey enrollment and management to authenticated Settings.                                       |
| Enrollment             | Optional and skippable.                                                                                |
| Fallback               | Email/password remains available after every passkey failure or cancellation.                          |
| Android label          | Keep the familiar product label "Face ID"; explanatory copy may say face, fingerprint, or device lock. |
| Sanad                  | Independent future provider; this feature must not couple passkey and Sanad code.                      |
| Session lifetime       | Preserve the current process-only session policy unless a separate product decision changes it.        |

## 3. Terminology and UX Truthfulness

The implementation and engineering documentation should use **passkey**. The primary UI label may
remain **Face ID** for product familiarity, but supporting and error copy must not promise that every
device will use facial recognition. Android commonly uses fingerprint or device PIN, and Apple may
offer Touch ID, Face ID, a passcode, another device, or a credential provider.

Recommended copy:

| Context                       | English copy intent                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Sign-in action                | `Sign in with Face ID`                                                                       |
| Supporting accessibility hint | `Use a passkey with your device's face, fingerprint, or screen lock.`                        |
| Enrollment title              | `Set up Face ID sign-in`                                                                     |
| Enrollment body               | `Create a passkey so you can sign in without entering your email and password.`              |
| Skip action                   | `Not now`                                                                                    |
| No credential                 | `No Face ID sign-in was found. Sign in with email and password, then set it up in Settings.` |
| Unsupported device            | `Face ID sign-in is not available on this device. Use email and password.`                   |
| Cancellation                  | No alarming error; remain on the sign-in screen with all methods available.                  |

Arabic copy must be authored and reviewed by an Arabic-speaking reviewer under the existing
localization policy. It must explain the concept rather than transliterate technical English.

## 4. Current-State Findings

- `apps/mobile/app/auth/sign-in.tsx` already renders Face ID and Sanad buttons, but both call a
  preview-only alert.
- `AuthService` currently exposes password sign-up/sign-in, signup OTP verification, session
  lifecycle, sign-out, and account deletion.
- `SupabaseAuthService` is the correct infrastructure boundary for all Supabase Auth calls.
- `@supabase/supabase-js` is currently `^2.45.4`; Supabase passkeys require `2.105.0` or later.
- The Supabase client currently has `persistSession: false` and `autoRefreshToken: false`. A session
  intentionally ends when the app process closes. Passkey work must not silently change that policy.
- Signup OTP verification currently calls the shared personal-entry pipeline, which provisions the
  profile, resolves consent, boots repositories, and navigates. Passkey enrollment must be inserted
  after profile provisioning without duplicating those responsibilities.
- Settings already has an authenticated account section and a namespaced `authKeys` query factory.
- Demo mode must remain offline and must never construct or call the Supabase client.

## 5. Target Architecture

```text
Sign-in screen
    |
    +-- Email/password ----------> AuthService.signIn()
    |
    +-- Face ID -----------------> AuthService.signInWithPasskey()
    |                                  |
    |                                  +-- Supabase startAuthentication()
    |                                  +-- NativePasskeyClient.get()
    |                                  +-- Supabase verifyAuthentication()
    |
    +-- Sanad --------------------> Future SanadAuthProvider (out of scope)

Verified signup / authenticated Settings
    |
    +-- AuthService.registerPasskey()
            |
            +-- Supabase startRegistration()
            +-- NativePasskeyClient.create()
            +-- Supabase verifyRegistration()

Supabase Auth owns users, challenges, public keys, and sessions.
Apple/Google/credential providers own private keys and biometric/device verification.
The application database stores neither passkey secrets nor enrollment booleans.
```

### 5.1 Why the two-step Supabase API is required

The high-level `registerPasskey()` and `signInWithPasskey()` methods invoke browser WebAuthn APIs.
React Native does not provide `navigator.credentials` on iOS or Android. Use Supabase's two-step API:

1. Request registration or authentication options and a challenge ID from Supabase.
2. Run the WebAuthn ceremony through a native Expo-compatible passkey module.
3. Send the native credential response and challenge ID to Supabase for verification.

Do not implement WebAuthn cryptography, challenge verification, credential storage, or signature
validation in application code or an Edge Function.

### 5.2 Native passkey adapter

Introduce a narrow application-owned port so auth logic does not depend directly on a community
package:

```ts
export interface NativePasskeyClient {
  isSupported(): Promise<boolean>
  create(options: PublicKeyCredentialCreationOptionsJSON): Promise<RegistrationCredentialJSON>
  get(options: PublicKeyCredentialRequestOptionsJSON): Promise<AuthenticationCredentialJSON>
}
```

Recommended implementation candidate: pin and wrap `react-native-passkeys` after a time-boxed
compatibility and security spike. It provides an Expo module and WebAuthn-shaped `create`/`get` APIs
for iOS and Android. The spike is a hard gate because this is a security-sensitive community native
dependency, Supabase passkeys are experimental, and the app uses Expo SDK 54 with the New
Architecture enabled.

Acceptance criteria for the library spike:

- Compatible with Expo SDK 54, React Native 0.81, New Architecture, pnpm, and EAS builds.
- Registration and authentication response JSON is accepted by Supabase's verify methods without
  lossy or hand-written binary transformations.
- Uses Apple AuthenticationServices and Android Credential Manager.
- Supports discoverable credentials and required user verification.
- Has an acceptable maintenance cadence, license, dependency tree, and unresolved security issue
  profile.
- Cancellation and no-credential errors can be distinguished from provider, network, and
  verification failures.
- Does not require Expo Go; development builds and real devices are an accepted requirement.

If the candidate fails this gate, evaluate `react-native-passkey` behind the same port. Do not change
Supabase or application service contracts during the fallback evaluation.

## 6. Service Contracts and Data Types

Extend `AuthService` with provider-neutral passkey operations:

```ts
export interface AppPasskey {
  readonly id: string
  readonly friendlyName: string | undefined
  readonly createdAt: string
  readonly lastUsedAt: string | undefined
}

export interface AuthService {
  // Existing methods remain unchanged.
  signInWithPasskey(): Promise<Result<AppAuthSession, AppError>>
  registerPasskey(): Promise<Result<AppPasskey, AppError>>
  listPasskeys(): Promise<Result<readonly AppPasskey[], AppError>>
  renamePasskey(passkeyId: string, friendlyName: string): Promise<Result<void, AppError>>
  deletePasskey(passkeyId: string): Promise<Result<void, AppError>>
  isPasskeySupported(): Promise<boolean>
}
```

Rules:

- UI and feature hooks depend only on `AuthService` and application types.
- Supabase types and native-library types stay inside `src/services/auth/` adapters.
- Validate passkey IDs as opaque non-empty identifiers.
- Trim names, reject empty values, and enforce Supabase's 120-character friendly-name limit before
  sending an update.
- Never log challenge IDs, credential IDs, attestation objects, assertions, access tokens, or raw
  provider errors.
- Do not expose an `isFaceIdEnrolled` profile field. It would become stale when credentials are
  deleted from another device or through Supabase administration.

## 7. Application Flows

### 7.1 Returning client: passkey sign-in

1. Client opens the sign-in screen; all three methods are visible.
2. Client taps Face ID.
3. Disable only conflicting auth submissions and show progress on the Face ID action.
4. Call `AuthService.signInWithPasskey()` with no email or password.
5. Supabase creates an authentication challenge.
6. The native credential provider displays its account and user-verification UI.
7. Supabase verifies the signed assertion and returns a normal authenticated session.
8. Pass the session to the existing `completePersonalEntry(session)` flow.
9. Existing profile repair, consent, repository boot, data mode, cache boundary, and navigation rules
   remain authoritative.
10. On cancellation, no credential, unsupported platform, or recoverable failure, stay on sign-in and
    preserve the email/password and Sanad choices.

The app cannot know before authentication whether a client has an enrolled passkey. It must attempt
the discoverable credential flow and handle the native/provider result honestly.

### 7.2 New client: optional enrollment after sign-up

Required sequence:

```text
Sign up with email/password
  -> verify signup email code
  -> obtain authenticated session
  -> provision/repair RLS-owned profile
  -> offer optional Face ID enrollment
      -> success: continue
      -> skip/cancel/recoverable error: continue
  -> resolve personal consent
  -> boot personal repositories
  -> enter app
```

Refactor the current entry pipeline into explicit, reusable stages instead of duplicating profile or
consent logic:

- Stage A: establish the personal auth boundary and ensure the profile.
- Stage B: for a newly verified signup only, route to `/auth/passkey-enrollment` with an in-memory
  continuation token/state; never place session, email, password, or profile values in route params.
- Stage C: after success or skip, resume consent, repository boot, and home navigation.

The enrollment screen must be idempotent. If registration reports that the same credential already
exists, treat it as an already-configured success and continue. If the app closes before completion,
the current process-only session ends; the user can sign in with email/password and enroll later in
Settings.

Do not automatically open a biometric prompt immediately after OTP verification. Show a clear
optional screen first so the OS prompt is caused by an explicit client action.

### 7.3 Existing client: Settings enrollment and management

Add a **Sign-in and security** section for authenticated personal mode only.

On section load:

1. Check native support.
2. Query `listPasskeys()` using `authKeys.passkeys(userId)`.
3. Render an honest loading, empty, populated, offline, or unavailable state.

Actions:

- `Set up Face ID`: register a new passkey after explicit confirmation/action.
- List each passkey by friendly name and creation/last-used metadata when available.
- Rename a passkey using a validated text input.
- Remove a passkey only after confirmation.
- Prevent or strongly warn against deleting the last passkey only if product later removes password
  fallback. Under the current three-method policy, password fallback remains, so deletion is allowed.
- Refresh the list after registration, rename, or deletion.

Do not implement a misleading binary toggle. A user may have multiple passkeys across devices and
providers; a list with add/manage actions reflects the real credential model.

### 7.4 Sign-out and account deletion

- Sign-out ends the Supabase session but does not delete passkeys.
- Local cleanup behavior remains unchanged.
- Account deletion through Supabase Auth removes the user and provider-owned passkeys as part of the
  Auth identity. Verify this behavior against the deployed Supabase version during acceptance.
- Never attempt to delete a device-provider passkey directly from the app after account deletion;
  credential-provider cleanup is controlled by the operating system/provider.

## 8. Error Model

Add safe passkey reasons to the existing `AppError` mapping rather than exposing provider messages:

| Provider/native condition     | App error                             | Safe reason                   | UX behavior                                                                 |
| ----------------------------- | ------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| User cancels prompt           | `auth`                                | `passkey_cancelled`           | Stay in place; no alarming alert.                                           |
| No matching credential        | `auth`                                | `passkey_not_found`           | Explain setup path and password fallback.                                   |
| Device/API unsupported        | `providerUnavailable`                 | `passkey_unsupported`         | Explain password fallback.                                                  |
| Feature disabled in Supabase  | `providerUnavailable`                 | `passkey_disabled`            | Generic temporary-unavailable copy; diagnostic code only in safe telemetry. |
| Credential already registered | Success/idempotent                    | `passkey_exists`              | Refresh list or continue signup.                                            |
| Too many passkeys             | `validation` or `providerUnavailable` | `passkey_limit`               | Ask client to remove an old passkey in Settings.                            |
| Challenge expired/missing     | `auth`                                | `passkey_challenge_expired`   | Retry from a new challenge. Never reuse one.                                |
| Verification failed           | `auth`                                | `passkey_verification_failed` | Offer one retry and password fallback.                                      |
| Network unavailable           | `connectivity`                        | Existing mapping              | Existing offline UI and retry behavior.                                     |
| User banned/unconfirmed       | `auth`                                | Existing account reason       | Existing account-support path.                                              |
| Unknown native error          | `unexpected`                          | `passkey_native_failure`      | Safe generic message and sanitized telemetry.                               |

One user gesture must produce one challenge and at most one verification attempt. Retries start a new
ceremony. Do not retry biometric prompts automatically.

## 9. Supabase Plan

### 9.1 SQL migrations

**No application SQL migration is required or recommended.** Supabase Auth stores passkey data in its
managed Auth schema. The application must not create a public passkey table, copy credential IDs into
profiles, or write passkey state into user metadata.

Therefore, the implementation change set should contain no new file under `supabase/migrations/` for
this feature. If implementation discovers a genuine application-owned data requirement, stop and
review it separately before authoring a migration. Do not apply any migration locally or remotely as
part of this planning work.

### 9.2 Local configuration artifact to author during implementation

Passkeys are enabled through Supabase Auth configuration, not SQL. Prepare, but do not apply, this
configuration after the production relying-party domain is approved:

```toml
[auth.passkey]
enabled = true

[auth.webauthn]
rp_display_name = "Eltizamati"
rp_id = "<approved-stable-rp-domain>"
rp_origins = [
  "https://<approved-stable-rp-domain>",
  "android:apk-key-hash:<release-certificate-sha256-base64url>"
]
```

The exact accepted iOS/native origin behavior must be verified in a hosted Supabase staging project
during the spike. Do not guess or commit placeholders as deployable production configuration.

### 9.3 Hosted owner actions

These are deployment prerequisites, not database migrations:

- Upgrade hosted Supabase Auth to a version that supports passkeys, if applicable.
- Enable Passkey Authentication in Authentication -> Passkeys.
- Set the relying-party display name, ID, and allowed origins.
- Keep the RP ID stable. Changing it invalidates all existing passkeys.
- Confirm email verification remains enabled because passkey registration requires a confirmed,
  non-anonymous user.
- Record a rollback procedure that disables new passkey ceremonies without affecting password login.
- Verify rate limits, Auth logs, banned-user behavior, and account deletion in staging.

## 10. Native Platform and Domain Setup

### 10.1 Shared relying-party domain

Choose a production-controlled HTTPS domain before implementation exits the spike, for example an
approved authentication subdomain. It must remain stable for the lifetime of enrolled credentials.
The domain must host association files with HTTP 200 responses, correct JSON content types, no
redirect surprises, and production values for app identities and signing certificates.

### 10.2 iOS

- Use bundle identifier `com.eltizamati.app` unless the release identity changes before enrollment.
- Add the Associated Domains entitlement: `webcredentials:<approved-rp-domain>`.
- Host `/.well-known/apple-app-site-association` with a `webcredentials.apps` entry containing the
  Apple Team ID and bundle ID.
- Confirm the App ID has the required capability in the Apple Developer account.
- Build a development client/EAS binary; Expo Go cannot validate this native integration.
- Test on a physical Face ID device and, if supported by the release matrix, a Touch ID device.

### 10.3 Android

- Use package name `com.eltizamati.app` unless the release identity changes before enrollment.
- Use Android Credential Manager through the selected native adapter.
- Host `/.well-known/assetlinks.json` for each allowed signing certificate with
  `delegate_permission/common.get_login_creds`.
- Include development/staging and production certificate fingerprints only in their appropriate
  environments. Do not accidentally authorize a debug certificate in production.
- Compute the Supabase Android origin from the release signing certificate exactly as documented:
  `android:apk-key-hash:<base64url SHA-256 certificate hash>`.
- Verify Digital Asset Links from a public device/network and test at least one current Google
  Password Manager device. Add a Samsung device to the compatibility matrix if it is part of the
  supported customer base.

## 11. Dependency and Client Upgrade Plan

1. Pin `@supabase/supabase-js` to a reviewed version at or above `2.105.0`; do not leave a broad caret
   range for this experimental authentication surface.
2. Pin the selected native passkey library and commit the pnpm lockfile.
3. Review Supabase release notes from the current version through the target version for Auth,
   TypeScript, React Native, lock, and session changes.
4. Add `auth.experimental.passkey = true` to the single Supabase client construction point.
5. Preserve `persistSession: false`, `autoRefreshToken: false`, SecureStore boundaries, and the
   existing AppState lifecycle unless separately approved.
6. Run the full repository gate after each dependency upgrade before adding feature behavior, so
   dependency regressions are isolated from passkey-flow defects.
7. Confirm generated database types remain unchanged; passkey Auth types do not require public
   database type regeneration.

## 12. Planned Code Changes

### 12.1 Infrastructure and contracts

| File/area                                         | Planned change                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/mobile/package.json` and lockfile           | Pin reviewed Supabase and native passkey versions.                           |
| `src/core/supabase/client.ts`                     | Enable experimental passkeys; preserve session policy.                       |
| `src/services/auth/auth-service.ts`               | Add passkey domain types and methods.                                        |
| `src/services/auth/native-passkey-client.ts`      | Define native ceremony port and normalized errors.                           |
| `src/services/auth/expo-native-passkey-client.ts` | Wrap selected native module and JSON conversion.                             |
| `src/services/auth/supabase-auth-service.ts`      | Orchestrate start/native/verify, list/update/delete, and safe error mapping. |
| `src/features/auth/api/keys.ts`                   | Add `passkeys(userId)` under the auth namespace.                             |
| `src/features/auth/api/use-auth-mutations.ts`     | Add passkey sign-in and signup-enrollment mutations.                         |
| New passkey management hooks                      | Add list, register, rename, and delete query/mutations for Settings.         |

### 12.2 UI and flow coordination

| File/area                                            | Planned change                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/auth/sign-in.tsx`                               | Replace Face ID preview alert with real passkey mutation and entry completion; keep Sanad preview-only.     |
| New `app/auth/passkey-enrollment.tsx`                | Optional, explicit enrollment screen for newly verified users.                                              |
| `app/auth/verify-code.tsx`                           | Continue into staged signup completion after profile provisioning.                                          |
| Personal-entry services/hooks                        | Split profile preparation from consent/boot continuation without duplicating logic.                         |
| `app/settings/index.tsx` or dedicated security route | Add authenticated passkey list and management entry. Prefer a dedicated route if the section becomes dense. |
| `app/_layout.tsx`                                    | Register enrollment/security routes with correct auth guards.                                               |
| EN/AR translations                                   | Add labels, hints, states, confirmations, and safe error messages.                                          |
| Existing mocks/test factories                        | Implement every new `AuthService` method to retain structural typing.                                       |

### 12.3 Auth guards

- Signup enrollment requires a current authenticated, confirmed session.
- Passkey management requires authenticated personal mode.
- Sign-in passkey flow is available while signed out.
- Demo mode does not query passkeys or initialize native passkey management.
- Navigating directly to enrollment or management without a session redirects to sign-in.
- A passkey-authenticated session enters through the same user-boundary cleanup and repository boot
  path as a password-authenticated session.

## 13. Security Requirements and Threat Controls

| Threat/failure                      | Control                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Phishing or origin confusion        | Stable RP ID, verified origins, AASA/DAL association, native APIs only.                     |
| Private-key exposure                | Private key never leaves credential provider; app receives only WebAuthn response material. |
| Replay                              | Supabase-generated one-time challenges; never cache or reuse challenges.                    |
| Account enumeration                 | Identifierless discoverable flow; generic no-credential response; no email lookup endpoint. |
| Credential substitution             | Supabase verifies RP, origin, challenge, signature, and credential ownership.               |
| Sensitive logging                   | Structured allow-listed reason codes only; no credential/challenge/assertion/token values.  |
| Stale enrollment state              | Query Supabase Auth after authentication; do not persist a profile boolean.                 |
| Cross-user cache leakage            | Reuse existing auth-boundary cleanup and user-scoped query keys.                            |
| Native dependency compromise        | Pin versions, audit source/dependencies, isolate behind port, monitor advisories.           |
| Experimental API change             | Feature flag, staged rollout, contract tests, and pinned Supabase client.                   |
| Debug signing trusted in production | Environment-specific association files and certificate review gate.                         |
| Lockout                             | Password sign-in always remains visible and functional; enrollment is optional.             |

Biometric data is not received or stored by Eltizamati or Supabase. The operating system performs
local user verification. Privacy and help content should say this explicitly without claiming which
biometric modality the device will use.

## 14. Test Strategy

### 14.1 Unit tests

- Supabase start -> native ceremony -> verify sequencing for registration and authentication.
- No verify call after native cancellation or failure.
- Fresh challenge requested on retry.
- Response JSON/base64url conversion fixtures for iOS and Android adapters.
- Mapping for every documented Supabase passkey error code and normalized native cancellation code.
- Session returned from passkey verification maps to `AppAuthSession` exactly like password sign-in.
- Passkey list/update/delete mapping and 120-character name validation.
- Unsupported-device behavior.
- No sensitive values in safe metadata or test telemetry payloads.

### 14.2 Screen and hook tests

- All three sign-in methods always render.
- Face ID no longer calls preview-only behavior; Sanad still does.
- Face ID loading state prevents duplicate ceremonies.
- Successful passkey sign-in calls `completePersonalEntry` exactly once.
- Cancellation remains on sign-in and leaves password fields/actions usable.
- No-credential, unsupported, offline, disabled, and verification-failed copy is correct.
- New signup sees optional enrollment only after verification/profile success.
- Skip and recoverable enrollment failure both continue to consent/home.
- Direct enrollment route without session redirects safely.
- Settings only shows passkey management for authenticated personal mode.
- Settings renders empty/list/error states and refreshes after mutations.
- Demo entry remains independent from Supabase and native passkey APIs.
- EN and AR layouts fit without overlap; accessibility labels describe device authentication honestly.

### 14.3 Supabase integration tests

Use a disposable/staging Supabase environment with passkeys configured. Do not apply SQL migrations
for this feature. Mocking the native ceremony remains acceptable for transport contract tests, but
the final gate requires real native ceremonies.

- Start and verify registration for a confirmed test user.
- Reject registration for anonymous/unconfirmed users.
- Authenticate without email using a registered discoverable credential.
- Confirm invalid, reused, and expired challenges fail.
- List, rename, and delete credentials only for the authenticated owner.
- Confirm password login still works before and after passkey enrollment/deletion.
- Confirm banned and deleted users cannot authenticate with an old passkey.
- Confirm account deletion removes server-side passkey records.

### 14.4 Physical-device matrix

Minimum release evidence:

| Platform                              | Required scenarios                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| iPhone with Face ID                   | Register after signup, sign out, passkey sign in, cancel, delete, password fallback.   |
| Android with fingerprint/PIN          | Same flow through Credential Manager and Google Password Manager.                      |
| Device with no usable passkey support | Unsupported state and password fallback.                                               |
| Second device or synced provider      | Sign in with a synced/cross-device credential where supported.                         |
| Reinstalled app                       | Passkey remains provider-managed; sign-in succeeds if domain/app association is valid. |
| Offline device                        | Honest connectivity failure, no looping prompt, password remains visible.              |

Also verify release-signed builds. Debug-only success is not release evidence because Android origins
and association files depend on signing certificates.

## 15. Observability and Support

Emit sanitized events through the existing approved observability path only after privacy review:

- `passkey_enrollment_started`
- `passkey_enrollment_succeeded`
- `passkey_enrollment_cancelled`
- `passkey_enrollment_failed` with allow-listed reason
- `passkey_sign_in_started`
- `passkey_sign_in_succeeded`
- `passkey_sign_in_cancelled`
- `passkey_sign_in_failed` with allow-listed reason
- `passkey_deleted`

Never attach email, user ID, credential ID, friendly name, challenge ID, assertion data, IP-derived
location, or raw error text. Success/failure ratios should be segmented only by coarse app version
and platform where policy permits.

Prepare support guidance for:

- No passkey found.
- Credential provider disabled or unavailable.
- Device changed or passkey not synced.
- App/domain association failure after release.
- User deleted a passkey from the OS provider but Supabase still lists it, or vice versa.
- Password fallback and re-enrollment.

## 16. Delivery Phases

### Phase 0: Decision and compatibility spike

**Goal:** Prove that the selected native adapter and Supabase two-step API interoperate before broad
application changes.

- Approve the RP domain and environment strategy.
- Pin a candidate Supabase version and review intervening releases.
- Evaluate and pin the native passkey module.
- Build a throwaway vertical spike on staging: confirmed user -> register -> sign out -> sign in.
- Validate iOS AASA and Android DAL with release-like signing identities.
- Capture exact credential JSON shapes and normalized native errors as test fixtures.
- Write ADR-0020 to amend ADR-0019 from password-only auth to multiple independent sign-in methods.

**Exit gate:** One physical iOS device and one physical Android device complete the full ceremony
against staging, or the feature is paused with documented blockers.

### Phase 1: Dependency and infrastructure foundation

- Upgrade and pin Supabase JS separately; run the full repository gate.
- Add the native adapter port and implementation.
- Enable the experimental passkey client option.
- Add service contracts, error mapping, and unit tests.
- Implement register/authenticate/list/update/delete in `SupabaseAuthService`.

**Exit gate:** Contract and adapter tests pass; no UI behavior has changed; password and demo flows
remain green.

### Phase 2: Returning-client sign-in

- Wire the Face ID button to passkey authentication.
- Reuse the existing personal-entry pipeline after successful verification.
- Add loading, cancellation, unavailable, no-credential, offline, and retry states.
- Keep all three methods visible and Sanad explicitly future-only.

**Exit gate:** Screen tests and device sign-in pass; password fallback is verified after every failure
class.

### Phase 3: New-client optional enrollment

- Refactor personal entry into profile-ready and post-enrollment continuation stages.
- Add the optional enrollment screen after verified signup/profile provisioning.
- Implement success, skip, cancel, idempotent-existing, and failure continuation.
- Ensure no sensitive route params or persisted signup secrets.

**Exit gate:** New signup reaches consent/home on enrollment success, skip, cancellation, and
recoverable error, with no duplicate profile or consent writes.

### Phase 4: Existing-client Settings management

- Add the Sign-in and security section/route.
- Implement support check and passkey list.
- Add register, rename, and confirmed deletion actions.
- Add empty/loading/error/offline states and accessibility coverage.

**Exit gate:** Multi-passkey lifecycle works on both platforms and cannot be reached from demo or a
signed-out state.

### Phase 5: Hardening and staged rollout

- Run security review, dependency audit, full automated gate, and device matrix.
- Verify hosted configuration, AASA, DAL, signing hashes, account deletion, and banned-user behavior.
- Release behind a remote/configurable kill switch if the existing configuration system supports it;
  otherwise keep a build-time feature flag for the first release.
- Roll out to internal testers, then a small production cohort, then broader availability based on
  success/cancellation/error rates and support volume.
- Document rollback: disable passkey entry/enrollment while preserving password login and existing
  credentials for later recovery.

**Exit gate:** Product, mobile, security, Arabic content, and operations owners sign off on evidence.

## 17. Definition of Done

- All three sign-in choices always render in EN and AR.
- Face ID completes passwordless Supabase authentication without an email field.
- New verified clients receive an optional enrollment offer after profile provisioning.
- Existing authenticated clients can add, view, rename, and remove passkeys in Settings.
- Password login remains functional and visible through all passkey states.
- Sanad remains independent and clearly unavailable until its own implementation.
- No biometric data, private keys, passwords, challenge payloads, or credential assertions are stored
  or logged by the app.
- No public/application database table or profile flag duplicates Supabase Auth passkey state.
- No SQL migration is introduced for this feature.
- The process-only session policy remains unchanged.
- Demo mode remains offline and does not initialize Supabase or native passkey flows.
- Unit, screen, integration, full repository, and physical-device gates pass.
- Production RP configuration, AASA, DAL, and release-signing identities are verified.
- Rollback has been rehearsed without affecting password sign-in.

## 18. Explicit Non-Goals

- Local biometric app lock for an already stored session.
- Persisting the Supabase session across app restarts.
- Removing email/password authentication.
- Automatic passkey enrollment without explicit user action.
- Custom WebAuthn server, Edge Function verifier, or application-owned passkey table.
- Biometric matching, liveness detection, or storage of face/fingerprint data.
- Sanad authentication implementation.
- Recovery that relies only on passkeys; email/password remains the recovery path in this scope.
- Web passkey UX unless separately prioritized. The RP/domain design should avoid blocking it later.

## 19. Effort and Risk Estimate

Assuming the compatibility spike succeeds and production domain/signing access is available:

| Workstream                                         |                   Estimate |
| -------------------------------------------------- | -------------------------: |
| Compatibility spike and ADR                        |       3-5 engineering days |
| Auth contracts, adapters, Supabase orchestration   |                   3-5 days |
| Sign-in UX and error handling                      |                   2-3 days |
| Signup enrollment pipeline refactor                |                   3-5 days |
| Settings management                                |                   2-4 days |
| Platform association, staging, and release builds  |                   3-5 days |
| Automated tests, physical-device matrix, hardening |                   4-7 days |
| **Total**                                          | **20-34 engineering days** |

Calendar time may be longer because Apple/Android signing access, domain hosting, hosted Supabase
configuration, Arabic review, and physical-device availability are external dependencies. The largest
technical risks are the experimental Supabase API, React Native credential JSON interoperability,
native association/signing configuration, and variation among Android credential providers.

## 20. Open Decisions Required Before Phase 0 Exits

1. What exact production domain will be the permanent relying-party ID?
2. Which Apple Team ID and Android release signing certificate are authoritative?
3. Which minimum iOS and Android versions are supported for passkeys?
4. Is `react-native-passkeys` accepted after dependency/security review, or is another adapter chosen?
5. Should the product label stay `Face ID` everywhere, or use platform-aware labels while retaining
   the same sign-in method?
6. Is there an existing remote feature-flag mechanism suitable for a passkey kill switch?
7. What sanitized passkey telemetry is allowed under the product's privacy policy?

None of these decisions changes the agreed three-method sign-in model. They determine whether the
native feature can be operated safely in production.

## 21. Authoritative References

- [Supabase passkey authentication](https://supabase.com/docs/guides/auth/passkeys)
- [Supabase React Native Auth guidance](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Apple: Supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys)
- [Apple: Performing fast account creation with passkeys](https://developer.apple.com/documentation/authenticationservices/performing-fast-account-creation-with-passkeys)
- [Android: Credential Manager prerequisites](https://developer.android.com/identity/credential-manager/prerequisites)
- [Android: Create a passkey](https://developer.android.com/identity/passkeys/create-passkeys)
- [Android: Sign in with a passkey](https://developer.android.com/identity/passkeys/sign-in-with-passkeys)
- [Candidate native adapter: react-native-passkeys](https://github.com/peterferguson/react-native-passkeys)

Supabase passkey support is experimental as of this plan date. Re-check the current documentation and
changelog immediately before implementation and again before production rollout.
