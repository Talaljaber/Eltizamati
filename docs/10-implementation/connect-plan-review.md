# Review of `connect-plan.md`

**Reviewed:** 2026-07-21  
**Verdict:** **Do not implement the plan exactly as written.** The feature direction is sound, but the current plan has several correctness and regression risks. Apply the required updates below before implementation.

The original `connect-plan.md` remains unchanged. This review is based on the current repository, including the atomic obligation RPCs, provider/import services, personal-entry startup flow, consent repository, payment-authority pgTAP coverage, and repository rules.

## What is already correct

- Reusing `MockConnectService`, `ImportService`, the existing provider consent record, `JORDAN_BANKS`, and the design system is the right direction.
- Keeping the provider permanently offline and deterministic is consistent with US-017.
- Imported records must carry `connectionType: 'official'` and mock/demo provenance.
- Fixing `connection_type` forwarding is necessary: the current schema default makes manual schema-backed obligations persist as `official`.
- Routing only after authenticated profile provisioning and consent preparation is correct.
- Leaving `/connect-mock` in place during the transition reduces route-regression risk.

## Required corrections before implementation

### 1. Make `p_connection_type` required; do not give it an `official` default

The proposed default is dangerous because any missed call site silently becomes bank-authoritative. It also cannot be placed before required parameters in PostgreSQL: after an input parameter has a default, all following input parameters must also have defaults.

Required approach:

- Add `p_connection_type text` as a **required** argument to all three RPCs.
- Pass `obligation.connectionType` from every repository call.
- Keep the table `CHECK` constraint as the final allowed-value guard.
- Do not infer `official` from absence. A missing value must fail loudly.

### 2. Explicitly drop the old RPC signatures

`CREATE OR REPLACE FUNCTION` does not replace a function when its argument signature changes; it creates an overload. If the old signatures remain, old clients can keep calling them and continue receiving the table default.

The migration must:

1. Drop the three exact old signatures.
2. Create the three new required-argument signatures.
3. `REVOKE ALL ... FROM PUBLIC` on each new function.
4. `GRANT EXECUTE ... TO authenticated` using exact signatures.

Preserve `SECURITY INVOKER`, `auth.uid()` ownership, kind guards, RLS behavior, and the atomic base/detail write.

Add a pgTAP test that invokes each new RPC as an authenticated user and proves:

- `personal` is stored as `personal` for loan, Murabaha, and card.
- `official` is stored as `official` for all three kinds.
- omitting `p_connection_type` no longer resolves to an old overload.
- cross-user and kind-conflict guards remain unchanged.

The existing `70_payment_authority_and_connection_type.sql` proves authority behavior for directly inserted rows, but it does **not** prove that the save RPCs forward the value.

### 3. Persist loan rate periods explicitly

The current `ImportService.importProviderObligation()` only calls `obligationRepository.save()`. The Supabase loan RPC writes `obligations` and `loan_details`, but it does not write `rate_periods`. Therefore, merely adding rate periods to the classified loan entity will not persist them.

Update the import use case so a conventional loan's initial rate periods are appended through `ratePeriodRepository` after the obligation write, with an explicit failure policy. Add an integration test that imports a loan and reads it back with its initial rate history intact.

Do not state that `ImportService` “already expects” an initial rate period; it currently does not.

### 4. Define all-or-nothing behavior for multi-select import

Looping `importProviderObligation()` can leave a partial import if record 2 or its rate period fails after record 1 succeeds. Returning only `importedCount` hides this state.

Choose and document one of these contracts before implementation:

- **Preferred:** add a database RPC that atomically imports the selected normalized records and their initial rate periods in one transaction.
- **Acceptable for the offline mock:** implement compensating rollback by deleting only records created by this attempt, prove cleanup failures are surfaced, and never delete pre-existing records during rollback.

Return a typed summary containing imported IDs, skipped/duplicate IDs, and failure details. The UI must not report complete success after a partial write.

### 5. Make imported IDs stable and collision-safe

The current mock card ID is based only on `userId`, so another record or bank can overwrite/conflict with it. Generate deterministic IDs from at least:

`providerId + bankId + externalId + userId`

Use the repository's UUID generator/UUID-compatible deterministic strategy; do not construct arbitrary branded strings that PostgreSQL cannot accept as `uuid`.

Define repeat-import behavior. Recommended: importing the same external record is idempotent (reported as already imported or updated), while different banks/records never collide. Add tests for repeated import, same external ID at two banks, and two users importing the same catalog record.

### 6. Keep the demo-data package independent of app types

`packages/demo-data` must not import `MockProviderRecord` from the mobile app. Put the catalog's raw fixture type in `@eltizamati/demo-data` (or a lower-level provider contract package) and map it to domain entities inside the mobile provider adapter/application service.

Use deterministic dates from `DEMO_DATE`; avoid `new Date()` in classification if repeatable output is required. If import timestamps intentionally use real time, distinguish those timestamps from deterministic provider observations and test that contract.

### 7. Scope completion to the authenticated user, not the device

A single AsyncStorage key such as `bankConnectComplete` is device-global. User A completing the step would incorrectly suppress it for a new User B on the same device. It would also require careful cleanup on sign-out/delete.

Preferred approach:

- Store completion server-side on the authenticated user's profile (or in a dedicated versioned onboarding-state table), e.g. a versioned `bank_connect_onboarding_version`/completion timestamp.
- Read it through the existing user-profile repository after profile provisioning.
- Treat it as user-scoped, versionable state.

If a local flag is retained temporarily, key it by authenticated user ID, include it in `runLocalUserBoundaryCleanup`, and add sign-out/account-switch tests. A plain global key is not acceptable.

### 8. Route consistently on cold start and resume interrupted flows

Changing only `use-entry-completion.ts` is insufficient. `StartupCoordinator` independently calls `preparePersonalEntry()` and currently routes a ready personal session directly to `/(tabs)/`. If the app is killed during connect-bank, cold start will bypass the unfinished step.

Create one shared routing decision/use case used by both `useEntryCompletion` and `StartupCoordinator`:

1. profile/consent not ready -> existing consent/auth route;
2. bank-connect onboarding incomplete -> `/connect-bank`;
3. complete -> `/(tabs)/`.

Do not duplicate the decision in two hooks. Add cold-start tests for incomplete, complete, signed-out, and consent-required states.

The flow store also needs a process-death policy. At minimum, persist the user-scoped completion state and safely restart at bank selection. If the product requires resuming the exact screen, persist only the minimal non-sensitive draft state.

### 9. Keep consent as a real gate before retrieval

Do not combine “show/record consent” ambiguously inside the picker. Reuse a dedicated consent screen or a shared consent use case, then retrieve only after `consentRepository.status()` confirms the current document version.

Support an explicit return route so the existing `/connect-mock` and new `/connect-bank` flows can share the consent implementation without hard-coded navigation loops. Test that retrieval is never called before consent succeeds and that a failed consent write remains recoverable.

### 10. Preserve the permanent mock disclosure on every bank-like screen

Using real Jordanian bank names with a realistic sign-in can imply affiliation or live access. US-017 and C-07 require the opposite.

Every picker, sign-in, selection, and completion screen must visibly state that this is a simulated demo and no bank connection occurs. The sign-in screen must:

- use secure password entry;
- never persist or log account/password values;
- avoid sending credentials anywhere;
- label the biometric action as simulated/mock rather than a real device authentication;
- clear credential state when leaving/resetting the flow.

Add screen assertions for the mock disclosure in EN and AR. Do not use “pulled from your bank” without a nearby mock qualifier.

### 11. Do not copy the checkbox implementation into another screen first

Extract and test the shared `Checkbox` primitive, then migrate onboarding consent and use it in the selection list. Preserve checked/unchecked accessibility state (`accessibilityRole="checkbox"` and `accessibilityState.checked`), disabled state, focus/touch target, RTL layout, and theme tokens.

### 12. Invalidate query caches after import

The plan must name the application mutation/query layer that refreshes Home and Obligations after import. Calling the service directly from a route can leave cached lists stale and violates the established UI -> application -> repository direction.

Add a connect-bank mutation hook/service that owns import state and invalidates the centralized obligation/dashboard query keys after success. Route components should remain thin.

### 13. Update source-of-truth documentation, not only translations/tests

The current screen inventory still describes “Connect bank/bureau — coming soon,” and US-017 only specifies the older single mock-connect flow. Update at least:

- `docs/02-ux/screen-inventory.md` with IDs/states for picker, mock sign-in, selection, completion, loading/error/empty/offline, and interrupted-resume behavior;
- the relevant requirement/user-story acceptance criteria;
- provider/demo-data documentation for the per-bank catalog and duplicate behavior;
- threat model/privacy wording for fake credential handling;
- implementation status/traceability after completion.

This is required by `AI_AGENT_RULES.md`; implementation must not invent new routes and states that are absent from the specs.

## Revised implementation order

### Phase A — Documentation and contracts

1. Update requirements, screen inventory, provider contract, privacy/threat-model notes, and acceptance criteria.
2. Define raw catalog record types, required fields per product kind, stable ID rules, duplicate behavior, and transaction/failure semantics.
3. Define the shared post-auth routing decision and user-scoped completion model.

### Phase B — Database correctness first

1. Create the migration with the Supabase CLI's project-approved migration command; do not invent a timestamp placeholder.
2. Drop old RPC signatures and create required-`p_connection_type` signatures.
3. Revoke `PUBLIC`, grant exact execute privileges to `authenticated`.
4. Add RPC-forwarding pgTAP coverage and rerun the existing RLS/payment-authority suites.
5. Regenerate `database.types.ts` using the repository command; never hand-edit it.
6. Update repository RPC arguments and repository contract tests.

### Phase C — Provider catalog and import use case

1. Add pure deterministic per-bank raw fixtures to `@eltizamati/demo-data` and export them through its public API.
2. Extend `MockConnectService.retrieve(bankId)` and classification for all three kinds.
3. Use collision-safe deterministic UUIDs and explicit source references.
4. Implement atomic or compensating multi-import, including initial rate periods.
5. Add unit and Supabase integration tests for mapping, idempotency, rollback, and read-back.

### Phase D — Shared onboarding state and navigation

1. Add user-scoped/versioned completion persistence.
2. Add one shared routing decision used by post-verification entry and cold start.
3. Add startup/account-switch/sign-out tests.
4. Add a minimal flow store with a documented process-death reset/resume policy.

### Phase E — UI

1. Extract and test `Checkbox`.
2. Add a reusable consent return-route mechanism.
3. Build picker, mock sign-in, selection, and completion screens through feature hooks/services rather than direct repository access.
4. Add permanent mock disclosure, loading/error/empty/retry states, accessibility, keyboard handling, RTL, and EN/AR copy.
5. Invalidate Home/Obligations queries after successful import.
6. Preserve `/connect-mock` until references and tests prove it can be retired separately.

### Phase F — Verification

Run, at minimum:

- migration reset/up and generated-type verification;
- all pgTAP suites, especially atomic writes, RLS, and payment authority;
- repository integration tests for all three kinds;
- mock provider/import tests including partial failure and duplicate import;
- post-auth and cold-start routing tests;
- connect-bank screen tests in EN and AR;
- sign-out/account-switch cleanup tests;
- full `pnpm check`;
- manual fresh-signup, interrupted-flow relaunch, two-user same-device, repeat-import, and cold-start walkthroughs.

## Additional acceptance cases to add

- A bank returns zero obligations: show an honest empty state and allow choosing another bank or skipping.
- Unknown bank ID or malformed fixture: return a typed error; do not silently fall back to another bank.
- Consent version changes: require re-consent before any new retrieval.
- Import fails after one selected record: no unreported partial success.
- Same record selected twice/re-imported: no duplicate obligation or duplicate rate periods.
- Two banks expose equal `externalId` strings: records remain distinct.
- App is killed on sign-in/select/done: relaunch follows the documented restart/resume policy.
- User signs out during the flow: no prior user's draft/completion/credentials appear for the next user.
- Dashboard and obligation list update immediately after import.
- Imported official records reject customer-entered payments; manually created personal records still accept them.
- Mock disclosure remains visible at large font scale and in RTL.

## Branch/worktree note

The repository is currently on `main` with pre-existing user changes (`supabase/functions/.env.example` modified and `connect-plan.md` untracked). Before implementation, create the feature branch without discarding or accidentally committing unrelated work. The review itself does not alter those files.

## Final recommendation

Proceed after incorporating the required corrections above. The highest-priority blockers are: required RPC argument plus removal of old overloads, persisted loan rate periods, all-or-nothing multi-import, user-scoped completion, and shared cold-start/post-verification routing. Without those changes, the feature can silently misclassify manual obligations, lose loan rate history, partially import selections, or skip onboarding for the wrong user.
