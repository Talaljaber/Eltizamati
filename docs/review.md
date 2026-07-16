Act as the principal release architect and adversarial reviewer for Eltizamati.

Perform a focused pre–Phase 9 delta review.

This is not another whole-project audit.

The repository is the source of truth. Several remediation waves were already reviewed and implemented. Do not reopen completed findings without evidence of a regression.

STAGE A is review-only. Do not modify files or begin implementation.

## Objective

Determine:

1. Whether Waves 1–3 remain intact after the latest auth, profile, refresh, and PR #18 changes.
2. Whether Waves 4–6 are still required, already implemented elsewhere, partially complete, or safe to defer.
3. Whether Phase 8.5 can close.
4. Whether Phase 9 can begin.
5. The smallest exact remediation scope that remains.

Do not repeat work that has already been reviewed unless:

- relevant production code changed after the prior review;
- a test now fails;
- current code contradicts the prior conclusion;
- later architecture changes invalidated the earlier fix;
- runtime evidence shows a regression.

## Preflight

Run:

git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -30
git diff --stat
git diff
git ls-files --others --exclude-standard
node --version
pnpm --version

Record the current branch, HEAD, working-tree state, Node version, and whether PR #18 is present.

## Read

Read:

1. `docs/10-implementation/STATUS.md`
2. The active phase file
3. `docs/08-delivery/IMPLEMENTATION_PLAN.md`
4. `docs/fixplan.md`
5. `docs/10-implementation/phases/PHASE-09-hardening-and-release.md`
6. Relevant ADRs, audits, completion reports, current code, tests, migrations, and recent commits

Do not treat old documentation as current evidence.

# Part 1 — Establish the review delta

Identify:

- the commit where the Waves 1–3 remediation was completed;
- later commits touching startup, auth, profiles, consent, repositories, query keys, calculation dates, Home error handling, or lifecycle behavior;
- the current changes introduced by PRs #17 and #18;
- any uncommitted local work.

Create a changed-boundary map:

| Earlier reviewed boundary | Changed since review? | Relevant commits/files | Re-review depth |
|---------------------------|-----------------------|------------------------|-----------------|

Use these re-review depths:

- `NO RECHECK` — no relevant code changed and prior evidence remains valid;
- `REGRESSION SPOT-CHECK` — nearby code changed, so inspect affected paths and run focused tests;
- `FULL RECHECK` — the implementation was replaced or materially redesigned.

Do not perform a full recheck when `NO RECHECK` or `REGRESSION SPOT-CHECK` is sufficient.

# Part 2 — Waves 1–3 regression review only

## Wave 1 — Financial date correctness

Do not re-audit every calculation from scratch.

Check only:

- whether files resolving `asOf` changed after the accepted Wave 1 fix;
- whether any current personal-mode path again imports `DEMO_DATE`;
- whether relevant date-regression tests still pass;
- whether newer profile/auth work altered calculation context.

Run the focused date tests.

Return one:

- `WAVE 1 INTACT`
- `WAVE 1 REGRESSION FOUND`
- `WAVE 1 EVIDENCE INVALIDATED`

Only expand the review when a regression is found.

## Wave 2 — Auth, consent, startup, cleanup, lifecycle

The current auth architecture changed after the historical review. Review only affected boundaries.

Inspect current:

- ADR-0019 signup verification;
- returning password sign-in;
- profile provisioning and repair;
- consent;
- valid-session restoration;
- expired/revoked session behavior;
- startup settlement;
- repository commit acknowledgement;
- sign-out/deletion cleanup;
- user A → user B isolation;
- global entry exclusivity;
- AppState refresh.

Use previous findings as regression tests, not as a reason to redesign current auth.

Run focused current-architecture tests.

Return one:

- `WAVE 2 INTACT`
- `WAVE 2 PARTIALLY INVALIDATED BY AUTH REDESIGN`
- `WAVE 2 REGRESSION FOUND`

List only current defects.

Do not demand obsolete passwordless or callback flows that ADR-0019 superseded.

## Wave 3 — Personal-data error honesty

Check only screens and hooks changed since the previous Wave 3 review.

Verify:

- failures do not become empty results;
- personal mode does not show demo state;
- Home read failures use correct copy;
- Insights does not show a successful empty state under an error;
- retry remains functional.

Run focused Home and Obligations error-state tests.

Return one:

- `WAVE 3 INTACT`
- `WAVE 3 REGRESSION FOUND`
- `WAVE 3 VERIFICATION GAP`

Do not repeat a full screen-by-screen audit unless changed files justify it.

# Part 3 — Waves 4–6 full review

These are the main unresolved remediation candidates.

## Wave 4 — Supabase financial integrity

Review fully:

### Atomic obligation/subtype persistence

Determine whether create and update operations are transactional.

Verify:

- base and subtype rows commit or roll back together;
- production repositories use the transaction/RPC;
- ownership comes from the authenticated session;
- retries and idempotency;
- subtype mismatch prevention;
- decimal and provenance preservation;
- cross-user denial;
- rollback tests.

### Append-only rate history

Determine whether the database prevents unauthorized historical mutation.

Verify:

- annual rate;
- effective date;
- provenance;
- ownership;
- obligation reference;
- supersession behavior;
- delete behavior;
- same-owner forbidden updates;
- cross-user denial.

Require database enforcement and pgTAP/integration evidence.

Classify Wave 4:

- `VERIFIED COMPLETE`
- `PARTIALLY COMPLETE`
- `REQUIRED BEFORE PHASE 9`
- `BLOCKED BY LOCAL SUPABASE`
- `SAFE TO DEFER`

Financial persistence defects should not be deferred merely because the UI works.

## Wave 5 — Financial presentation and provenance

Review the unresolved Phase 8.5 findings and current material values.

Focus on:

- Murabaha detail;
- credit-card detail;
- Home aggregate;
- derived available credit;
- money/rate/percentage formatting;
- official, user-entered, estimated, derived, and demo provenance;
- missing values;
- Arabic financial formatting.

Do not re-review every stable primitive unless current usage is incorrect.

Classify Wave 5:

- `VERIFIED COMPLETE`
- `PARTIALLY COMPLETE`
- `REQUIRED BEFORE PHASE 8.5 CLOSE`
- `BELONGS IN PHASE 9`
- `SAFE TO DEFER`

## Wave 6 — Review each item separately

### SecureStore

Review overwrite, stale chunk deletion, corruption, failed writes, removal, and sign-out cleanup.

### Assets

Review icon, adaptive icon, splash, Expo configuration, and source-asset availability.

Do not treat Expo Go as final native evidence.

### Accessibility and Arabic

Review static defects and existing tests.

Separate code fixes from human/device checks that belong in Phase 9.

### Dependencies

Run:

pnpm audit --prod
npx expo-doctor
npx expo install --check

Classify each advisory by actual exploitability and compatible remediation.

### Documentation

Identify current contradictions only. Do not rewrite history during Stage A.

Classify each Wave 6 sub-item independently as:

- `VERIFIED COMPLETE`
- `REQUIRED BEFORE PHASE 9`
- `BELONGS INSIDE PHASE 9`
- `OWNER ACTION`
- `SAFE TO DEFER`

# Part 4 — Phase 8.5 exit gate

Evaluate only the recorded remaining gates:

- unresolved Murabaha/card provenance decision;
- add-obligation test finding;
- Arabic-reading review;
- owner exit-review sign-off;
- documentation consistency.

Do not repeat Workstreams 1–4 unless current code regressed.

Return:

- `PHASE 8.5 READY TO CLOSE`
- `PHASE 8.5 NEEDS OWNER/ARABIC SIGN-OFF`
- `PHASE 8.5 NEEDS CODE CORRECTION`
- `PHASE 8.5 STOP SHIP`

# Part 5 — Phase 9 entry readiness

Determine whether foundational remediation remains outside Phase 9.

Phase 9 may own:

- Maestro E2E;
- physical-device checks;
- Arabic walkthrough;
- accessibility device checks;
- personal-mode offline matrix;
- security checklist;
- Sentry;
- EAS preview build;
- rehearsals;
- final release documentation.

Phase 9 must not absorb unresolved:

- non-atomic financial persistence;
- unenforced rate-history integrity;
- material provenance defects;
- known cross-user isolation defects;
- broken session lifecycle;
- incorrect financial calculations.

Return:

- `READY TO ENTER PHASE 9`
- `READY AFTER PRE–PHASE 9 REMEDIATION`
- `NOT READY FOR PHASE 9`
- `STOP SHIP`

# Validation strategy

Do not rerun every historical focused test unnecessarily.

Run:

1. Tests directly covering changed boundaries since the Waves 1–3 review.
2. Tests covering Waves 4–6.
3. One current full repository gate to detect broad regressions.

Suggested commands:

pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run depcruise
pnpm run test:packages
pnpm --filter @eltizamati/mobile test -- --runInBand --detectOpenHandles
pnpm run check
pnpm audit --prod
npx expo-doctor
npx expo install --check
git diff --check

Where available:

supabase db reset
supabase test db
pnpm run test:integration

Do not claim database verification when Supabase cannot run.

# Required report

## 1. Executive decision

State:

- whether Waves 1–3 remain intact;
- which parts of Waves 4–6 remain;
- whether Phase 8.5 can close;
- whether Phase 9 may begin;
- the single recommended next action.

## 2. Delta map

Show which previously reviewed boundaries changed and why they did or did not need rechecking.

## 3. Wave table

| Wave | Review depth | Current state | Remaining work | Recommendation |
|------|--------------|---------------|----------------|----------------|

## 4. Mandatory pre–Phase 9 items

Include only release-blocking foundational corrections.

## 5. Work belonging inside Phase 9

List the actual hardening, device, release, and rehearsal work.

## 6. Safe deferrals

List optional or post-hackathon work with owners.

## 7. Evidence gaps

Separate:

- local tests;
- local Supabase;
- CI;
- hosted Supabase;
- SMTP;
- device;
- Arabic reviewer;
- accessibility;
- EAS;
- Sentry.

## 8. Proposed implementation order

Give the smallest ordered plan.

## 9. Final recommendation

End with exactly one:

- `RECOMMEND ENTERING PHASE 9 NOW`
- `RECOMMEND PRE–PHASE 9 REMEDIATION: <exact items>`
- `RECOMMEND PARTIAL REMEDIATION: <exact items>`
- `RECOMMEND DEFERRING REMAINING WAVES`
- `STOP SHIP — FOUNDATIONAL DEFECTS REMAIN`
- `STOP SHIP — REVIEW BLOCKED`

Then state:

No files were modified.
No implementation has started.
Waiting for Talal’s approval.

Do not implement until Talal replies with:

APPROVE RECOMMENDED PRE–PHASE 9 REMEDIATION

or:

APPROVE PARTIAL SCOPE: <exact items>

or:

APPROVE ENTERING PHASE 9