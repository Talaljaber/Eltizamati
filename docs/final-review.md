Act as an independent principal engineer, fintech systems auditor, React Native/Expo specialist, Supabase security reviewer, and adversarial QA lead for Eltizamati.

You did not implement the remediation and must not trust the fixing agent’s summary, claimed test results, or walkthrough.

Perform a post-remediation review of the entire repository and complete product flow.

Your goals are to determine whether everything built so far is:

- Correct
- Financially honest
- Secure
- Properly isolated by user and data mode
- Reliable during real lifecycle events
- Maintainable
- Scalable without premature architecture
- Testable
- Consistent with repository documentation
- Ready for device validation or release hardening

This is a REVIEW-ONLY task.

Do not fix application code.

Do not reformat files.

Do not install or upgrade dependencies unless they are already available and installation is required only to run the locked repository checks.

Do not commit, push, merge, open a PR, tag, reset, stash, clean, or discard changes.

You may create exactly one review artifact:

`docs/10-implementation/audits/POST-REMEDIATION-WHOLE-CODEBASE-REVIEW-2026-07-14.md`

Do not modify any other file.

## Timing condition

Start only after the remediation agent has finished and the working tree is no longer actively changing.

Record the start and end working-tree state.

If files change during the review, stop and report that the review baseline was unstable.

## Core posture

Assume:

- Passing tests may be weak or incorrectly mocked.
- Documentation may be stale.
- A fix may solve one path and break another.
- A shared primitive change may affect screens outside the intended scope.
- A correct UI may still use incorrect data.
- A correct calculation may still be presented dishonestly.
- A repository test may pass while the real app route is unreachable.
- RLS tests may pass while same-user financial mutation rules remain unsafe.
- A successful happy path does not prove lifecycle correctness.
- Demo mode and personal mode may accidentally leak into each other.
- Local Expo behavior may differ from preview/release builds.

Do not report generic best practices as findings. Every finding must have repository-specific evidence.

## Preflight

Run:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline -25
git diff --stat
git diff --name-status
git diff
node --version
pnpm --version

Record:

Current branch
Current HEAD
Remote tracking position
Whether changes are staged or unstaged
Files changed by the remediation
Whether unrelated work is mixed in
Whether the environment uses supported Node LTS

Compare the current tree against:

The supplied STOP SHIP report
Audit HEAD 4910a8809e0303b2dd8c16360c72946b00f312a7
Current committed main
The fixing agent’s claimed file list and test results

Do not assume all remediation changes are visible on GitHub.

Read in this order
docs/10-implementation/STATUS.md
The active phase file
docs/08-delivery/IMPLEMENTATION_PLAN.md
The supplied whole-project STOP SHIP review
The remediation agent’s final report
Relevant completion reports and prior audits
AI_AGENT_RULES.md
CODE_REVIEW_CHECKLIST.md
Architecture and ADR documents
Domain and financial specifications
Database schema and migrations
Current application code
Current tests
Recent commit and PR history
Review coverage map

Before producing findings, create a coverage map showing which areas were inspected:

apps/mobile/app/**
apps/mobile/src/core/**
apps/mobile/src/features/**
apps/mobile/src/services/**
packages/domain/**
packages/finance-engine/**
packages/demo-data/**
supabase/migrations/**
supabase/functions/**
supabase/tests/**
.github/workflows/**
Expo/native configuration
Documentation
Tests and fixtures
Assets
Dependencies and lockfile

For each area mark:

Inspected
Tested
Runtime-verified
Not verifiable in this environment

Do not claim “whole codebase reviewed” without this map.

Part 1 — verify every prior finding

Independently re-check findings F-01 through F-14 from the STOP SHIP report.

For each finding classify it as:

FIXED AND VERIFIED
FIXED IN CODE, RUNTIME VERIFICATION MISSING
PARTIALLY FIXED
NOT FIXED
REGRESSED
NOT REPRODUCIBLE
SUPERSEDED BY A DIFFERENT DESIGN

At minimum verify:

F-01 — calculation date
No personal financial path uses DEMO_DATE.
Demo mode remains deterministic.
Personal mode uses one explicit, testable asOf.
Home, list, detail, status, next payment, calculations, and persisted runs agree.
No scattered new Date() calls create inconsistent dates.
Boundary tests prove behavior across due-date transitions.
F-02 — password recovery
Recovery links reach an actual app route.
Recovery is distinguished from ordinary sign-in.
User can enter and confirm a new password.
updateUser or the approved equivalent is called.
Expired, malformed, reused, and cancelled flows behave safely.
Callback URLs are documented for every environment.
Recovery does not bypass consent.
F-03 — consent
Demo mode cannot bypass required acknowledgment.
Immediate-session signup cannot bypass it.
Confirmation-required signup cannot bypass it.
Returning users are handled correctly.
Consent is versioned and persisted.
No route marks onboarding complete prematurely.
F-04 — sign-out and deletion cleanup
Session, SecureStore, QueryClient, repositories, active-user state, notification state, and mode state are handled intentionally.
User A data cannot appear for user B.
Account deletion does not assume database deletion signs out the client.
Cleanup is idempotent.
Partial failures are recoverable.
F-05 — personal error honesty
Personal query failures do not become empty arrays.
Personal mode never shows DemoBanner.
Offline, authorization, timeout, revoked-session, and unexpected errors are distinct.
Retry works.
Stale cached data is labeled honestly.
No silent demo fallback exists.
F-06 — startup and splash coordination
One startup coordinator owns readiness.
Splash release cannot hang.
React startup cannot spin forever.
Demo startup does not create Supabase.
Personal startup waits for valid session and repositories.
Callback startup settles.
Every error branch reaches recoverable or fatal UI.
No arbitrary delay hides races.
F-07 — Supabase write integrity
Obligation base and subtype writes are atomic.
Partial obligations cannot remain after failure.
Ownership is derived safely.
Rate history obeys the intended append-only/correction model.
Same-owner unauthorized financial-field updates are rejected.
RLS and database integrity are tested separately.
F-08 — financial presentation
Card and Murabaha values use correct locale, currency, precision, and provenance.
Derived values do not appear externally official.
Missing values are not changed to zero.
Rates are not rendered as money.
Arabic and English preserve meaning.
F-09 — lifecycle and freshness
AppState controls auth refresh correctly.
Foreground revalidation is intentional.
Demo mode avoids Supabase lifecycle work.
Personal financial queries do not remain stale indefinitely.
Async auth subscriptions cannot register after unmount.
Listeners are released.
F-10 — SecureStore
Chunk shrink and overwrite remove old chunks.
Partial writes cannot replace valid committed data.
Corrupted manifests are handled.
Sign-out removes all session material.
Token contents never enter logs.
F-11 — native assets
App icon is square and suitable for release.
Adaptive foreground has transparency and safe-zone compliance.
Splash art is purpose-built.
No black edges, pale rectangular tile, crop, or stretching.
Expo configuration resolves correctly.
Device evidence is clearly distinguished from static inspection.
F-12 — accessibility and Arabic
Long Arabic content is not forced to one line where meaning is lost.
Touch targets meet the project minimum.
Links and buttons expose correct roles.
RTL icons and navigation direction are correct.
Large text does not clip.
Provenance and status do not rely on color.
Screen-reader claims are not made without evidence.
F-13 — dependency audit
Re-run production audit.
Confirm whether reported vulnerable packages remain.
Verify unused dependencies were removed safely.
Check that remediation did not introduce broad or unrelated upgrades.
Confirm Expo compatibility and lockfile consistency.
F-14 — documentation
STATUS reflects actual branch, HEAD, phase, test count, and blockers.
Active phase status is consistent internally.
Completion claims have evidence.
Auth and splash documentation matches current code.
Device checks are not claimed without evidence.
No obsolete SQLite or old routing assumptions remain in live instructions.
Part 2 — challenge every product flow

Review the complete user journey as a connected system, not isolated screens.

Fresh user
Cold install
→ native splash
→ startup hydration
→ language selection
→ consent/disclosure
→ demo or personal decision
→ authentication where applicable
→ repository initialization
→ Home

Look for:

flashes of the wrong screen
loops
dead ends
bypasses
double navigation
duplicate submissions
state saved too early
state saved too late
impossible recovery
missing back behavior
wrong mode selection
incorrect banner state
Demo journey
Enter demo
→ Home
→ obligations
→ loan detail
→ rate history
→ rate impact
→ explanation
→ scenario
→ insights
→ card
→ Murabaha
→ add/edit/log actions
→ settings
→ reset demo
→ relaunch offline

Verify:

zero network construction and requests
deterministic date
reset correctness
no auth requirement
visible demo labeling
same domain and engine path as personal mode
no fake provider presented as connected
no demo values leaking into personal storage
Personal journey
Sign up
→ confirmation or immediate session
→ consent
→ profile
→ repository boot
→ add obligation
→ edit
→ log payment
→ log rate
→ calculations
→ insights
→ sign out
→ relaunch
→ sign in again

Verify:

Supabase-backed persistence
proper provenance
correct cache ownership
current-date calculations
honest offline states
session restoration
user-switch isolation
mutation invalidation
no stale screen after write
no hidden partial persistence
Recovery and destructive journey
Forgot password
→ email link
→ callback
→ new password
→ confirmation
→ sign in

Delete account
→ confirmation
→ server deletion
→ local cleanup
→ relaunch

Challenge:

malformed links
expired links
repeated links
cancellation
offline action
server success/client cleanup failure
client success/server failure
relaunch after partial failure
notification deep links into deleted resources
Lifecycle journey

Review:

foreground/background
process death
cold start
warm start
token expiration
revoked session
network loss
network recovery
callback cold start
notification cold start
rapid language switch
rapid mode switch
double-tap mutations
navigation while mutation is pending
Part 3 — architecture and scalability review

Challenge whether the current architecture is clean and appropriately scalable.

Inspect:

Boundaries
UI does not contain financial logic.
UI does not call Supabase directly.
Services own mutations.
Repositories own persistence mapping.
Domain does not depend on mobile.
Finance engine remains pure and deterministic.
Demo and Supabase repositories implement compatible contracts.
Provider DTOs do not leak into the domain or UI.
Derived values are not persisted as source truth unless explicitly designed.
Dependency direction

Run dependency-cruiser and manually inspect for:

cycles
feature-to-feature coupling
core importing features
demo-data/finance-engine cycles
test-only dependencies leaking into production
route components becoming service containers
giant hooks mixing persistence, finance, UI, and navigation
Duplication and maintainability

Search for:

rg -n "TODO|FIXME|HACK|TEMP|XXX|placeholder|not implemented|throw new Error|console\\." apps packages supabase

rg -n "DEMO_DATE|demo-seed|mock|fixture|Fictional" apps packages

rg -n "Date\\.now|new Date\\(|Math\\.random" apps packages

rg -n "toStorageString\\(|Money\\.of|Rate\\.fromPercent|Percentage\\.of" apps/mobile

rg -n "supabase\\.|from\\(|rpc\\(" apps/mobile/app apps/mobile/src/features

rg -n "any\\b|as unknown as|@ts-ignore|@ts-expect-error|eslint-disable" apps packages supabase

rg -n "useEffect|useMemo|useCallback" apps/mobile

Review each meaningful result for:

bypassed abstractions
unsafe casts
duplicated business rules
stale workarounds
dead code
unreachable routes
unused screens
hidden test helpers in production
oversized components
unclear ownership
excessive configuration
premature generic abstractions

Do not demand abstraction merely because code repeats twice. Recommend change only where the current structure creates a concrete risk.

Part 4 — financial-integrity review

Audit every path that produces or displays a material financial value.

Verify:

Money uses decimal-safe boundaries.
No unsafe JS-number arithmetic is used for money.
Rates and percentages use approved value objects.
Calculation asOf is explicit.
Formula identity and version are preserved.
Inputs and assumptions are reproducible.
Refusal is handled as a valid outcome.
Missing data is not invented.
Estimates cannot appear official.
User-entered values remain labeled.
Demo values remain labeled.
Official values retain source and observed date.
Derived values are distinguishable from imported values.
Calculation runs cannot collide through serialization defects.
Persisted calculations remain linked to their inputs.
Islamic-financing terminology remains contract-correct.
Admin-like or UI code cannot edit engine outputs.
Tests do not derive expected values from the implementation under test.

Trace at least these values end-to-end:

Original principal
Outstanding balance
Installment
Current rate
Rate-history periods
Next payment
Aggregate monthly commitment
Residual projection
Scenario output
Credit limit
Card balance
Minimum payment
Available credit
Murabaha asset cost
Disclosed profit
Total sale price
Insight thresholds

For every traced value record:

source
→ provenance
→ repository mapping
→ domain type
→ calculation
→ display primitive
→ test evidence
Part 5 — Supabase and security review

Inspect:

migrations from first to latest
grants
RLS policies
functions
triggers
RPCs
generated types
client repositories
Edge Functions
auth configuration
secrets
logs
deletion behavior

Challenge:

cross-user isolation
same-user integrity
parent/child ownership
service-role boundaries
privilege escalation
mutable audit history
raw SQL injection risk
over-broad grants
unsafe RPC search paths
missing authorization inside security-definer functions
partial writes
orphan records
duplicate records
idempotency
account erasure
export behavior
callback allowlists
client-bundled secrets
unsafe error details
PII in logs

Run pgTAP and integration tests only against a reset local Supabase stack.

Do not treat mocked Supabase clients as database evidence.

Part 6 — state, cache, and concurrency review

Inspect every TanStack Query key and mutation.

Verify:

Query keys include user/mode identity where required.
Sign-out clears or partitions cache.
Mutations invalidate all affected queries.
Optimistic updates cannot fabricate financial values.
Concurrent writes cannot overwrite newer data.
Duplicate button presses are guarded.
Screens handle stale closures.
Effects clean up.
Abort/cancellation behavior is safe.
Navigation does not occur before persistence succeeds.
Async errors do not become unhandled promises.
Module-level singletons do not retain prior-user state.
Repository instances are released or replaced correctly.

Look for race conditions involving:

auth restoration
onboarding hydration
mode hydration
repository initialization
query execution
splash hiding
notification response
language initialization
account deletion
sign-out
foreground refresh
Part 7 — UI, RTL, accessibility, and content review

Review every user-facing screen, not only the five representative screens.

Verify:

Arabic and English keys exist.
No fallback English leaks into Arabic.
Long Arabic labels are viable.
Mixed Arabic/Latin/numeral strings are directionally safe.
Back, next, disclosure, and chevron icons follow direction correctly.
Touch targets meet requirements.
Screen-reader labels identify action and financial provenance.
Loading, empty, error, limited, and refused states exist.
Destructive actions are separated.
One primary action exists where appropriate.
Forms preserve input after failure.
Validation messages identify the actual issue.
Keyboard and safe-area behavior are reasonable.
Material information is not hidden only in color or icons.
No emoji or raw platform controls bypass the design system without justification.
Hardcoded colors, spacing, or money formatting are absent in feature code.

Do not claim native quality from static inspection alone.

Part 8 — notifications and deep links

Review:

permission request timing
scheduling
rescheduling
cancellation
reminder ownership
sign-out cleanup
account-deletion cleanup
allowed routes
malformed payloads
cold-start response
foreground response
deleted-resource handling
localization
quiet-hour behavior
sensitive content in notification body
reinstall behavior

Verify untrusted payload data cannot navigate to arbitrary routes.

Part 9 — reliability, performance, and release readiness

Inspect:

loading performance
unnecessary rerenders
unbounded list rendering
repeated finance calculations
synchronous work on render
expensive property tests
memory/resource cleanup
Jest open handles
network retries
timeout policy
error boundaries
fatal configuration handling
Expo config
icons and splash
EAS configuration
release-only environment behavior
source maps and observability
production logging
dependency audit
lockfile integrity

Do not optimize speculative micro-performance. Report measurable or structurally credible risks.

Part 10 — test-quality review

Do not only count tests.

Challenge whether tests prove the real behavior.

Inspect for:

mocks replacing the system under test
route tests that never mount routing
repository tests that never reach Supabase
expected values generated from production code
assertions that only check “does not throw”
snapshots with no semantic checks
missing negative tests
missing boundary dates
missing two-user tests
missing lifecycle tests
no cleanup assertions
tests skipped or conditionally disabled
tests passing while workers leak
fake timers not restored
module state leaking between tests
Arabic tests that mock translation with English
accessibility tests that only inspect props
database tests that prove cross-user denial but not same-user integrity

Map requirements and major flows to actual tests.

Identify the top 10 highest-value missing tests, ranked by risk.

Commands

Use supported Node LTS.

Run sequentially:

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

Run relevant test suites with open-handle diagnostics if the worker does not exit cleanly.

Where available:

supabase start
supabase db reset
supabase test db
pnpm run test:integration

Do not claim database verification if these commands cannot run.

Do not claim native splash, icon, SecureStore, notification, background-refresh, RTL, accessibility, or release-build behavior without actual runtime evidence.

Runtime matrix

Where device/emulator access exists, record:

Platform
OS version
Device
Build type
App commit
Locale
Text scale
Network state
Scenario
Outcome
Screenshot/video reference

Test:

Fresh install EN
Fresh install AR
Returning demo offline
Returning personal online
Personal offline
Email-confirmation signup
Password recovery
Sign-out/relaunch
Delete/relaunch
User A → User B
Background through expiry
Foreground refresh
Cold-start callback
Cold-start notification
Large text
RTL
Android icon masks
Native splash success and failure
Finding standard

Every finding must contain:

ID
Severity: P0, P1, P2, or P3
Confidence: high, medium, or low
Category
Exact file and symbol
Evidence
Reproduction
Expected behavior
Actual behavior
User/security/financial impact
Root cause
Why existing tests missed it
Smallest recommended correction
Tests required
Whether it blocks release, device validation, or later scaling

Severity:

P0: cross-user exposure, unrecoverable data loss, materially wrong financial output, secret exposure, or unusable core product
P1: broken primary flow, serious financial-honesty issue, auth/session failure, database-integrity defect, or startup failure
P2: meaningful reliability, maintainability, accessibility, or operational issue with a workaround
P3: minor defect or cleanup with limited user impact

Do not inflate severity.

Do not include preferences, stylistic opinions, or hypothetical future-scale problems unless tied to current evidence.

Required report structure

Write the report to:

docs/10-implementation/audits/POST-REMEDIATION-WHOLE-CODEBASE-REVIEW-2026-07-14.md

Also return the same executive result in the final response.

The report must include:

Executive verdict
Repository baseline
Review coverage map
Prior F-01–F-14 verification table
New P0 findings
New P1 findings
New P2/P3 findings
Complete user-flow assessment
Financial-integrity assessment
Auth/session/isolation assessment
Supabase/database assessment
Demo/personal separation assessment
Architecture and scalability assessment
State/cache/concurrency assessment
UI/Arabic/RTL/accessibility assessment
Notification/deep-link assessment
Security/privacy assessment
Performance/reliability assessment
Dependency/release assessment
Test-quality assessment
Documentation consistency assessment
Commands and exact results
Runtime evidence
Unverified areas
Top 10 remaining actions
Final decision

Final decision must be exactly one of:

STOP SHIP
REMEDIATION INCOMPLETE
READY FOR TARGETED FIXES
READY FOR DEVICE AND SUPABASE VALIDATION
READY FOR RELEASE-HARDENING REVIEW
Final restrictions
Do not fix findings.
Do not weaken tests.
Do not hide warnings.
Do not suppress dependency advisories without analysis.
Do not mark external configuration verified from source code alone.
Do not mark financial correctness proven by coverage percentage.
Do not mark the phase complete.
Do not push, merge, commit, tag, or open a PR.
Confirm that the only file created or changed by this review is the audit report.

