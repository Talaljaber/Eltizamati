# Final Release Review — Executed Report

**Reviewed commit:** `main` @ `0363bb3` (working tree clean except three untracked docs).
**Date:** 2026-07-17. **Reviewer:** automated static/automated pass (Stage A + feasible Stage B).
**Plan:** [../../final-review.md](../../final-review.md) → the generated plan in that file's response.

> Scope of THIS pass: everything executable without a physical device, hosted Supabase
> credentials, a human Arabic reviewer, or owner account access. Those remain open and are
> listed in §Owner/Deferred. No files were changed by the review; no branches, merges, hosted
> mutations, or emails were performed.

---

## Verdict (this pass)

**READY AFTER SMALL RELEASE FIXES — for the MOBILE app**, conditional on the still-unexecuted
device/hosted/Arabic evidence (Stage C). **The BANK-SIMULATOR DASHBOARD carries one owner-decision
security item that is P0 if the dashboard is deployed publicly** (it is wired for Netlify). No
financial-integrity or cross-user-isolation defect was found in the code reviewed.

The final go/no-go cannot be issued yet: Phase 9 release engineering (Maestro, Sentry, EAS preview
APK) **does not exist in the repository**, so the never-cut evidence items (preview-APK validation,
crash reporting, on-device Arabic/offline demo) are unmet. Verdict is therefore **NOT READY —
release blockers remain** at the whole-project level until Stage C is executed, with the mobile
_code_ itself in good shape.

---

## What was executed and the automated gate

| Check                                          | Result                   | Evidence                                                        |
| ---------------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `pnpm run typecheck`                           | ✅ pass (exit 0)         | whole workspace incl. mobile + dashboard                        |
| `pnpm run test:packages` (domain/finance/demo) | ✅ pass (exit 0)         | —                                                               |
| `pnpm run test:app`                            | ✅ 70 suites / 370 tests | ⚠ one non-fatal "worker failed to exit gracefully" leak warning |
| `pnpm run test:dashboard`                      | ✅ 14 files / 74 tests   | —                                                               |
| `lint` / `format:check` / `depcruise`          | **not run this pass**    | run before final sign-off                                       |
| Maestro E2E / Sentry / EAS APK                 | **absent from repo**     | `git ls-files \| grep -iE 'sentry\|maestro\|eas.json'` → empty  |

---

## Findings (severity-ranked)

### F1 — Dashboard has no authentication front door (P1 → **P0 if deployed publicly**) — OWNER DECISION

- **Where:** `apps/bank-simulator-dashboard/src/server/env.ts`, no `middleware.ts` exists; server
  actions `app/loan-applications/actions.ts`, rate-campaign publish, email gateway.
- **Finding:** The dashboard operates with the Supabase **service-role key** (RLS-bypassing) and
  can approve/reject loans, publish rate campaigns, and send real emails to allowlisted users. The
  `DEMO_ALLOWED_USER_IDS` allowlist scopes _whose_ data is touched, **not who may operate the tool** —
  there is no login. There **is** a deliberate safeguard: `loadDashboardEnv()` refuses to boot when
  `NODE_ENV=production` unless `DEMO_DASHBOARD_ALLOW_REMOTE=true`, and the recovery hint explicitly
  warns "this dashboard has no authentication." `netlify.toml` + the recent secret-scan-exclusion
  commits show a Netlify deployment is intended, which requires flipping that flag.
- **Consequence:** the moment the flag is set for a public Netlify URL, any anonymous internet visitor
  can operate an admin console over real allowlisted users' financial data and trigger emails to them.
- **Smallest remediation:** put the deployment behind Netlify Basic-Auth / password protection (or a
  reverse-proxy allowlist), OR only flip `DEMO_DASHBOARD_ALLOW_REMOTE` during the live demo window and
  keep it off otherwise. Do **not** ship a public no-auth URL while real allowlisted accounts exist.
- **Owner action required:** decide and implement the deployment boundary (Owner list item).

### F2 — Documentation is behind the code (P2, doc-truth) — ✅ FIXED (2026-07-17)

- **Where:** `docs/10-implementation/STATUS.md`.
- **Finding:** STATUS.md's "Active phase" is Phase 8 / 8.5 and its repository position names
  `phase6-finance-engine` as the working branch and remote main at `7477aa8`. It is blind to the
  **merged** dashboard, Learn-intelligence, and the entire **loan-application feature** (mobile tab +
  dashboard queue + `demo_decide_loan_application` RPC + migrations through `20260717050000`). It also
  still carries a 2026-07-15 historical addendum describing an **OTP-only (ADR-0018)** auth model as
  "uncommitted," while the shipping code is **password + signup-verification (ADR-0019)** —
  `supabase-auth-service.ts` uses `signInWithPassword`, `signUp`, `verifyOtp` (signup code), `resend`,
  and the screens are sign-in/sign-up/verify-code/reset/update-password.
- **Remediation:** update STATUS.md to reflect `main` @ `0363bb3`, record the loan-application feature
  and the merged Learn/dashboard scope, and remove/clearly supersede the OTP-only narrative. The
  loan-application feature has **no phase/spec doc at all** — add one.
- **Fix applied (2026-07-17):** a top addendum in `STATUS.md` now records the corrected head, merged
  scope, shipping auth model (ADR-0019, superseding the OTP-only narrative), the current gate results,
  and the Phase-9-not-started / dashboard-deploy notes. The loan-application **spec doc** is still to be
  written (owner/engineering).

### F3 — Phase 9 release engineering not started (P1, blocks final go) — CONFIRMED

- **Finding:** no Sentry dependency, no Maestro flows, no `eas.json` anywhere in tracked files.
  `app.json` has no Sentry plugin, no EAS/`extra` project config. Crash reporting, E2E, and a
  preview-APK build pipeline must be **built**, not merely reviewed — this is net-new engineering
  arising from the review and needs owner scoping.
- **Consequence:** the never-cut evidence (preview APK on two devices, controlled crash → Sentry,
  on-device Arabic/offline demo) cannot be produced until this exists.

### F4 — Mobile test suite emits a worker-teardown warning (P3, test-quality) — INVESTIGATED, NOT A CODE DEFECT

- **Where:** `pnpm run test:app` prints "A worker process has failed to exit gracefully and has been
  force exited" though all 370 tests pass (exit 0).
- **Investigation (2026-07-17):** re-ran with `--detectOpenHandles --runInBand` → **zero attributable
  open handles, clean exit**. The jest setup already stubs the one known timer-leaking component
  (`@expo/vector-icons`) and starts no global interval. The warning is a jest worker-pool teardown
  artifact that does not reproduce in-band, so there is no specific handle to close.
- **Decision:** no code change made — a speculative fix or `--forceExit` would mask rather than fix.
  Left as a known low-severity artifact. If it must be silenced for CI cleanliness later, first
  reproduce and attribute the handle rather than force-exiting.

### F5 — Edge Function JWT enforcement (evidence gap) — DELETE-ACCOUNT CONFIRMED SOUND; LEARN HOSTED-ONLY

- **`delete-account`:** verified robust **in-body** auth — validates the caller's JWT via an anon-key
  client's `getUser()` and only uses the service-role key for `auth.admin.deleteUser(user.id)`, never
  trusting a client-supplied id. Cascade deletion is documented. **No change needed.**
- **`learn-assistant`:** no explicit `verify_jwt` override in `config.toml`, so the platform default
  (`verify_jwt = true`) applies — already the secure baseline; no in-body check is required for a demo.
  CORS is `*` and input is validated (length 1–1200, language enum); the returned `sourceIds` must all
  be client-supplied, an anti-hallucination grounding guard. Making the flag explicit was **not** done
  because the default is already correct and editing `config.toml` risks altering hosted deploy
  behavior for both functions.
- **Action (hosted, Stage C):** confirm on hosted Supabase that `learn-assistant` requires a valid JWT
  and is not an open, cost-bearing OpenAI proxy. Owner/hosted verification.

---

## Mobile security pass (2026-07-17, focused deep dive)

A dedicated mobile-app security review was performed. The posture is **strong**; one standard
hardening gap was found and fixed, the rest are confirmed sound.

### F6 — Android `allowBackup` defaulted to true (P2, data-at-rest) — ✅ FIXED (2026-07-17)

- **Finding:** `apps/mobile/app.json` did not set `android.allowBackup`, so it defaulted to `true`.
  On Android that permits `adb backup` and Android Auto Backup to extract app-private storage
  (AsyncStorage: language preference, the local-reminder notification id, and any future at-rest
  data). Keychain/Keystore items (auth tokens) are not backed up regardless, but leaving the app
  backable is a standard MASVS-STORAGE miss for a financial app.
- **Fix applied:** set `"android": { ..., "allowBackup": false }` in `app.json`. Validated as JSON
  and Prettier-clean. Takes effect on the next native (EAS) build.

### Confirmed sound — no change needed

- **Token storage & session lifetime:** tokens use `secureStoreAdapter` (OS Keychain/Keystore, with
  chunking + stale-chunk reclamation for oversized sessions). The Supabase client sets
  `persistSession: false` and `autoRefreshToken: false` — **a personal session lives only for the app
  process; relaunch returns the user to sign-in.** No refresh token persists on disk.
- **Secrets:** only `EXPO_PUBLIC_SUPABASE_URL` + anon key are read (both safe to ship). The service-
  role key has no `EXPO_PUBLIC_` path and is never bundled. `.env` is git-ignored; only `.env.example`
  is committed. No secret found in tracked files.
- **Production logging:** every `[*-debug]` log is gated behind `if (!__DEV__ || NODE_ENV==='test')`
  and logs only non-PII (stage strings, booleans like `hasFullName`, error codes, provider messages) —
  **no tokens, emails, ids, or financial values.** Nothing leaks in a release build.
- **Notification navigation:** `getNotificationRoute()` strictly allowlists — untrusted payload can
  only ever resolve to `/insights` or `undefined`, gated further by `canNavigateNotificationResponse()`
  and cleared on user switch (`clearLastNotificationResponse()`). No navigation injection.
- **Demo-mode isolation:** demo mode never imports/constructs the Supabase client
  (`useAuthServiceLazy`); airplane-mode demo makes no network call.
- **Account deletion:** the `delete-account` Edge Function validates the caller's own JWT
  (`getUser()`) before using the service-role key to delete, and cascades to all owned tables.
- **Face ID / Sanad buttons:** honestly labeled "preview only" — they show a preview alert, never
  fake a login. Not a security defect (optionally removable for a cleaner evaluation).
- **Password policy:** 12-character minimum enforced client-side (modern length-first approach); true
  enforcement belongs to Supabase's server-side password policy (hosted config, owner).

---

## Positive confirmations (no defect found)

- **Loan-decision RPC financial correctness** (`demo_decide_loan_application`, migrations
  `20260716040000` + fix `20260717050000`): `SECURITY DEFINER`, `search_path=public`, **granted to
  `service_role` only**; validates decision/amount/term/rate; recomputes the level-payment installment
  from the authoritative approved values (not client-claimed). Rate is stored as a **decimal string**
  (`Rate.toStorageString()` → e.g. `0.075`) and the SQL uses `p_approved_annual_rate / 12` — **unit-
  correct**, no percentage/decimal confusion. Provenance is `source:'demo', providerId:'bank-simulator-
dashboard'` on every row — **never marked official bank data**. The `20260717050000` fix correctly
  sets day-one `outstanding_balance = original_principal` and its backfill only touches rows with
  `outstanding_balance IS NULL` (can't clobber user-entered balances). **Sound.**
- **Domain status fix** (`8966b47`): a brand-new loan with a defined cadence (real schedule, zero
  elapsed periods) now returns `onTrack` instead of `unknown`. Logic and its added test are correct —
  a defined `cadence` already implies `buildCadence` produced a real schedule.
- **Email gateway** (`server/email/gateway.ts`): three modes derived purely from config
  (`disabled` when `EMAIL_SENDING_ENABLED` is not true → **no network call ever**; `dev-sink`; `gmail`),
  allowlist-checked recipients (`isEmailOnAllowlistedProfile`), idempotency keys per send, app password
  never logged/persisted. **Disabled-by-default and safe.**
- **Netlify secret hygiene** (`netlify.toml`): only non-secret keys omitted from scanning
  (`DEMO_ALLOWED_USER_IDS/EMAILS`, `SMTP_HOST/PORT/SENDER_NAME`); deliberately keeps
  `SMTP_APP_PASSWORD`, `SUPABASE_SECRET_KEY`, `SMTP_SENDER_EMAIL` failing the build if ever committed.
  **Correct.**
- **Learn assistant** (`functions/learn-assistant/index.ts`): OpenAI key read from `Deno.env`
  server-side only; strong system-prompt guardrails ("not a financial advisor," no inventing
  rates/fees/citations, insufficient-verified-data fallback); structured JSON status enum. Provider is
  **OpenAI (`gpt-5-mini`)**, not Anthropic.
- **Demo-mode network isolation:** the `useAuthServiceLazy()` fix is in place and consumed by
  `use-active-user.ts` and `AuthBoundaryCoordinator` — demo screens do not eagerly construct a Supabase
  client. STOP-SHIP startup/splash machinery (`StartupCoordinator`, `splash-release.ts`) and the
  `SecureStore` adapter are present.
- **Git state:** all feature branches (`feature/dashboard`, `feature/learn-intelligence`,
  `phase6-finance-engine`, `ui-implementation`) are **already merged into `main`** — no branch
  convergence or merge is needed; `main` @ `0363bb3` is the release candidate.

---

## Not executed this pass (require device / hosted / human / owner)

- Physical Android (2 devices): fresh install, preview APK, Arabic/English, TalkBack, large text,
  airplane mode, process death, notification routing.
- Hosted Supabase parity: migrations applied, RLS behavior, RPC reachability, disposable-user round-trip
  (read-only), Edge Function JWT (F5), auth email delivery.
- Human Arabic reviewer sign-off (still TBD — longest lead time, start now).
- `lint` / `format:check` / `depcruise` full gate; new-migration pgTAP cross-user coverage for
  loan_applications / demo dashboard tables; measured performance (Profiler / device).
- Controlled crash → Sentry (blocked by F3).

---

## Owner action list

1. **Decide the dashboard deployment boundary (F1)** — password-protect the Netlify deploy or keep
   `DEMO_DASHBOARD_ALLOW_REMOTE` off outside the demo window. **Highest priority.**
2. Scope Phase 9 release engineering (F3): Sentry, Maestro, EAS preview APK.
3. Recruit + name the Arabic-reading reviewer (WS11).
4. Provide 2 Android devices; provide hosted Supabase read access + approve disposable test users.
5. Update STATUS.md and add a loan-application feature spec (F2).
6. Confirm Edge Function JWT enforcement on hosted (F5).

---

## Next recommended step

Run the remaining static gate (`lint`, `depcruise`, new-migration pgTAP) and reconcile STATUS.md (F2)
— both are quick and unblock trust in later stages. In parallel, the owner should settle F1 and begin
Phase 9 tooling (F3), which is the true critical path to a go/no-go.
