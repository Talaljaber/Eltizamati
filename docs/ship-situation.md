1. Executive decision
STOP SHIP.
A confirmed P0 causes personal financial calculations and obligation statuses to use the frozen demo date 2026-07-01. This can materially misstate current commitments, next-payment information, and statuses.
I also found multiple P1 defects in password recovery, consent, session/account-deletion cleanup, startup coordination, Supabase write atomicity, and financial provenance.
Current implementation evidence is insufficient to claim production readiness. Device-only behavior, local Supabase integration, RLS tests, and native splash behavior could not be executed in this environment.
2. Repository and review context
Branch: phase6-finance-engine
HEAD: 4910a8809e0303b2dd8c16360c72946b00f312a7
Worktree before and after review: clean
Latest commit: feat(mobile): redesigned auth flow, splash screen, insights UI, and iOS keychain fix
Recent merged PR: PR #16, whose head was 11b5656; current HEAD is a later direct branch commit not covered by that PR.
Active documented phase: Phase 8.5, nominally in progress with owner/Arabic-reader sign-offs outstanding.
Actual current work: a post-PR auth, routing, splash, asset, and SecureStore redesign.
The Supabase review included current official authentication, redirect, session, mobile refresh, security, and breaking-change documentation, plus migrations, grants, RLS policies, Edge Functions, repositories, and pgTAP tests.
Documentation is internally inconsistent:
[STATUS.md (line 5)](/C:/Users/hp/.m2/Eltizamati/docs/10-implementation/STATUS.md:5) says Workstream 5 ran, then later says it has not started.
The Phase 8.5 header says Workstream 5 has not started, while its status table says the matrix was executed.
The documented mobile count is 263; the current gate has 266.
[testing-strategy.md (line 3)](/C:/Users/hp/.m2/Eltizamati/docs/07-quality-operations/testing-strategy.md:3) amends integration to Supabase/pgTAP MVP, but its table still specifies SQLite and pgTAP as P1.
PR #16 introduced Welcome as first-run; current HEAD deletes that screen and makes sign-in the first screen.
3. Prioritized findings
F-01 — Personal finance uses the frozen demo date
Severity / area: P0 — financial correctness, Home, obligations, detail.
Evidence: [use-home-aggregates.ts (line 68)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/features/home/hooks/use-home-aggregates.ts:68), [obligations.tsx (line 152)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/app/(tabs\)/obligations.tsx:152), and [[id\].tsx (line 110)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/app/obligation/[id].tsx:110) unconditionally use DEMO_DATE, defined as 2026-07-01.
Reproduction: Sign into personal mode with obligations whose due/status result differs after July 1, 2026; inspect Home, Obligations, and detail.
Expected / actual: Personal mode should use the current local date; it uses the demo fixture date.
Impact: Commitments, next-payment selection, status chips, and recorded calculation asOf can be stale or incorrect. This is materially misleading financial output.
Environment: All personal-mode platforms; worsens as time advances.
Tests: Existing aggregate tests use demo fixtures. No personal/current-date boundary test catches this.
Smallest correction: Select asOf explicitly from mode/provenance using the existing calculation-as-of.ts helper; never import DEMO_DATE into shared personal screens.
Validation: Add clock-controlled personal/demo tests crossing due-date boundaries and verify Home/list/detail agree on the same asOf.
F-02 — Password recovery never lets the user set a new password
Severity / area: P1 — auth, deep links, account recovery.
Evidence: [supabase-auth-service.ts (line 102)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/services/auth/supabase-auth-service.ts:102) redirects reset emails to /auth/callback. The callback exchanges credentials and enters the app, but there is no recovery-event handling or auth.updateUser({password}) screen.
Reproduction: Request reset, open the recovery link, and try to select a new password.
Expected / actual: The app should validate the recovery session, collect a new password, update it, and confirm completion. It signs the user in and enters tabs without changing the password.
Impact: A primary account-recovery flow is unusable.
Environment: All environments. Local config additionally lacks the app callback in additional_redirect_urls, so local links fall back to the site URL.
Tests: Reset tests only verify sending the email. There is no callback/recovery test.
Smallest correction: Add a recovery-specific route/state, handle the password-recovery auth event, call updateUser, and explicitly configure every environment’s callback allowlist.
Validation: Real email-link integration tests for expired, reused, malformed, and valid links. Supabase documents the required recovery/update sequence in its password guide and callback allowlisting in its redirect URL guide.
F-03 — First-run and confirmation paths bypass mandatory consent
Severity / area: P1 — onboarding, consent, signup confirmation, privacy.
Evidence: [sign-in.tsx (line 79)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/app/auth/sign-in.tsx:79) lets a fresh user select demo mode and marks onboarding complete without visiting consent. [callback.tsx (line 33)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/app/auth/callback.tsx:33) completes personal onboarding after email confirmation without recording consent.
Reproduction: Fresh install → Continue in demo mode; separately sign up with email confirmations enabled and open the confirmation link.
Expected / actual: Required disclosure/consent should be versioned and persisted before entering either data mode. Both paths can enter tabs without it.
Impact: Required privacy and financial-disclaimer acknowledgement is not reliable.
Environment: Demo path everywhere; confirmation path where email confirmation is enabled. Local Supabase disables confirmation, hiding this defect.
Tests: Sign-in tests assert direct demo completion; there are no callback or confirmation-enabled integration tests.
Smallest correction: Centralize onboarding completion behind a consent gate and record consent version/timestamp for every terminal path.
Validation: Fresh-install, returning-user, demo, immediate-session signup, and confirmation-required signup tests asserting persisted consent before tab access.
F-04 — Sign-out and account deletion do not clear app trust state
Severity / area: P1 — session lifecycle, deletion, cache isolation, privacy.
Evidence: Settings only calls the auth mutation and routes to sign-in. clearDataMode() is never called; the module-global QueryClient is never cleared; repository instances and global notification ID persist. The delete Edge Function deletes the auth user, but the client does not sign out or erase local state.
Reproduction: Use personal mode, populate queries, sign out or delete the account, relaunch, then sign in as another user.
Expected / actual: Local tokens, mode, onboarding state, query data, repositories, reminders, and user identity should be reset atomically. They persist independently.
Impact: Relaunch can attempt personal tabs with no valid user, become stuck loading, or expose stale cached data to a subsequent session.
Environment: All personal-mode platforms.
Tests: Service calls are tested, but no mounted sign-out/deletion/relaunch/user-switch test verifies cleanup.
Smallest correction: Implement one idempotent auth-exit coordinator that signs out/revokes, clears SecureStore and app state, cancels user-scoped reminders, clears QueryClient, releases repositories, then routes.
Validation: Two-user switch and deletion/relaunch tests with identical/deep-linked resource IDs. Supabase notes that deleting a user does not itself sign them out, and tokens remain relevant until expiry; see user management, sessions, and sign-out behavior.
F-05 — Personal data failures masquerade as empty or pending data
Severity / area: P1 — Home, Obligations, offline/error handling.
Evidence: Home ignores obligation/insight query errors and renders pending/no-insights content. Obligations uses data ?? [] and shows the empty state after repository failure. Both screens always render DemoBanner, including personal mode.
Reproduction: Sign into personal mode, then block Supabase or force a repository error.
Expected / actual: A classified, retryable error should appear and personal data should retain its identity. The UI shows empty/pending data and labels it demonstration data.
Impact: Users may believe obligations disappeared or that personal values are demo values.
Environment: Personal mode under offline, timeout, authorization, or storage failures.
Tests: No screen-level personal offline/error tests; current tests mock successful data.
Smallest correction: Surface isError/error, retain last trusted data where appropriate, show ErrorState with retry, and derive DemoBanner.visible from mode.
Validation: Network loss, timeout, revoked session, and recovery tests for Home and Obligations.
F-06 — Splash readiness is split across racing components
Severity / area: P1 — cold start, splash, repository boot, callback.
Evidence: OnboardingGuard owns hideAsync() but only waits for AsyncStorage state. AppProviders independently replaces the router with boot spinner/error UI. A personal repository failure can remove the guard before it hides the native splash. Demo boot lacks try/finally, and auth callback can spin indefinitely when no URL/service is available.
Reproduction: Cold-start persisted personal mode with invalid Supabase configuration or injected repository-boot failure.
Expected / actual: One startup state machine should always reach app, recoverable error, or fatal error and always settle splash visibility. Independent effects have no common completion/failure owner.
Impact: Potential permanently visible splash or indefinite spinner on startup/deep-link failure.
Environment: Most visible in release builds and cold starts; runtime manifestation requires device validation.
Tests: No root layout, OnboardingGuard, AppProviders, splash, or callback test.
Smallest correction: Centralize startup readiness with explicit session/mode/repository/i18n states and a finally-guarded splash release.
Validation: Release/internal builds with injected storage, env, session, import, and deep-link failures. Expo warns that final splash behavior must be tested outside Expo Go in its splash documentation.
F-07 — Supabase persistence does not enforce atomic financial writes
Severity / area: P1 — obligations, rate history, database integrity.
Evidence: [obligation-repository.ts (line 123)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/services/repositories/supabase/obligation-repository.ts:123) upserts the base row and detail row in separate network operations. A second-write failure leaves a partial obligation. Separately, rate_periods is documented append-only, but authenticated users receive unrestricted row-level UPDATE permission, including annual_rate, dates, and provenance.
Reproduction: Make the base upsert succeed and fail the detail upsert; or use the public client and owner JWT to update an existing rate’s financial fields.
Expected / actual: Aggregate writes should commit or roll back together; rate history should only permit the allowed supersession mutation. Neither is database-enforced.
Impact: Partial obligations and mutable financial history can corrupt subsequent calculations and auditability.
Environment: Personal mode/Supabase.
Tests: Integration tests cover successful round trips and cross-user denial, not failure atomicity or forbidden same-owner column updates.
Smallest correction: Use a transaction/RPC for aggregate saves and a trigger/RPC or column-level privileges for rate corrections.
Validation: Failure-injection integration tests and pgTAP tests proving forbidden financial columns cannot be updated through an authenticated public client.
F-08 — Detail screens discard money formatting and provenance
Severity / area: P1 — card and Murabaha financial presentation.
Evidence: [CardDetailSection.tsx (line 27)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/features/card-detail/components/CardDetailSection.tsx:27) and [MurabahaDetailSection.tsx (line 32)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/features/murabaha-detail/components/MurabahaDetailSection.tsx:32) convert Provenanced<Money> to raw storage strings and display computed available credit without an estimate/derived marker.
Reproduction: Open card or Murabaha details containing estimated values.
Expected / actual: Currency, locale, precision class, provenance, and derivation status should remain visible. Raw decimal strings are shown without that context.
Impact: Estimated or derived financial values can appear official and are inconsistently localized.
Environment: All platforms and locales.
Tests: Component tests do not assert currency/provenance preservation for every monetary field.
Smallest correction: Route monetary fields through Amount or an equivalent provenance-aware field primitive.
Validation: Official/estimate/derived fixtures in English and Arabic, including negative/unknown available credit.
F-09 — Background/session refresh and personal cache freshness are unmanaged
Severity / area: P2 — session reliability, backgrounding, stale data.
Evidence: Supabase has autoRefreshToken: true, but there is no React Native AppState coordination. Shared personal queries use staleTime: Infinity. useActiveUser can subscribe after unmount because it awaits the initial session before assigning its cleanup callback.
Reproduction: Background the app through token expiry, change data elsewhere, foreground it, or unmount the user hook before currentSession() settles.
Expected / actual: Refresh should be active only while appropriate, foreground should revalidate personal data, and listeners should always clean up.
Impact: Stale financial data, excess background work, leaked listeners, or delayed session changes.
Environment: React Native background/foreground cycles.
Tests: No AppState, expiry/resume, or async-unmount test.
Smallest correction: Add AppState-controlled auto-refresh, personal-mode foreground invalidation, finite stale policies, and a cancelled flag around asynchronous subscription setup.
Validation: Fake-timer/AppState tests plus physical-device expiry/resume. Supabase provides React Native lifecycle guidance in startAutoRefresh.
F-10 — SecureStore overwrites can leave old token chunks behind
Severity / area: P2 — local token hygiene.
Evidence: [secure-store-adapter.ts (line 72)](/C:/Users/hp/.m2/Eltizamati/apps/mobile/src/core/supabase/secure-store-adapter.ts:72) writes new values but does not delete chunks belonging to the previous manifest. Replacing a large value with a small one, or fewer chunks, leaves encrypted orphan values.
Reproduction: Store a multi-chunk session, overwrite it with a smaller session, then inspect SecureStore keys.
Expected / actual: Superseded chunks should be deleted; they remain indefinitely.
Impact: Sensitive residual session material survives normal overwrite/removal sequences.
Environment: iOS/Android SecureStore.
Tests: Current tests cover chunking and removal of the current manifest, not shrink/overwrite or partial-write rollback.
Smallest correction: Read the previous manifest, commit the new value safely, then delete surplus/old chunks.
Validation: Large→small, large→fewer-chunks, failed-write, corrupted-manifest, and sign-out cleanup tests.
F-11 — Native icon and splash assets are release-invalid or visibly unsafe
Severity / area: P2 — release assets, splash, Android adaptive icon.
Evidence: icon.png is 161×152, not square; adaptive-icon.png is an opaque 891×580 horizontal wordmark; splash reuses the opaque icon on a teal background, producing a pale rectangular tile.
Reproduction: Build an Android release/internal distribution and inspect masked icons and cold-start splash.
Expected / actual: Square app icon, transparent safe-zone adaptive foreground, and purpose-built splash art; current assets violate those assumptions.
Impact: Cropping, stretching, mask loss, and visibly branded-as-broken launch presentation.
Environment: Native Android/iOS builds; Expo Go is not authoritative.
Tests: expo config and dependency checks pass because they do not visually validate assets.
Smallest correction: Supply correct 1024×1024 icon artwork, transparent adaptive foreground, and dedicated splash asset.
Validation: Release screenshots across Android masks, iOS, light/dark variants, and device densities. See Expo’s icon and splash requirements.
F-12 — Accessibility and Arabic long-text claims are not supported
Severity / area: P2 — accessibility, RTL, large text.
Evidence: Home quick actions force translated labels to one line; auth text links are plain Text press targets without consistent button semantics or minimum touch size. No Android/device test evidence exists.
Reproduction: Arabic locale with increased font scale and TalkBack/VoiceOver.
Expected / actual: Labels should wrap or adapt, targets should remain at least comfortably tappable, and roles should be announced. Current implementation can truncate and provides inconsistent semantics.
Impact: Navigation becomes ambiguous or difficult for Arabic and assistive-technology users.
Environment: Arabic, large text, screen readers.
Tests: Typography primitives are tested, but representative screens are not exercised with font scaling or a real accessibility tree.
Smallest correction: Permit wrapping/adaptive layout and use accessible pressable/link primitives with standard hit targets.
Validation: Arabic-reader review, font scales through the OS maximum, TalkBack/VoiceOver, and RTL screenshots.
F-13 — Production dependency audit is not clean
Severity / area: P2 — supply chain.
Evidence: pnpm audit --prod reports vulnerable drizzle-orm <0.45.2 under GHSA-gpj5-g38j-94v9, plus moderate PostCSS and UUID advisories.
Reproduction: Run pnpm audit --prod.
Expected / actual: Release dependency audit should pass or have documented exploitability exceptions; it exits 1.
Impact: The Drizzle issue is high upstream severity. Repository search found no actual Drizzle imports, so project exploitability was not demonstrated, but the unused production dependency remains exposed.
Environment: Build/release dependency graph.
Tests: Existing CI gate does not run a production audit.
Smallest correction: Remove unused Drizzle or upgrade to a patched compatible version; update transitive Expo packages when supported.
Validation: Clean production audit plus dependency and release build checks.
F-14 — Phase records and review coverage do not describe the current code
Severity / area: P2 — delivery governance, test evidence.
Evidence: Conflicting phase statuses, stale test counts, stale SQLite strategy text, and PR #16’s first-run design no longer matching HEAD. The current auth/splash commit has no recent PR context found.
Reproduction: Compare STATUS, active phase, implementation plan, testing strategy, PR #16, and HEAD.
Expected / actual: One authoritative current phase/task/evidence record; multiple incompatible states are presented.
Impact: Reviewers can sign off against code and test evidence that no longer exists.
Environment: Repository/process-wide.
Tests: Documentation consistency is not checked.
Smallest correction: Reconcile the phase header, status ledger, test counts, current branch/HEAD, and validation matrix; require the current auth/splash change to receive independent review.
Validation: A fresh reviewer should derive the same current phase, outstanding gates, HEAD, and test evidence from every entry document.
4. Automated and manual checks run
Check	Result
pnpm run check	Pass: formatting, lint, typecheck, dependency boundaries, domain 131 tests, finance 128, demo 48, mobile 49 suites/266 tests
Finance coverage	99.9% statements, 95.58% branches, 100% functions
Mobile Jest teardown	Warning: worker failed to exit gracefully and was force-exited
pnpm run test:integration	Fail: 9/9 tests could not reach 127.0.0.1:54321; teardown also dereferences undefined setup users
supabase db reset / supabase test db	Not runnable: Supabase CLI absent and Docker daemon unavailable
expo config --type public	Pass; resolved SDK 54 splash/adaptive configuration
expo install --check	Pass: dependencies compatible
pnpm audit --prod	Fail: 1 high and 2 moderate advisories
Focused auth/SecureStore test command	Timed out after 184 seconds without output; the same suites had passed in the full gate
Android emulator/device testing	Not runnable: adb and emulator tools absent
Install	Deliberately skipped: the brief prohibits installing dependencies and the existing lockfile/node_modules were sufficient
Node environment	v23.8.0, contrary to the repository’s Node LTS requirement

5. Manual QA scenarios
Scenario	Assessment
Fresh install → language → onboarding → mode	Fail: fresh install routes to sign-in; demo escape bypasses onboarding/consent
Demo relaunch offline	Repository path appears network-independent after mode is stored, but fresh sign-in eagerly constructs Supabase; device verification unavailable
Personal signup requiring email confirmation	Fail: callback bypasses consent/profile setup
Sign-in → sign-out → relaunch	Fail by inspection: mode/cache/repository/reminder cleanup absent
Password reset	Fail: no new-password stage
Account deletion → relaunch	Fail by inspection: deletion does not perform complete local sign-out/reset
Personal offline/error state	Fail: Home/Obligations can show empty or pending content
Background → token expiry → foreground	Not verified; required AppState/session coordination is absent
Native splash, icon masking, dark/light startup	Not verified on device; asset defects are statically confirmed
Arabic, large text, TalkBack/VoiceOver	Not verified; static truncation/touch-target risks found
Notification permission/schedule/deep-link	Unit coverage exists; real permission and cold-start navigation unverified

6. Remaining uncertainties
The following cannot be approved without external or device evidence:
Production Supabase redirect allowlist, email-confirmation configuration, deployed migration version, Edge Function deployment, and secrets.
Real pgTAP/RLS and repository integration results against a clean Supabase reset.
Current GitHub Actions health.
Physical-device splash timing, adaptive icon masking, background token expiry, notification permissions, deep-link cold start, SecureStore behavior, RTL, Arabic reading quality, and accessibility.
EAS preview/production configuration; no EAS profiles were found.
Whether the focused Jest timeout is deterministic or environment-specific.
7. Minimal corrective-action list
Remove DEMO_DATE from every personal financial path and add clock-controlled regression tests.
Implement a complete recovery flow and configure callback URLs per environment.
Enforce consent before every onboarding/auth completion path.
Centralize sign-out/deletion cleanup, including caches, mode, repositories, SecureStore, and notifications.
Unify splash/startup/session/repository readiness into one state machine.
Make obligation aggregate writes transactional and enforce append-only rate history in Postgres.
Restore error-state integrity and mode-aware banners.
Preserve currency and provenance on every financial field.
Add AppState/session refresh and foreground revalidation.
Correct native assets and run release-device validation.
Repair the dependency audit and Jest teardown.
Reconcile project-status documentation and independently review current HEAD.
No files were modified, no commit was created, and nothing was pushed or merged.