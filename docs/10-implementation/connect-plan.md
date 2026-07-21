# Onboarding: "Pull your loans from your bank" step

## Context

Post-hackathon, the team wants a guided onboarding step that runs right after a
new user finishes sign-up + email verification. The user connects to a bank
(a **demo/mock** sign-in — account number + password, or a **simulated** Face ID),
the app "pulls" that bank's loan obligations, the user **ticks which to import**,
presses Done, and is asked **"Do you have any other obligations?"** — *Yes* loops
back to pick another bank, *No/Skip* proceeds into the app.

Goal: reduce empty-state friction so a new user lands already populated with
their obligations, in a way that feels like a real bank connection while
remaining a deterministic offline demo.

This plan supersedes the first draft after a detailed self-review
(`docs/10-implementation/connect-plan-review.md`). That review caught real
defects in the first draft — an invalid defaulted RPC param, a
`CREATE OR REPLACE` overload trap, unpersisted loan rate periods, partial-import
risk, a device-global completion flag, and a cold-start routing gap. All 13
corrections are incorporated below.

**Decisions locked with the user:**
- Imported loans are **`official`** (bank-authoritative). Requires a real DB fix.
- Face ID is **simulated** (mock prompt, no native dependency).
- Pulled obligations come from a **per-bank deterministic catalog**.
- Everything built **reusable** (a later in-app "+ Connect bank" entry can reuse it).
- Multi-import is **idempotent + retry** (stable IDs make re-import a no-op; a
  typed summary reports imported/skipped/failed; no atomic RPC, no compensating
  deletes).
- "Bank-connect done" state lives **server-side on the user profile**
  (versioned, user-scoped), not a device-local flag.

> **Implementation must start on a NEW branch** off `main`
> (e.g. `feat/onboarding-bank-connect`), created without discarding the existing
> uncommitted work (`supabase/functions/.env.example`, any untracked plan files).
> Nothing lands on `main`.

## What already exists (reuse, don't reinvent)

- `apps/mobile/src/services/mock-connect-service.ts` — `MockConnectService` with
  the `retrieve() → classify() → retrieveAndImport()` split that mirrors a real
  provider boundary. Today `retrieve()` returns **one** hardcoded card. We widen
  it to a per-bank **list** across kinds.
- `apps/mobile/src/services/import-service.ts` — `importProviderObligation()`
  is the shared persist boundary. **Note:** it currently calls only
  `obligationRepository.save()` — it does **not** append rate periods (see B/C).
- `apps/mobile/app/connect-mock/{index,consent}.tsx` — existing single-card
  screen + provider consent (`docType: 'provider:mock-open-banking'`, `v1`).
  Reuse the consent doc type; keep `/connect-mock` until it can be retired
  separately.
- `apps/mobile/src/features/auth/data/jordan-banks.ts` — `JORDAN_BANKS` picklist.
- `apps/mobile/app/onboarding/consent.tsx` — checkbox pattern to extract.
- `apps/mobile/src/core/design-system/primitives/ListRow.tsx` — row primitive.
- Design system + `react-i18next` (copy in `apps/mobile/src/i18n/translations/{en,ar}.json`).
- `packages/demo-data` — deterministic builders + `DEMO_DATE`.

## The `connection_type` gap (root fix)

`save_conventional_loan` / `save_murabaha` / `save_card`
(`supabase/migrations/20260715090000_...sql`) never write `connection_type`, and
`obligation-repository.ts` never passes it, so it always falls to the DB default
`'official'`. Result today: manual entries meant to be `personal` persist as
`official`. This must become authoritative before the feature can rely on it.

---

## Revised implementation order (Phases A–F)

### Phase A — Documentation & contracts first (AI_AGENT_RULES.md)

Update source-of-truth docs *before* code (the review flags that the current
specs still say "Connect bank/bureau — coming soon"):
- `docs/02-ux/screen-inventory.md` — IDs/states for picker, mock sign-in,
  selection, completion, plus loading/error/empty/offline and interrupted-resume.
- Relevant requirement / US-017 acceptance criteria (per-bank catalog, duplicate
  behavior, official classification).
- Provider / demo-data contract doc for the per-bank catalog.
- Threat-model / privacy wording for **fake credential handling** (never persist,
  log, or transmit credentials; simulated biometric).
- Define the shared post-auth routing decision and the user-scoped completion
  model as written contracts.

### Phase B — Database correctness

New migration (create with the Supabase CLI's approved command — **no invented
timestamp placeholder**):
1. **DROP** the three exact old `save_*` signatures (a changed signature would
   otherwise create an overload, leaving old callers on the table default).
2. **CREATE** the three new signatures with **required** `p_connection_type text`
   (no default — a missing value must fail loudly, and a defaulted param cannot
   legally precede required params anyway). Add `connection_type` to each
   `INSERT` column list and the `on conflict do update set` clause. Preserve
   `SECURITY INVOKER`, `auth.uid()` ownership, kind guards, RLS, and the atomic
   base+detail write.
3. `REVOKE ALL ... FROM PUBLIC`; `GRANT EXECUTE ... TO authenticated` on the
   exact new signatures.
4. Keep the table `CHECK (connection_type IN ('personal','official'))` as the
   final guard.
5. **pgTAP** (new): as an authenticated user, prove `personal→personal` and
   `official→official` for loan/murabaha/card; that omitting `p_connection_type`
   no longer resolves to an old overload; and that cross-user + kind-conflict
   guards are unchanged. Re-run existing RLS + payment-authority suites
   (`70_payment_authority_and_connection_type.sql` proves direct-insert authority
   but not RPC forwarding).
6. Regenerate `apps/mobile/src/core/supabase/database.types.ts` with the repo
   command (never hand-edit).
7. `obligation-repository.ts` `save()` — pass `p_connection_type:
   obligation.connectionType` in all three `.rpc()` calls; update contract tests.

### Phase C — Provider catalog & import use case

- **Raw fixtures in `@eltizamati/demo-data`** (new `bank-catalog.ts`): a pure,
  deterministic `bankId → RawProviderRecord[]` map built from `DEMO_DATE`. The
  raw record type lives **in demo-data**, not imported from the mobile app —
  `packages/demo-data` must stay independent of app types. Each bank returns its
  own realistic mix (e.g. auto loan + card + murabaha).
- `MockConnectService`:
  - `retrieve(bankId): Promise<RawProviderRecord[]>` — reads the catalog;
    unknown bankId / malformed fixture → **typed error**, never a silent
    fallback to another bank.
  - `classify(record, userId)` — switch on product kind → correct domain entity,
    each `connectionType: 'official'`, `provenance.source:'demo'`,
    `providerId:'mock-open-banking'`. Use deterministic dates where repeatable
    output matters; if import timestamps use real time, keep them distinct from
    the deterministic provider observation and test that.
  - **Stable, collision-safe UUIDs for BOTH obligations and rate periods** (#5):
    derive every id deterministically from
    `providerId + bankId + externalId + userId` (rate periods additionally keyed
    by their `effectiveFrom`) using a UUID-compatible strategy (must be a valid
    Postgres `uuid`, not an arbitrary branded string). Same external record →
    same ids; different banks/records never collide.
- **Import use case** (extend `ImportService` or a dedicated
  `import-provider-obligations` use case):
  - Persist each obligation via `save()` (safe upsert on the stable obligation
    id) **and**, for conventional loans, persist the initial `rate_periods` —
    `save()` alone does **not** write rate history.
  - **Idempotency must cover rate periods, not only obligations.** Plain
    `ratePeriodRepository.append()` always INSERTs, so retrying a partially
    imported loan (obligation saved, rate append failed) would fail on a
    duplicate rate-period id instead of no-op'ing. Add an **idempotent
    rate-period insertion path** keyed on the stable rate-period id:
    - identical existing period (same id, same data) → treated as
      **skipped/success**;
    - same id with **different** data → a surfaced **conflict** error (never a
      silent overwrite — the append-only column grant forbids rewriting
      historical rate columns anyway; only `superseded_by` is writable).
  - Multi-select: import sequentially, **idempotent + retry** — return a typed
    summary `{ imported: id[], skipped: id[], failed: {id, error}[] }`. The UI
    must never report full success on a partial write; failed rows are re-tryable
    because both the obligation upsert and the rate-period insert are no-ops when
    already present.
  - **Completion gating:** the bank-connect step is marked complete only after
    **all selected records succeed**, or after the user **explicitly chooses to
    skip** the failed records. A partial import must not silently mark the step
    done.
- Tests: per-bank retrieve, classify per kind, deterministic-id idempotency
  (repeat import, same externalId at two banks, two users importing the same
  record), rate-history read-back, **retry after "obligation saved, rate append
  failed" becomes a clean no-op**, same-id-different-data conflict is surfaced,
  partial-failure summary, zero-obligation bank.

### Phase D — Shared onboarding state & routing

- **Server-side completion** (#7): add a versioned field (e.g.
  `bank_connect_onboarding_version` / completion timestamp) to the user profile
  (migration + `user_profiles`), read through the existing user-profile
  repository after profile provisioning. User-scoped, survives reinstall.
  - **Every profile-writing path must preserve `bank_connect_onboarding_version`.**
    Audit all `userProfileRepository` writers (`ensure-authenticated-user-profile.ts`,
    `use-update-profile`/preference updates, etc.) so a later partial profile
    update (locale, name, preferences) does not null out the completion field.
    Prefer column-scoped updates (or a dedicated
    `markBankConnectComplete(userId, version)` writer) over full-row upserts;
    add a test that a profile preference update leaves the field intact.
- **One shared routing decision** used by BOTH
  `apps/mobile/src/features/consent/hooks/use-entry-completion.ts` and
  `apps/mobile/src/features/startup/components/StartupCoordinator.tsx`
  (which independently calls `preparePersonalEntry`). Decision order:
  1. profile/consent not ready → existing consent/auth route;
  2. bank-connect incomplete → `/connect-bank`;
  3. complete → `/(tabs)/`.
  Do **not** duplicate the decision in two hooks. This closes the cold-start /
  killed-mid-flow gap.
- Flow store (module store, `otp-attempt-store.ts` pattern) with a documented
  **process-death policy**: persist the user-scoped completion state; on relaunch
  safely restart at bank selection (persist only minimal non-sensitive draft if
  exact-screen resume is required — never credentials).
- Tests: cold-start for incomplete / complete / signed-out / consent-required;
  sign-out + account-switch (no prior user's draft/completion/credentials leak).

### Phase E — UI

- **Extract & test a `Checkbox` primitive** first
  (`apps/mobile/src/core/design-system/primitives/Checkbox.tsx`), migrate
  `onboarding/consent.tsx` to it, then use it in the selection list. Preserve
  `accessibilityRole="checkbox"`, `accessibilityState.checked`, disabled state,
  touch target, RTL, theme tokens.
- **Consent as a real gate** (#9): reuse a dedicated consent screen / shared
  consent use case with an explicit **return route** so `/connect-mock` and
  `/connect-bank` share it without hard-coded loops. Retrieval runs only after
  `consentRepository.status()` confirms the current version; a failed consent
  write stays recoverable. Re-consent required if the consent version changes.
- **New route group `apps/mobile/app/connect-bank/`** (register in
  `app/_layout.tsx`), all screens thin — driven by feature hooks/services, never
  direct repository access:
  - `index.tsx` — bank picker (`JORDAN_BANKS`) + Skip.
  - `sign-in.tsx` — mock sign-in: account# + **secure** password entry +
    **"Use Face ID (simulated)"**. Any creds succeed. Never persist/log/transmit
    credentials; clear credential state on leave/reset.
  - `select.tsx` — multi-select list (`ListRow` + `Checkbox`, `Set<externalId>`),
    "Import selected"; honest empty state when a bank returns zero.
  - `done.tsx` — "Any other obligations?": Yes → reset store →
    `router.replace('/connect-bank')`; No/Skip → mark complete → `/(tabs)/`.
  - **Permanent mock disclosure** visible on every screen (picker, sign-in,
    select, done), in EN + AR, at large font scale and RTL. Never say "pulled
    from your bank" without a nearby mock qualifier.
  - Loading / error / empty / retry / offline states throughout.
- **Query invalidation** (#12): a connect-bank mutation hook/service owns import
  state and invalidates the centralized obligation/dashboard React Query keys on
  success so Home and Obligations refresh. Routes stay thin (UI → application →
  repository direction preserved).

### Phase F — Verification

- Migration reset/up + generated-type verification.
- All pgTAP suites (atomic writes, RLS, payment authority, new RPC-forwarding).
- Repository integration tests for all three kinds.
- Provider/import tests incl. partial failure + duplicate/idempotent import +
  rate-history read-back.
- Post-auth **and** cold-start routing tests (incomplete/complete/signed-out/
  consent-required/interrupted).
- Connect-bank screen tests in EN + AR (incl. mock disclosure assertions).
- Sign-out / account-switch cleanup tests.
- Full `pnpm check`.
- Manual walkthroughs: fresh signup; interrupted-flow relaunch; two users same
  device; repeat import; different-bank distinct sets; imported `official`
  records reject customer-entered payments while a manual `personal` loan still
  accepts them; cold-start goes straight to `/(tabs)/`.

## Critical files

- `supabase/migrations/<cli-generated>_forward_connection_type_in_obligation_writes.sql` (new)
- `supabase/migrations/<cli-generated>_bank_connect_onboarding_state.sql` (new, profile field)
- `supabase/tests/...` pgTAP for RPC forwarding (new)
- `apps/mobile/src/services/repositories/supabase/obligation-repository.ts`
- `apps/mobile/src/core/supabase/database.types.ts` (regenerate)
- `apps/mobile/src/services/mock-connect-service.ts` (list + multi-kind + stable ids)
- `apps/mobile/src/services/import-service.ts` (+ rate periods, typed summary)
- `packages/demo-data/src/bank-catalog.ts` (new, raw fixtures) + public export
- `apps/mobile/app/connect-bank/{_layout,index,sign-in,select,done}.tsx` (new)
- `apps/mobile/src/features/connect-bank/` (flow store + mutation hook + view-models)
- `apps/mobile/src/features/<shared>/routing decision used by both entry paths` (new)
- `apps/mobile/src/features/consent/hooks/use-entry-completion.ts`
- `apps/mobile/src/features/startup/components/StartupCoordinator.tsx`
- `apps/mobile/src/core/design-system/primitives/Checkbox.tsx` (new) + `onboarding/consent.tsx` migration
- `apps/mobile/src/features/auth/services/ensure-authenticated-user-profile.ts` + user-profile repository (completion field)
- `apps/mobile/src/i18n/translations/{en,ar}.json` (`connectBank.*`)
- `docs/02-ux/screen-inventory.md`, US-017 / requirements, privacy/threat-model docs
