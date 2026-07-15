Act as the principal remediation engineer for Eltizamati.

Your task is to verify and correct every confirmed finding from the whole-project auth, startup, Supabase, financial-integrity, accessibility, release-asset, dependency, and documentation review.

This is an implementation task, but not permission to redesign the product, change financial formulas, weaken provenance, add unrelated features, push, merge, or open a PR.

The audit verdict was STOP SHIP.

The audit was performed against local branch `phase6-finance-engine` at:

`4910a8809e0303b2dd8c16360c72946b00f312a7`

Do not assume the current branch or HEAD is still identical. Inspect the current repository first and independently reproduce every finding before modifying code.

## Non-negotiable working rules

- Protect the existing branch and working tree.
- Do not reset, stash, clean, discard, or overwrite unrelated work.
- Do not push, merge, open a PR, or tag a release.
- Do not create commits unless Talal separately authorizes commits.
- Keep changes in small, reviewable logical groups.
- Do not mix cosmetic redesign with remediation.
- Do not change financial formulas, approved vectors, formula versions, or expected values.
- Do not generate expected financial values from the engine under test.
- Do not remove deterministic offline demo mode.
- Demo mode must remain network-independent, authentication-independent, and visibly labeled.
- Personal mode must never silently fall back to demo data.
- Estimates must never appear official.
- Missing material inputs must continue to produce an honest refusal or limited state.
- Do not invent Supabase, Expo, provider, consent, or legal behavior.
- Use current official Supabase and Expo documentation when platform behavior must be verified.
- Stop and report external configuration blockers rather than pretending they are fixed.

## Preflight

Run:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline -20
git diff --stat
node --version
pnpm --version

The repository requires Node LTS. The audit was run under Node v23.8.0, which is not acceptable release evidence.

Use a supported Node LTS environment before relying on final test results.

If there are overlapping uncommitted edits in files needed for this remediation, stop and report the exact overlap.

Read in this order
docs/10-implementation/STATUS.md
The current active phase file
docs/08-delivery/IMPLEMENTATION_PLAN.md
docs/10-implementation/phases/PHASE-09-hardening-and-release.md
Relevant Phase 4 auth/repository completion records
Relevant Phase 8.5 validation records
Architecture and ADR documents for:
Supabase persistence
authentication
provider abstraction
offline behavior
provenance
error taxonomy
privacy and consent
notifications
testing
AI_AGENT_RULES.md
CODE_REVIEW_CHECKLIST.md
The full current implementation and tests

Also read the supplied whole-project review report. Treat it as a defect hypothesis list, not unquestionable truth.

Required execution order

Complete the remediation in the following waves.

Do not start a later wave while an earlier wave has an unresolved P0 or P1 defect that affects it.

Wave 1 — financial date correctness
F-01: personal finance uses the frozen demo date

Known affected paths include:

apps/mobile/src/features/home/hooks/use-home-aggregates.ts
apps/mobile/app/(tabs)/obligations.tsx
apps/mobile/app/obligation/[id].tsx
apps/mobile/src/services/calculation-as-of.ts
any other screen, hook, service, or calculation call importing DEMO_DATE

Search globally:

rg -n "DEMO_DATE|2026-07-01" apps packages
Required behavior
Demo mode uses the deterministic demo date.
Personal mode uses an explicit current local date supplied through an approved clock/as-of boundary.
All calculations for one rendered workflow use the same resolved asOf.
No component independently calls the clock if that could cause inconsistent dates.
Date resolution must be testable.
Personal calculations, statuses, next-due selection, and persisted calculation runs must agree on the same date.
Tests must cross a due-date/status boundary and prove demo and personal behavior differ correctly.

Do not replace deterministic date handling with scattered new Date() calls.

Add focused regression tests for:

Home aggregate in demo mode
Home aggregate in personal mode
Obligations list status in personal mode
Obligation detail status in personal mode
One boundary immediately before and after a due/status date
Shared consistency of asOf across Home, list, and detail

Run focused tests and typecheck before continuing.

Wave 2 — authentication, consent, cleanup, and startup

Address F-02, F-03, F-04, F-06, and the auth-related part of F-09 together because they share lifecycle and routing boundaries.

Inspect at minimum:

apps/mobile/app/auth/**
apps/mobile/app/_layout.tsx
onboarding routes and guards
apps/mobile/src/providers.tsx
auth providers and hooks
SupabaseAuthService
Supabase client setup
SecureStore adapter
data-mode store
repository provider/composition root
query-client creation and query keys
consent services and repository
account-deletion Edge Function
local-notification state
deep-link and callback configuration
apps/mobile/app.json
supabase/config.toml
F-02: complete password recovery

Implement the complete recovery sequence:

User requests password recovery.
Email redirects to an explicitly allowed app callback URL.
The app distinguishes a password-recovery event/session from ordinary authentication.
A dedicated screen collects and confirms the new password.
The app calls the approved Supabase password-update API.
Expired, reused, malformed, and missing sessions show safe recoverable errors.
Success produces a clear completion state and valid navigation.
Recovery cannot bypass required consent or profile setup.
English and Arabic strings are included.
Password values never enter logs or safe metadata.

Do not treat receiving a recovery session as completion.

Add tests for:

request email
valid recovery callback
malformed callback
expired/reused recovery state
password mismatch
weak password validation
successful update
user cancellation
callback allowlist configuration

If production redirect allowlists cannot be verified from the repository, document the exact required owner-side Supabase settings.

F-03: enforce consent on every terminal entry path

Create one centralized completion policy for:

fresh demo entry
personal sign-up with immediate session
personal sign-up requiring email confirmation
returning authenticated user
password-recovery completion
switching from demo to personal mode

Required rule:

No user enters the normal product flow until the required current consent/disclosure version has been acknowledged and persisted through the correct mode-specific path.

Do not duplicate consent decisions in multiple screens.

Add mounted flow tests proving:

demo cannot bypass consent
immediate-session signup cannot bypass consent
email-confirmation callback cannot bypass consent
already-consented users are not repeatedly blocked
updated consent versions require re-acknowledgement where specified
callback and onboarding routes do not loop
F-04: centralize sign-out and account-deletion cleanup

Implement one idempotent auth-exit coordinator used by both sign-out and account deletion.

It must intentionally handle:

Supabase sign-out or post-deletion session invalidation
SecureStore session removal
auth subscription state
data-mode state
onboarding/session trust state as defined by the product
TanStack Query cache
user-scoped repository instances
active-user state
local notification IDs and scheduled reminders
user-specific transient stores
navigation reset
failures during partial cleanup

Do not clear global language or unrelated non-sensitive preferences unless the product rules require it.

Account deletion must not assume deleting the Supabase user automatically signs out the client.

Add tests for:

normal sign-out
sign-out while offline
partial cleanup failure
account deletion success
account deletion server failure
relaunch after deletion
user A → sign out → user B
user A → delete → user B
no cached user-A data visible to user B
repeated cleanup calls are safe
F-06: unify startup and splash readiness

Replace competing readiness effects with one explicit startup coordinator/state machine.

The state machine must account for:

native splash state
i18n readiness
font readiness or approved fallback
persisted language
onboarding/consent state
selected data mode
auth-session restoration
recovery callback/deep link
repository construction
query-client availability
notification-response initialization
recoverable startup error
fatal configuration error

Required properties:

Exactly one owner decides when the native splash may hide.
Splash release occurs in a guarded finally-equivalent path.
No white flash or wrong-screen flash.
No indefinite native splash.
No indefinite React spinner.
Personal mode does not render tabs before session/repositories are valid.
Demo mode does not construct Supabase.
Callback startup does not hang when URL/session/service data is absent.
Failures lead to a visible retry or safe terminal error.
Startup state transitions are deterministic and testable.

Do not use arbitrary timeouts to hide race conditions.

Add tests for:

fresh demo startup
returning demo startup offline
returning personal startup
expired personal session
invalid environment
repository boot failure
AsyncStorage failure
auth callback cold start
malformed callback
recovery callback
startup retry
component unmount during async initialization
F-09: session refresh and foreground lifecycle

Implement approved React Native AppState coordination:

Start/stop Supabase auto-refresh according to foreground/background state.
Revalidate personal-mode user data on foreground using controlled query invalidation.
Do not refresh or invalidate Supabase data in demo mode.
Use finite, justified stale policies for personal financial data.
Prevent auth-listener registration after hook unmount.
Guarantee listener cleanup.
Avoid refresh storms.

Add fake-timer/AppState tests plus async-unmount tests.

Run focused auth, routing, onboarding, startup, and lifecycle tests before continuing.

Wave 3 — personal-data error honesty
F-05: repository failures must not look empty or like demo data

Inspect:

Home queries and view model
Obligations list queries
active-user hook
repository requirement wrappers
DemoBanner usage
query error mapping
retry behavior
stale-data behavior

Required behavior:

Personal-mode connectivity, authorization, timeout, and unexpected errors render classified error states.
A failed query must not become an empty list through data ?? [].
A failed aggregate must not silently become harmless-looking “pending” text when an actionable error exists.
Previously trusted cached data may remain visible only with an honest stale/error indicator.
DemoBanner visibility is derived from actual data mode.
Personal mode must never show the demo banner.
Demo mode keeps the demo banner.
Retry is available and tested.
Revoked sessions route through the auth/session policy rather than pretending the user has no obligations.

Add screen-level tests for:

personal offline
timeout
authorization failure
revoked session
retry success
stale cached data with error
empty successful result
demo mode
personal mode
Wave 4 — Supabase financial integrity
F-07: atomic obligation persistence

Inspect the current obligation service, repository, migrations, generated types, RLS, RPC patterns, and integration tests.

The current base obligation and subtype detail writes must not be separate non-transactional client operations.

Implement the smallest approved transactional boundary, likely a narrowly scoped Supabase/Postgres RPC or equivalent server-side transaction.

Requirements:

Base row and subtype row commit together or roll back together.
Ownership is derived from the authenticated user, not trusted from arbitrary client input.
All financial values remain decimal-safe.
Provenance JSON remains complete.
The operation is idempotent where required.
Update behavior does not accidentally create subtype mismatches.
Error results remain classified.
UI and application services still call repository interfaces, not Supabase directly.

Add:

migration
generated-type update
pgTAP ownership/RLS tests
repository integration tests
failure-injection tests proving rollback
update tests
cross-user denial tests
subtype mismatch tests
F-07: enforce append-only rate history

Inspect the intended allowed mutation model for rate_periods.

Do not guess whether corrections should be immutable, superseding, or narrowly mutable. Follow the domain/specification.

Database enforcement must prevent an authenticated public client from freely changing historical financial columns such as:

annual rate
effective date
provenance
ownership
obligation reference

Use the smallest correct mechanism:

restricted grants
trigger
approved RPC
supersession/correction event

Add pgTAP tests proving:

inserts allowed when valid
cross-user access denied
forbidden same-owner updates rejected
only explicitly approved correction/supersession behavior is allowed
deletion behavior matches the specification

Run:

supabase db reset
supabase test db
pnpm run test:integration

If Docker, Supabase CLI, or the local stack is unavailable, stop short of claiming these defects fixed. Report code changes as implemented but database verification blocked.

Wave 5 — financial presentation and provenance
F-08: preserve money formatting and provenance

Inspect:

CardDetailSection.tsx
MurabahaDetailSection.tsx
related detail components
FieldRow
Amount
provenance badges and sourced-value utilities
all touched money/rate fields

Replace raw storage-string rendering of material financial values with approved provenance-aware primitives.

Requirements:

Currency formatting is locale-correct.
Official, user-entered, demo, and estimated values remain visibly distinguishable without relying on color.
Derived available credit is not presented as an official externally supplied value.
Missing fields remain unknown, not zero.
Negative and unusual values remain honest.
Murabaha terminology remains contract-correct.
Rates and percentages use appropriate primitives rather than pretending they are money.
No formula behavior changes.

Add English and Arabic tests for:

official value
user-entered value
estimated value
demo value
derived available credit
missing value
negative/edge value
large JOD amount
accessible provenance label

Search touched screens for other bare material money:

rg -n "toStorageString\\(|\\.amount\\b|currentBalance|statementBalance|creditLimit|installment|totalSalePrice|assetCost|disclosedProfit" apps/mobile

Review findings; do not blindly replace non-material values.

Wave 6 — SecureStore, assets, accessibility, dependencies, and documentation
F-10: SecureStore chunk cleanup

Correct overwrite behavior in the SecureStore adapter.

Required behavior:

Read the previous manifest before replacement.
Write the new value safely.
Do not make a partially written value look committed.
Delete superseded chunks after successful replacement.
Clean up safely after failed writes.
Handle corrupted manifests.
Removal clears every known chunk.
Never log token contents.

Add tests for:

single → single
single → chunked
chunked → single
chunked → fewer chunks
chunked → more chunks
failed write
corrupted manifest
removal after corruption
repeated removal
sign-out cleanup
F-11: native icon and splash assets

Inspect actual asset dimensions, transparency, safe zones, Expo configuration, and build behavior.

Required target assets:

square high-resolution app icon
transparent Android adaptive foreground with correct safe zone
separate adaptive background
purpose-built splash artwork
no black edges, rectangular tile, unintended crop, or stretched wordmark
correct light/default appearance
valid release configuration

Do not invent a new logo or trace an unapproved screenshot.

Use only approved brand source assets already supplied by Talal.

If correct source artwork is unavailable, stop this item and return an exact asset specification instead of fabricating the logo.

Validate with:

npx expo config --type public
npx expo-doctor
npx expo install --check

Native visual approval still requires preview/release-build screenshots on actual supported devices.

F-12: accessibility and Arabic resilience

Correct confirmed static issues, including:

one-line translated quick-action labels
undersized text-link targets
missing pressable/link semantics
inconsistent accessibility roles and labels
layouts that cannot grow under large font scaling

Requirements:

Arabic labels may wrap or adapt.
Important navigation labels are not silently truncated.
Interactive targets meet the project’s minimum target size.
Screen-reader roles and labels are accurate.
Focus order remains logical.
RTL directionality remains correct.
No accessibility meaning depends on color.
Financial values retain bidi-safe formatting.

Add focused render/accessibility tests, but do not claim TalkBack, VoiceOver, or native Arabic review without device/human evidence.

F-13: dependency audit

Run:

pnpm audit --prod

Investigate each finding.

For the reported drizzle-orm issue:

Verify whether the dependency is actually used.
Remove it if it is unused and removal is safe.
Otherwise update to a compatible patched version.
Do not perform broad dependency upgrades.
Do not suppress advisories without an exploitability assessment and owner-accepted exception.

Address PostCSS and UUID advisories only through safe compatible dependency changes.

After any dependency change run:

pnpm install --frozen-lockfile
pnpm run check
pnpm audit --prod
npx expo install --check

Stop if fixing an advisory requires an Expo SDK upgrade or broad architecture change. Report it separately.

F-14: documentation reconciliation

Update documentation only after implementation and verification.

Reconcile:

STATUS.md
active phase file
IMPLEMENTATION_PLAN.md only where sequencing changed
testing strategy
auth/security docs
splash/release docs
completion/audit records
current branch/head and test counts

Requirements:

Remove contradictory “started/not started” statements.
Record the current actual HEAD.
Record which defects are fixed, verified, or blocked.
Do not mark device checks complete without evidence.
Do not mark Supabase integrity fixed without pgTAP/integration evidence.
Do not mark dependency audit clean unless it exits successfully.
Do not mark Phase 8.5 or Phase 9 complete merely because code changed.
Preserve unresolved Arabic-review, device, finance-signoff, CI, and external-configuration owners.

Save the supplied audit into a canonical repository file if it is not already present:

docs/10-implementation/audits/FULL-AUTH-STARTUP-AND-FLOW-REVIEW-2026-07-14.md

Do not alter the meaning of the original findings when archiving it.

Mandatory tests and validation

Run focused tests after each wave.

At the end, run sequentially from a clean supported Node LTS shell:

pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run depcruise
pnpm run test:packages
pnpm run test:app
pnpm run check
pnpm audit --prod
npx expo config --type public
npx expo-doctor
npx expo install --check

Where local Supabase is available:

supabase start
supabase db reset
supabase test db
pnpm run test:integration

Also run tests with open-handle detection where appropriate to diagnose the Jest worker-teardown warning. Do not weaken tests or force-exit Jest to hide leaked resources.

Required runtime matrix

Where emulator/device access exists, validate:

fresh install
returning demo user
returning personal user
email-confirmation signup
password recovery
sign-out and relaunch
delete account and relaunch
two-user switching
personal offline/error/retry
background through token expiry
foreground data refresh
cold-start deep link
cold-start notification
splash success
splash initialization failure
Android adaptive icon masks
English
Arabic
RTL
large text
TalkBack/VoiceOver where available

Record screenshots, commands, device/build identity, and results.

Do not represent Expo Go behavior as final splash or adaptive-icon evidence.

Stop conditions

Stop and report rather than guessing if:

current code materially differs from the audit and the finding cannot be reproduced;
approved consent requirements are ambiguous;
production Supabase callback URLs are unknown;
database correction semantics are not defined;
Docker/Supabase cannot run for database integrity changes;
the correct brand source asset is unavailable;
dependency fixes require a broad SDK upgrade;
a change would alter a financial formula or expected value;
a change would weaken provenance;
a change would make demo mode network-dependent;
a service-role secret would enter mobile code;
unrelated local work overlaps the required files.
Suggested review boundaries

Keep the changes separable as:

Financial as-of correction
Password recovery and consent routing
Auth exit cleanup and user isolation
Startup/splash coordinator and session lifecycle
Personal-mode error honesty
Atomic Supabase writes and immutable rate history
Card/Murabaha provenance rendering
SecureStore lifecycle
Native assets and accessibility
Dependency and documentation cleanup

Do not combine all changes into one giant commit.

If commits are not authorized, leave changes uncommitted and report these as the proposed commit boundaries.

Final report

Return:

Branch, starting HEAD, ending HEAD, and working-tree status
Each F-01 through F-14 marked:
confirmed and fixed
confirmed but blocked
not reproducible
already fixed before this pass
Root cause for each confirmed issue
Exact files changed
Database migrations/RPCs/policies changed
Tests added or updated
Commands run and exact outcomes
Supabase local verification evidence
Auth callback and external configuration still required
Runtime/device evidence
Dependency-audit result
Accessibility/Arabic evidence and remaining human-review gaps
Financial-integrity confirmation
Demo-mode offline confirmation
Unresolved blockers with named owner and smallest next action
Suggested commit boundaries
Final verdict:
STOP SHIP
READY FOR INDEPENDENT REVIEW
READY FOR DEVICE VALIDATION
Confirmation that nothing was pushed, merged, tagged, or submitted as a PR

This is intentionally a **multi-wave remediation prompt**, not permission for the agent to make one enormous unreviewable patch. The work should not receive a release-ready verdict until the P0/P1 corrections, real Supabase tests, and native-device validation are evidenced.