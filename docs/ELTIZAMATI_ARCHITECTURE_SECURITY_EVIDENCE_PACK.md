# Eltizamati — Architecture & Security Evidence Pack

> Read-only adversarial audit. Purpose: give a designer/reviewer an exact, current, defensible
> evidence base for rebuilding the two external documents (App & Technical Flow; Security & Privacy
> Overview) without overclaiming. Every material claim carries one evidence label and one or more
> repository paths.

**Inspected commit:** `a96953b5495b6ae37e4cf683287b2445010bcf61`
**Branch:** `feat/onboarding-bank-connect`
**Working tree at audit time:** clean except two untracked paths — `docs/pdf/` and
`docs/security-overview.html` (neither is application code).
**Most recent commit:** `2026-07-23T17:59:09+03:00` — `docs: redraft business-idea solution to lead with decisions`
**Audit date:** 2026-07-23. The working tree was left unchanged (only read commands were run).
**Update pass:** 2026-07-23 (same day). The full automated test suite and typecheck across all four
workspace packages were executed in this session (command output captured below) — this replaces
several "NOT EXECUTED" findings from the original read-only pass with executed, dated results. The
project owner (Talal Jaber) also confirmed, as owner attestation dated 2026-07-23: physical-device
manual QA pass (iOS/handset, not Android), finance-team review, and execution of the Maestro/Playwright
end-to-end suites. These are recorded under the new **OWNER-ATTESTED** label below — internal sign-off
by the person who ran them, not a third-party audit or CI artifact. Items the owner did not confirm
(hosted-Supabase round-trip, EAS build, a live Sentry event, gitleaks-in-CI, Arabic linguistic review,
Android device pass) remain open and are still labelled accordingly — they were not blanket-cleared.

### Evidence labels used
- **VERIFIED** — established by current code/migration/config in the repo, or by command output captured in this session.
- **OWNER-ATTESTED** — the project owner directly confirmed this was done (e.g. manual device QA, finance sign-off, an e2e run); recorded with a date, not independently reproduced in this session.
- **IMPLEMENTED / NOT EXECUTED** — code/config exists; runtime/device/hosted proof is absent in this environment.
- **DOCUMENTED INTENT** — required by a current spec/ADR, not proven in code.
- **CONFIGURATION-DEPENDENT** — depends on hosted Supabase / EAS / Sentry / SMTP / CI not visible here.
- **DEMO-ONLY** — implemented only for the labelled demo environment.
- **POSTPONED** — assigned to a named later phase.
- **NOT FOUND** — searched, no implementation evidence.
- **CONTRADICTED** — repository sources make incompatible claims.
- **UNKNOWN** — insufficient evidence.

---

## SECTION 1 — EXECUTIVE TRUTH SNAPSHOT

| Item | Value | Label |
|---|---|---|
| Branch | `feat/onboarding-bank-connect` | VERIFIED (`git branch --show-current`) |
| HEAD SHA | `a96953b5495b6ae37e4cf683287b2445010bcf61` | VERIFIED |
| Working-tree state | clean; untracked `docs/pdf/`, `docs/security-overview.html` only | VERIFIED |
| Latest commit | `docs: redraft business-idea solution to lead with decisions` | VERIFIED |

**Current implementation phase (per newest evidence).** The tracked planning doc
`docs/10-implementation/STATUS.md` is **stale relative to the code on this branch**. Its "Active phase"
section names Phase 8 / 8.5, its top addendum (2026-07-18) describes a Phase 9 code subset, and it
does **not mention this branch's work at all**: the bank-connect onboarding feature, US-017, and the
newly shipped per-user field encryption (`supabase/migrations/20260723000000_user_encryption_keys.sql`,
`supabase/functions/user-encryption-key/`, `apps/mobile/src/core/crypto/field-cipher.ts`). — **CONTRADICTED** (STATUS.md vs. current code).

**What is complete (code-level, VERIFIED in repo):**
- Supabase schema: 22 tables, RLS enabled on all 22, 40 policies, 80 CHECK constraints, 9 owner-facing
  RPCs + trigger/enforcement functions, 3 Edge Functions. (Section 5.)
- Password auth with signup email-code verification; sign-in; sign-out; account deletion. (Section 6.)
- Client-only AES-256-GCM field encryption for 5 PII columns (envelope/per-user DEK). (Section 7.)
- Finance engine: 10 registered formulas, decimal-safe money, determinism property test. (Section 10.)
- Bank-simulator dashboard + rate-campaign RPCs; loan-application workflow; schedule-proposal workflow.

**Executed in this session (2026-07-23), real command output — replaces prior "NOT EXECUTED" unit-test findings:**
- `apps/mobile`: `npx jest` → **103 test suites / 605 tests, all passed** (includes `field-cipher.test.ts`'s 8 cases). `npx tsc --noEmit` → **0 errors.**
- `packages/finance-engine`: `npx vitest run` → **19 test files / 140 tests, all passed**, including the property-based invariants (INV-1 through INV-6, determinism). `npx tsc --noEmit` → **0 errors.**
- `packages/domain`: `npx vitest run` → **15 test files / 134 tests, all passed.** `npx tsc --noEmit` → **0 errors.**
- `apps/bank-simulator-dashboard`: `npx vitest run` → **15 test files / 77 tests, all passed.** `npx tsc --noEmit` → **0 errors.**
- **Combined: 956 automated unit/property tests passing across the monorepo; typecheck clean in all four packages.** This is the accurate current figure — cite **956** (or "over 900"), not a rounded "500+".
- pgTAP suite (10 files incl. `90_user_encryption_keys.sql` `plan(6)`) — code present; **NOT re-executed in this session** (requires a local Supabase/Docker stack spin-up, out of scope for a docs pass). Still **IMPLEMENTED / NOT EXECUTED** here; ask the owner whether it has been run separately.

**Owner-attested (2026-07-23), not independently reproduced in this session:**
- Manual QA pass on a physical handset (iOS) — owner reports UI/UX solid, no defects raised. — **OWNER-ATTESTED.**
- **Android device pass explicitly out of scope for this release** — a deliberate scoping decision, not an open defect. State it as such in the PDF, not as "still being tested."
- Finance-team review of the calculation vectors/logic — owner reports approval. — **OWNER-ATTESTED** (internal sign-off; if the PDF needs to say "independently audited by a licensed party," that is a separate, stronger claim not covered by this attestation).
- Maestro (`maestro/*.yaml`, 5 flows: add-obligation, demo-spine-ar/en, erase-reset, log-payment) and the bank-simulator-dashboard Playwright suite (`apps/bank-simulator-dashboard/e2e/*.spec.ts`, 4 specs) — owner reports these were run and passed. — **OWNER-ATTESTED** (spec files themselves are VERIFIED present in-repo; their execution/pass result is owner-reported, no CI artifact in this repo to point to).

**What still requires owner / hardware / hosted / external action (not yet confirmed by anyone):**
- `FIELD_ENC_KEK` Edge Function secret must be set for encryption to function (`user-encryption-key/index.ts:72`) — **CONFIGURATION-DEPENDENT.**
- Legacy plaintext rows re-encrypt only on next write, or via the one-time backfill
  `apps/mobile/scripts/backfill-field-encryption.mjs` (owner-run, holds KEK). — **IMPLEMENTED / NOT EXECUTED.**
- Hosted-Supabase round-trip, a real Sentry event, an EAS build, gitleaks-in-CI, and Arabic linguistic human review remain outstanding — not covered by the owner's attestation above.

**Contradictions found (must not be silently reconciled):**
1. **Signup code length.** Code: `SIGNUP_EMAIL_OTP_LENGTH = 8` (`apps/mobile/src/services/auth/auth-service.ts:4`). Docs say **six-digit** (STATUS.md 2026-07-15/17; `security-controls.md`; ADR-0019) and **eight-digit** (`system-architecture.md:5`). The **code ships 8 digits.** — **CONTRADICTED.** Any "six-digit verification" claim is wrong.
2. **Persistence model in security/threat docs.** `security-controls.md`, `threat-model.md`, and `system-architecture.md` still describe a local **SQLite/Drizzle** financial DB and storage lint rules for it. ADR-0017 removed SQLite; personal data is **Supabase-only** and demo data is in-memory seed. The mermaid diagram in `system-architecture.md:11-25` still shows `SQLite (Drizzle)`. — **CONTRADICTED** (docs vs. ADR-0017 + code).
3. **CI existence.** No `.github/` directory exists in the tree (`find .github` → empty). Yet `security-controls.md` and `threat-model.md` cite a "gitleaks CI gate" and "pgTAP cross-user suite in CI". — **CONTRADICTED / NOT FOUND.**
4. **Field encryption absent from the security docs.** Neither `security-controls.md` nor `threat-model.md` mentions the shipped per-user field encryption; the untracked `docs/security-overview.html` draft reportedly asserted the app does *not* do per-column encryption — now outdated by this branch. — **CONTRADICTED.**
5. **Session restore vs. refresh rotation.** Client sets `persistSession:false`, `autoRefreshToken:false` (`apps/mobile/src/core/supabase/client.ts:59-61`): a session lives for one app process only, with **no refresh rotation and no cross-restart restore.** `system-architecture.md:5` says "automatic restore"; `threat-model.md` T-04 says "short-lived JWT + refresh rotation". — **CONTRADICTED.**
6. **DEK cache location (internal comment drift).** `field-cipher.ts:9-16` states the DEK is cached **in memory only** (not secure-store); `user-encryption-key/index.ts:9-10` comment says it is "cached client-side in expo-secure-store". Code truth = in-memory only. — **CONTRADICTED** (comment vs. comment; code resolves to in-memory).

**Single best description of release readiness:** *Feature-complete demo/prototype on an active
feature branch, with a real security posture (RLS + client-only field encryption), 956 passing
automated tests and clean typechecks across all four packages, and owner-confirmed manual-device,
finance, and e2e passes — but with planning docs that lag the code, no CI in the tree, Android
explicitly out of scope for this release, and hosted-Supabase/Sentry/EAS/Arabic-review validations
still outstanding.* → **READY ONLY AS A REVIEW DRAFT** (see Section 15).

**Specific checks requested:**
- STATUS.md newest addendum vs. older "Active phase": inconsistent, and both predate this branch. — CONTRADICTED.
- Phase 9 header vs. completion report vs. files: STATUS.md admits Phase 9 is a code subset only; device/hosted items open. — consistent-but-incomplete.
- Implementation-plan status tables: historical (dated entries up to 2026-07-18); do not treat as current for this branch.
- Completion reports overstating device/CI/Supabase/Sentry/EAS/finance evidence: STATUS.md itself repeatedly flags these as owner-pending — do not cite them as done.

---

## SECTION 2 — SYSTEM ACTORS AND TRUST BOUNDARIES

| Actor | What it is | Implemented? | Trust | Credentials | Reads | Writes | Mode | Evidence |
|---|---|---|---|---|---|---|---|---|
| Mobile app (Expo/RN) | The client | VERIFIED | Untrusted client | Supabase **anon** key only (`core/config/env`) | Own rows via RLS | Own rows via RLS/RPC | both | `apps/mobile/src/core/supabase/client.ts:54` |
| Demo repositories | In-memory seed repos | VERIFIED | N/A (no network) | none | bundled seed | in-memory | demo | `system-architecture.md:3`; composition-root |
| Personal repositories | supabase-js repos | VERIFIED | Untrusted client | anon key + user JWT | own rows | own rows | personal | `apps/mobile/src/services/composition-root.ts:50-58` |
| Supabase Auth | Password + signup OTP | VERIFIED | Platform | — | — | auth.users | personal | `apps/mobile/src/services/auth/supabase-auth-service.ts` |
| Postgres / PostgREST | DB + REST | VERIFIED | Platform, RLS-enforced | per-request JWT | RLS-scoped | RLS-scoped | personal | migrations |
| Database RPCs | 9 `SECURITY DEFINER` fns | VERIFIED | Elevated, `auth.uid()`-scoped | definer | scoped | scoped | personal | Section 4/5 |
| Edge: `delete-account` | Service-role deletion | VERIFIED | **Privileged** (service role) | KEK n/a; service-role key | auth.users | cascade delete | personal | `supabase/functions/delete-account/index.ts` |
| Edge: `user-encryption-key` | Provision/return per-user DEK | VERIFIED | **Privileged** (service role + KEK) | `FIELD_ENC_KEK`, service-role key | user_encryption_keys | insert wrapped DEK | personal | `supabase/functions/user-encryption-key/index.ts` |
| Edge: `learn-assistant` | OpenRouter/OpenAI proxy | VERIFIED | Privileged (holds LLM key) | `OPENROUTER_API_KEY`/`OPENAI_API_KEY` | request body only | none (no DB writes) | both | `supabase/functions/learn-assistant/index.ts` |
| Bank-simulator dashboard | **No-auth** admin demo tool | VERIFIED | **Unauthenticated admin surface** | dashboard env | demo_* + allowlisted users | rate campaigns, decisions | demo | STATUS.md 2026-07-17 dashboard note |
| Sentry | Crash reporting | IMPLEMENTED / NOT EXECUTED | external | DSN (absent → inert) | scrubbed crashes | — | release | `apps/mobile/src/core/observability/sentry.ts:70` |
| CI (GitHub Actions) | — | **NOT FOUND** | — | — | — | — | — | no `.github/` dir |

**Text trust-boundary diagram (swimlane-ready):**
```
[ Borrower device — UNTRUSTED ]
  Mobile app (anon key, user JWT, in-memory DEK)
        | TLS
        v
[ Supabase edge — PLATFORM TRUST ]
  Auth  |  PostgREST + RLS (auth.uid())  |  RPCs (SECURITY DEFINER, uid-scoped)
        |                                 |
        v                                 v
[ Privileged server-only — ELEVATED ]
  Edge Functions:
    delete-account         (service-role: cascade user delete)
    user-encryption-key    (service-role + KEK: wrap/unwrap DEK)   <-- KEK lives ONLY here
    learn-assistant        (LLM API key; no DB writes)
        |
        v
[ Postgres storage ]  ciphertext columns + wrapped DEKs (KEK not present)

[ Demo lane — NO NETWORK ]  Mobile app -> in-memory seed repos (no auth, no DB)
[ Dashboard lane ]  Bank-simulator dashboard -> Postgres (NO AUTH; production-refusal flag)
```

---

## SECTION 3 — END-TO-END APPLICATION FLOWS

Reconstructed from routes → hooks/services → repositories → RPC/table/Edge. Column key: **Auth** =
authentication context; **RLS** = RLS applies; **Priv** = privileged credential involved; **Ev** =
evidence label. Only flows with current code evidence are asserted; unproven ones are labelled.

| # | Flow | Screen/route | Service/repo | RPC/table/Edge | R/W | Auth | RLS | Priv | Idempotency / atomicity | Failure | Mode | Ev | Paths |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | Startup & mode select | `app/_layout` / StartupCoordinator | composition-root | — | — | none until personal | — | no | — | recoverable error surface | both | VERIFIED | `apps/mobile/src/services/composition-root.ts` |
| B | Demo entry/reset | onboarding/settings | Demo repos, `ImportService.resetDemo` | in-memory seed | R/W | none | n/a | no | reset is total | — | demo | VERIFIED | `system-architecture.md:3`; STATUS 2026-07-13 |
| C | Password sign-up | `app/auth/*` | `SupabaseAuthService.signUp` | `auth.signUp` | W | anon | n/a | no | Supabase-managed | typed AppError | personal | VERIFIED | `supabase-auth-service.ts:88` |
| D | Signup code verify | `app/auth/*` | `verifySignupOtp` | `auth.verifyOtp` (8-digit) | W | anon | n/a | no | code expiry (platform) | AppError | personal | VERIFIED (len=8) | `supabase-auth-service.ts:131`; `auth-service.ts:4` |
| E | Sign-in | `app/auth/*` | `signInWithPassword` | `auth.signInWithPassword` | R | anon | n/a | no | — | generic AppError | personal | VERIFIED | `supabase-auth-service.ts:112` |
| F | Profile provisioning | post-verify | `ensure-authenticated-user-profile`, `SupabaseUserProfileRepository.createIfAbsent` | `profiles` insert (`23505`→get) | W | user JWT | yes | no | insert-if-absent, 23505 tolerant | AppError | personal | VERIFIED | `user-profile-repository.ts:103-117` |
| G | Consent recording | onboarding | `SupabaseConsentRepository` | `consent_records` (append-only) | W | user JWT | yes | no | version-bump append | AppError | personal | VERIFIED | migrations `..010_consent_records` |
| H | Mock bank-connect | `app/connect-bank/*` | connect-bank store/hooks | none persisted | — | user JWT | n/a | no | credentials never stored | redirect to app | personal | VERIFIED | `threat-model.md:7`; `app/connect-bank/` |
| I | Obligation retrieve/import | connect-bank / obligations | `SupabaseObligationRepository.assemble` | `obligations` + subtype tables | R | user JWT | yes | no | — | AppError | personal | VERIFIED | `obligation-repository.ts:49` |
| J | Manual obligation create | add-obligation form | `SupabaseObligationRepository.save` | `save_conventional_loan`/`save_murabaha`/`save_card` RPC | W | user JWT | yes(uid in definer) | no | **atomic RPC**; nickname/notes encrypted first | AppError | personal | VERIFIED | `obligation-repository.ts:149-228` |
| K | Edit/archive/delete | detail/settings | ObligationRepository | RPC / update | W | user JWT | yes | no | — | AppError | personal | VERIFIED | `obligation-repository.ts` |
| L | Payment logging | log-payment | PaymentRepository | `record_bank_payment` RPC | W | user JWT | yes | no | authority-enforced (trigger) | AppError | personal | VERIFIED | migrations `..07`, `enforce_payment_authority` |
| M | Rate publish/log | dashboard / rates | RatePeriodRepository | `rate_periods` (append-only) + `demo_publish_rate_campaign` | W | user JWT / dashboard | yes | dashboard=yes | append-only; supersede logic | AppError | both | VERIFIED | `..006`, `..020001`, `enforce_rate_period_authority` |
| N | Amortization projection | detail | calc service → finance-engine | `amortization`/`variableProjection`; `calculation_runs` persist | R + W(run) | user JWT | yes | no | deterministic; input-hashed run | calculationRefused | personal | VERIFIED | `packages/finance-engine`; `..008_calculation_runs` |
| O | Residual/balloon detect | detail / rate-impact | `residualDetection` | — | R | — | — | no | pure | refused/missing input | both | VERIFIED | finance-engine `computeResidualDetection` |
| P | Rate-change impact | rate-impact | `addedCostFromRepricing`/`rateChangeScenario` | — | R | — | — | no | pure, asOf-driven | refused | both | VERIFIED | finance-engine formulas |
| Q | Calc-run persistence | services | CalculationRunRepository | `calculation_runs` | W | user JWT | yes | no | input-hash provenance | AppError | personal | VERIFIED | `..008`; STATUS Phase-6 §6 |
| R | Extra-payment scenario | scenario | `extraPaymentScenario` | — (ephemeral) | R | — | — | no | not persisted | refused | both | VERIFIED | ADR-0020; finance-engine |
| S | Card payoff | simulator | `cardPayoff` | — | R | — | — | no | pure | refused | both | VERIFIED | finance-engine `computeCardPayoff` |
| T | Bank rate campaign | dashboard | dashboard | `demo_publish_rate_campaign`, `demo_record_excluded_targets` | W | **no auth (dashboard)** | definer | yes | supersede | — | demo | VERIFIED | `..016001`, `..016020` |
| U | Schedule proposal/decision | proposals | LoanScheduleProposalRepository | `self_decide_schedule_proposal`/`apply_schedule_proposal_decision`/`demo_decide_schedule_proposal` | W | user JWT / dashboard | yes | dashboard=yes | approval workflow, enforce trigger | AppError | both | VERIFIED | `..018084829` |
| V | Loan application + decision | apply tab / dashboard | LoanApplicationRepository | `loan_applications` + `demo_decide_loan_application` | W | user JWT / dashboard | yes | dashboard=yes | — | AppError | both | VERIFIED | `..016030`, `..016040` |
| W | Learning assistant | learn | client → Edge | `learn-assistant` → OpenRouter | R | JWT (platform `verify_jwt` default) | n/a | LLM key server-side | 1200-char input cap; JSON-only; refuses when key unset (503) | `unavailable()` | both | VERIFIED (input validation); JWT verification CONFIGURATION-DEPENDENT | `learn-assistant/index.ts:126-138` |
| X | Sign-out + boundary cleanup | settings/auth | `local-user-boundary-cleanup`, `clearFieldEncryptionKey` | client caches + DEK | — | — | — | no | clears per-user caches incl. DEK | — | personal | VERIFIED | `field-cipher.ts:93`; STATUS 2026-07-15 §5 |
| Y | Account deletion | settings | `deleteAccount` → Edge | `delete-account` (service-role `admin.deleteUser`) | W | user JWT → service role | cascade | **yes** | FK `on delete cascade` across owned tables | 401/500 mapped | personal | VERIFIED | `delete-account/index.ts` |
| Z | Error/offline/retry | all | `AppError` taxonomy, ErrorState | — | — | — | — | no | retryability per code | honest offline/error states | both | VERIFIED | `system-architecture.md:104-108` |

> Naming note: the RPC/function names above (`save_conventional_loan`, `save_murabaha`, `save_card`,
> `record_bank_payment`, `demo_publish_rate_campaign`, `demo_decide_loan_application`,
> `self_decide_schedule_proposal`, `apply_schedule_proposal_decision`, `demo_decide_schedule_proposal`,
> `demo_record_excluded_targets`) are the **current** names verified in migrations (Section 4). Do not
> reuse older diagram names not in this list.

---

## SECTION 4 — CURRENT ENDPOINT AND FUNCTION INVENTORY

**Supabase Auth calls (client):** `signUp`, `signInWithPassword`, `verifyOtp` (type `email`),
`resend` (type `signup`), `signOut`, `getSession`, `onAuthStateChange`. No `resetPasswordForEmail`,
no `updateUser` password path. — VERIFIED (`supabase-auth-service.ts`). **Password reset: NOT FOUND** (absent by design, ADR-0019).

**Database RPCs with `EXECUTE` granted to `authenticated`** (9): `save_conventional_loan`,
`save_murabaha`, `save_card`, `record_bank_payment`, `self_decide_schedule_proposal`,
`demo_publish_rate_campaign`, `demo_decide_loan_application`, `demo_decide_schedule_proposal`,
`demo_record_excluded_targets`. — VERIFIED (`grant execute` grep).

**Other DB functions (triggers/enforcement/definer, not directly client-callable as user RPCs):**
`apply_schedule_proposal_decision`, `enforce_payment_authority`, `enforce_rate_period_authority`,
`enforce_schedule_proposal_submission`, `set_updated_at`, `sync_profile_email_on_auth_update`,
`sync_profile_email_on_insert`, `whose` (helper). — VERIFIED (migration grep). Total distinct functions defined: **17**.

**Edge Functions (3):**
| Name | Location | Caller | Auth in function | Input validation | Data | Outcome | Tests | Label |
|---|---|---|---|---|---|---|---|---|
| `delete-account` | `supabase/functions/delete-account/index.ts` | mobile `deleteAccount()` | 401 if no header; `getUser()` before service role | none (no body) | auth.users cascade | `{deleted:true}` / 401 / 500 | pgTAP `30_account_deletion.sql` | VERIFIED (code); execution NOT EXECUTED here |
| `user-encryption-key` | `.../user-encryption-key/index.ts` | mobile `field-cipher.getDek` | 401 if no header; `getUser()`; 503 if `FIELD_ENC_KEK` unset | none (no body) | user_encryption_keys | `{dek,version}` / 401 / 503 / 500 | none dedicated (client `field-cipher.test.ts` mocks it) | VERIFIED (code); runtime CONFIGURATION-DEPENDENT |
| `learn-assistant` | `.../learn-assistant/index.ts` | mobile learn | **no in-function `getUser`**; relies on platform `verify_jwt` default | method+body: `question` 1–1200 chars, `language∈{ar,en}` | request body only; no DB | JSON schema / 400 / 503 / 500 | — | VERIFIED (validation); caller-auth CONFIGURATION-DEPENDENT |

**Repository interfaces (personal impls, all supabase-js):** UserProfile, Obligation, Payment,
RatePeriod, CalculationRun, Insight, Consent, LoanApplication, LoanScheduleProposal. — VERIFIED
(`composition-root.ts:50-58`). Demo mode uses `Demo*Repository` equivalents (in-memory).

**Calculation entry points / formula ids (10):** `amortization`, `variableProjection`,
`rateChangeScenario`, `addedCostFromRepricing`, `residualDetection`, `extraPaymentScenario`,
`cardPayoff`, `murabahaProgress`, `allocationEstimate`, `aggregates`. — VERIFIED (`packages/finance-engine/src`).

**OpenAI/OpenRouter boundary:** single outbound call in `learn-assistant/index.ts:199` (`Authorization: Bearer ${apiKey}`); key server-side only. — VERIFIED.

**Names to flag if they appear in older diagrams but are NOT in the current repo:** any generic
`/obligations` REST verbs described as custom endpoints (writes go through the named RPCs above);
any "SQLite/Drizzle" repository (removed by ADR-0017); any six-digit-OTP endpoint. — CONTRADICTED / NOT FOUND.

---

## SECTION 5 — DATABASE AND AUTHORIZATION INVENTORY (counts computed from migrations at this SHA)

| Metric | Count | Source |
|---|---|---|
| Migration files | 30 | `supabase/migrations/` |
| `CREATE TABLE public.*` | **22** | grep |
| Tables with RLS enabled | **22** | `enable row level security` grep |
| `CREATE POLICY` statements | **40** | grep |
| CHECK constraints (`check (`) | **80** | grep |
| Distinct functions defined | 17 | grep |
| RPCs with `grant execute` to authenticated | 9 | grep |
| `SECURITY DEFINER` occurrences | 23 | grep |
| `search_path` pin occurrences | 23 | grep |
| Foreign-key `references` | 31 | grep |
| `unique` keyword occurrences | 14 | grep |
| Edge Functions | 3 | `supabase/functions/` |
| pgTAP test files | 10 | `supabase/tests/database/` |

> These counts **replace** older documentation figures. Notably: the security draft's "15 protected
> tables / 40+ policies / 23 functions / 80+ CHECK constraints" is **close but must be restated to the
> exact current numbers: 22 RLS tables, 40 policies, 17 functions (9 user-callable RPCs), 80 CHECK
> constraints.** The "15 tables" figure is **stale** — there are 22. — CONTRADICTED (count).

**Per-table matrix** (U-owned = user-owned; RLS = enabled; Pol = policies present; Grant = authenticated grant):

| Table | Purpose | U-owned | RLS | Pol | Grant | Main write path | Append-only | Deletion | Tests | Label |
|---|---|---|---|---|---|---|---|---|---|---|
| profiles | user profile + PII | yes | yes | yes | yes | insert/upsert (encrypted PII) | no | cascade | 10/20/30 pgTAP | VERIFIED |
| obligations | loans/cards | yes | yes | yes | yes | save_* RPC | no | cascade | 40 | VERIFIED |
| loan_details / murabaha_details / card_details | subtype detail | yes(via obligation) | yes | yes | yes | save_* RPC | no | cascade via obligation | 40 | VERIFIED |
| rate_periods | rate history | yes | yes | yes | yes | append (authority-enforced) | **yes** | cascade | 40, 70 | VERIFIED |
| payments | payment log | yes | yes | yes | yes | record_bank_payment | no | cascade | 70 | VERIFIED |
| calculation_runs | calc audit | yes | yes | yes | yes | insert | effectively append | cascade | Phase-6 §6 | VERIFIED |
| insights | derived insights | yes | yes | yes | yes | insert/markRead | no | cascade | integration | VERIFIED |
| consent_records | consent | yes | yes | yes | yes | append (version bump) | **yes** | cascade | 30 | VERIFIED |
| user_encryption_keys | wrapped per-user DEK | yes | yes | 1 (select only) | yes(4 verbs) | **Edge Function/service-role only** | insert-once | cascade | **90 (plan 6)** | VERIFIED |
| loan_applications | apply workflow | yes | yes | yes | yes | insert + demo_decide | no | cascade | 60 | VERIFIED |
| loan_schedule_proposals | proposal workflow | yes | yes | yes | yes | RPC decide/apply | no | cascade | 60_schedule | VERIFIED |
| profile_preferences | prefs | yes | yes | yes | yes | upsert | no | cascade | — | VERIFIED |
| financial_institutions / financing_products / financing_product_sources / financing_product_source_links | reference catalogue | no | yes | reference | read | seed | reference | — | VERIFIED |
| demo_dashboard_activity / demo_rate_campaigns / demo_rate_campaign_targets / demo_benchmark_rates / demo_email_outbox | dashboard/demo | no (demo) | yes | demo | demo | dashboard | varies | 50 | DEMO-ONLY |

**RLS "deny-by-default" claim:** supportable — RLS is enabled on all 22 tables, table-level grants are
explicit (`20260712000011_grants.sql`), and `user_encryption_keys` demonstrates the model (SELECT-only
policy; writes filtered to zero rows for clients despite the grant, comment lines 47-53). — VERIFIED,
**but state it precisely**: deny-by-default holds because *no policy exists to permit* the operation,
not because grants are withheld (grants are broad; RLS is the gate).

**Account-deletion cascade:** `auth.users` delete cascades to every owned table via direct or
`obligations`-indirect FK (`delete-account/index.ts:1-8` header; migrations). — VERIFIED (code);
pgTAP `30_account_deletion.sql` present, NOT EXECUTED here.

---

## SECTION 6 — AUTHENTICATION AND SESSION FACTS

| Aspect | Fact | Label |
|---|---|---|
| Sign-up | email/password, `MIN_PASSWORD_LENGTH=12` client-side, rejects auto-session (email confirmation must be on) | VERIFIED `supabase-auth-service.ts:88-110` |
| Sign-in | `signInWithPassword`; generic errors (`invalid_credentials`→`auth`) | VERIFIED `:112-129` |
| Signup verification | `verifyOtp` type `email`, code length **8** (`SIGNUP_EMAIL_OTP_LENGTH=8`) | VERIFIED; **CONTRADICTS "six-digit" docs** |
| Resend | `auth.resend({type:'signup'})`; rate-limit mapped (`429`/`over_email_send_rate_limit`→`rateLimited`) | VERIFIED `:151-158, 51-60` |
| Password reset | **none in code** | NOT FOUND (by design) |
| Generic / non-enumerating messaging | error mapping avoids revealing account existence; codes → typed AppError | VERIFIED `:44-83` |
| Session restoration across restart | **none** — `persistSession:false`, `autoRefreshToken:false` | VERIFIED `client.ts:59-61`; CONTRADICTS "automatic restore" |
| Refresh rotation | disabled (`autoRefreshToken:false`) | VERIFIED; CONTRADICTS threat-model T-04 wording |
| Secure storage adapter | `secureStoreAdapter` passed as auth storage (Keychain/Keystore) | VERIFIED `client.ts:11,56` |
| Sign-out | `signOut()`, local fallback `signOut({scope:'local'})` | VERIFIED `:161-174` |
| User-boundary cache cleanup | `local-user-boundary-cleanup` + `clearFieldEncryptionKey()` | VERIFIED |
| Token lifetime / inactivity / max session | not configured in repo | CONFIGURATION-DEPENDENT / UNKNOWN |

Distinction: Supabase platform normally provides JWT lifetime + refresh; **this app deliberately opts
out of persistence and auto-refresh**, so any "short-lived rotating session" claim describes platform
capability, not this client's behavior — the client instead requires re-sign-in each launch.

---

## SECTION 7 — ENCRYPTION AND KEY MANAGEMENT AUDIT (critical)

**Per-user client-side field encryption IS implemented on this branch.** This reverses the older
draft's "no per-column encryption" statement.

| Item | Finding | Label | Evidence |
|---|---|---|---|
| Client-side field encryption | AES-256-GCM via `@noble/ciphers` `gcm`; nonce(12)‖ciphertext‖tag, base64, prefix `enc:v1:` | VERIFIED | `field-cipher.ts:19,23,106-111` |
| Encrypted columns | `profiles.full_name`, `phone_number`, `primary_bank`; `obligations.nickname`, `notes` | VERIFIED | `user-profile-repository.ts:51`; `obligation-repository.ts:149-154` |
| Explicitly NOT encrypted | `profiles.email` (denormalized from `auth.users.email`); `obligations.institution_name`; all numeric/date fields | VERIFIED | `user-profile-repository.ts:44-46`; obligation-mapper `institution_name` plaintext |
| Per-user DEK | 32-byte DEK per user, provisioned once | VERIFIED | `user-encryption-key/index.ts:118` |
| KEK | 32-byte master, `FIELD_ENC_KEK` Edge secret; imported via WebCrypto; **never in Postgres** | VERIFIED (code) / CONFIGURATION-DEPENDENT (secret must be set) | `user-encryption-key/index.ts:34-37,72` |
| Envelope wrapping | `wrapDek`/`unwrapDek` AES-GCM; DB stores `wrapped_dek` only | VERIFIED | `..key/index.ts:40-57`; migration `..000000` |
| `user_encryption_keys` table | PK `user_id`→auth.users on delete cascade; RLS; SELECT-own only; writes service-role only | VERIFIED | `20260723000000_user_encryption_keys.sql` |
| `enc:v1:` prefix + plaintext pass-through | decrypt returns non-prefixed values unchanged (legacy tolerance, idempotent) | VERIFIED | `field-cipher.ts:23,124` |
| Crypto libs | client `@noble/ciphers`, `expo-crypto` RNG; Edge `crypto.subtle` (Deno) — interoperable | VERIFIED | `field-cipher.ts:18-19`; `..key/index.ts:34` |
| Encryption tests | `field-cipher.test.ts` — 8 cases (round-trip, Arabic/empty, pass-through, caching, connectivity/503/401 mapping, fail-closed) | **VERIFIED — executed 2026-07-23, all 8 passing** (part of the 605-test mobile suite) | `apps/mobile/src/core/crypto/__tests__/field-cipher.test.ts` |
| pgTAP for key table | `90_user_encryption_keys.sql` `plan(6)`: cross-user deny, insert deny, own-read | IMPLEMENTED / NOT EXECUTED (not re-run in this session; requires local Supabase/Docker) | file |
| Key rotation | `dek_version` column reserved; **no rotation routine implemented** | DOCUMENTED INTENT / NOT FOUND | migration comment `:34-36` |
| Multi-device / recovery | DEK re-derivable on any device after auth (Edge re-unwraps); **DEK loss if wrapped row lost** | VERIFIED (cross-device) / accepted-limitation | `..key/index.ts:112-114` |
| DEK cache | **in-memory only** for app process; not persisted; cleared on sign-out | VERIFIED | `field-cipher.ts:9-16,26,93` |

**Scope honesty required in the PDF:** encryption is **client-only** — the bank-simulator dashboard and
any service-role process see **ciphertext** for the 5 fields, and `email` + `institution_name` remain
**plaintext by design**. Do not imply "all PII encrypted". — VERIFIED constraint.

**Platform encryption at rest / TLS:** Supabase-managed (at-rest AES-256 on disk; TLS in transit).
The repo relies on but does not configure these; do not present them as application-controlled, and do
not name a specific at-rest cipher as a repo fact. — CONFIGURATION-DEPENDENT.

**Do NOT infer app-layer encryption from** TLS, at-rest, SecureStore, password hashing, or RLS. The
app-layer encryption claim rests solely on the field-cipher + Edge Function evidence above.

---

## SECTION 8 — SERVER TRUST BOUNDARY AND SECRET HANDLING

| Check | Finding | Label |
|---|---|---|
| Client keys bundled | Supabase **anon** key only, via typed `core/config/env` | VERIFIED `client.ts:54` |
| Service-role key in bundle? | No — only in Edge Functions (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`) | VERIFIED |
| Edge secret names | `FIELD_ENC_KEK`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `OPENROUTER_API_KEY`/`OPENAI_API_KEY` | VERIFIED (names only) |
| Caller identity from verified JWT | `delete-account` and `user-encryption-key` both call `getUser()` (anon client + JWT) **before** service-role use | VERIFIED |
| `learn-assistant` caller auth | no in-function `getUser`; depends on platform `verify_jwt` (config.toml has no override) | CONFIGURATION-DEPENDENT |
| Ownership checks after auth | key/delete functions act only on `user.id` from the verified JWT (never client-supplied id) | VERIFIED |
| Input schemas/limits | `learn-assistant` caps question 1–1200 chars, enum language; key/delete take no body | VERIFIED `learn-assistant:126-138` |
| Rate limiting | none in Edge code (auth flows rely on Supabase platform limits) | NOT FOUND (in-repo) / CONFIGURATION-DEPENDENT |
| CORS | `learn-assistant` sets permissive `Access-Control-Allow-Headers`; others JSON-only | VERIFIED `:50` |
| Logging / redaction | Edge logs redact ids ("id redacted from logs"); key errors log `message` only, never DEK/KEK | VERIFIED `delete-account:` log; `..key:108,134,142` |
| Service-role leak impact | Would grant full DB read/write **but NOT decryption** of the 5 encrypted fields (KEK absent from DB) — a genuine, material reduction, not elimination, of impact | VERIFIED (design) |
| Bank-simulator safeguard | refuses `NODE_ENV=production` unless `DEMO_DASHBOARD_ALLOW_REMOTE=true`; **no auth otherwise** | VERIFIED STATUS 2026-07-17 |
| Secret scanning (gitleaks) | `.gitleaks.toml` present; **never executed; not wired to CI (no `.github/`)** | IMPLEMENTED / NOT EXECUTED |

**A service-role leak is not harmless:** it bypasses all RLS, can read every plaintext column
(numbers, email, institution names), delete accounts, and forge campaign/decision writes. It **cannot**
recover the 5 client-encrypted fields' plaintext without the KEK. State both halves.

---

## SECTION 9 — PRIVACY, MINIMIZATION, LOGGING, DELETION

| Item | Finding | Label |
|---|---|---|
| Data classes in schema | C3 financial (balances/rates/payments), C2 personal (email/name/phone/bank/consent), C1 operational (scrubbed crashes), C0 public (learn) | VERIFIED `security-controls.md:9-16` + schema |
| Profile fields collected | full_name, phone_number (E.164), primary_bank, email, locale | VERIFIED profiles migration |
| Consent table + versioning | `consent_records` append-only, version bump | VERIFIED `..010` |
| Product analytics | none | VERIFIED (no analytics SDK) / DOCUMENTED (T-16) |
| Structured logger | `logger` module is the only sanctioned `console.*`; safe-metadata whitelist | VERIFIED `security-controls.md:29`; `logger.ts` |
| `console.*` restriction | lint bans raw console in features | VERIFIED (claimed, lint rule) / NOT EXECUTED here |
| Sentry scrubbers | `sendDefaultPii:false`, `beforeSend`/`beforeBreadcrumb`, release-only, inert w/o DSN | VERIFIED `sentry.ts:42,70` |
| PII/financial log tests | logger + sentry scrubber unit suites exist | IMPLEMENTED / NOT EXECUTED |
| Notification minimization | claimed (T-09) | DOCUMENTED INTENT |
| Account deletion | Edge `admin.deleteUser` + FK cascade | VERIFIED |
| Auth-user deletion | yes (`admin.deleteUser`) | VERIFIED |
| Audit events table | **none** (`audit_events` P1-reserved); only platform invocation log | VERIFIED (absence) `delete-account:10-13` |
| Backup retention / erasure timing | draft policy only; not provable in repo | DOCUMENTED INTENT — do not claim backups erased |
| PDPL / legal validation | RES-003 open | POSTPONED / owner |

---

## SECTION 10 — FINANCIAL INTEGRITY CONTROLS

| Control | Finding | Label |
|---|---|---|
| Decimal-safe money | `Money` wraps `Decimal`, **rejects non-integer JS `number`** (`Number.isSafeInteger` guard) | VERIFIED `packages/domain/src/value-objects/money.ts:34-53` |
| Rate handling | `Rate.fromPercent`/`fromDecimal` store decimal internally | VERIFIED `money.ts:203-215` |
| Deterministic calc | INV-5 determinism property test with fixed seed | VERIFIED `packages/finance-engine/src/properties/inv-5-determinism.property.test.ts` |
| As-of / effective dates | `calculationAsOf` drives engine; rate periods apply when `effectiveFrom<=asOf` | VERIFIED (engine + rate logic) |
| Formula names/versions | 10 formula ids + `FORMULA` registry | VERIFIED (Section 4) |
| Input hash / serialization | canonical JSON comparison in determinism support | VERIFIED `test-support/canonicalize-result.ts` |
| Calculation-run persistence | `calculation_runs` with provenance; Phase-6 fixed a hashing input-loss P0 | VERIFIED STATUS Phase-6 §6 |
| Refused/missing-input outcomes | `calculationRefused`/`calculationUnsupported`/`dataIncomplete` in taxonomy | VERIFIED `system-architecture.md:105` |
| Provenance classification | Sourced VOs (official vs estimate) | VERIFIED `value-objects/fee.ts` etc. |
| Independent fixed vectors | vectors present; owner reports finance-team review of TV-104/TV-601 and the wider calculation logic is complete | VERIFIED (vectors) / **OWNER-ATTESTED (sign-off, 2026-07-23)** |
| Property tests | present (`packages/finance-engine/src/properties`); **executed 2026-07-23 — 140/140 passing**, incl. INV-1..INV-6 and determinism | VERIFIED (executed) |
| Finance-team validation | owner reports the finance team approved the calculation logic | **OWNER-ATTESTED (2026-07-23)** — internal sign-off; distinguish from a licensed external audit if the PDF implies one |
| Variable-rate boundary / residual | `variableProjection`, `residualDetection` | VERIFIED |
| Islamic-financing terms | Murabaha modeled (`murabahaProgress`, `save_murabaha`); "Shariah-compliant" is product framing, not a certified claim | VERIFIED (feature) / label wording carefully |
| Scenario persistence | extra-payment/scenario **ephemeral** (ADR-0020) | VERIFIED |

Passing unit/property tests ≠ finance-team or production validation. Keep those separate.

---

## SECTION 11 — VERIFICATION EVIDENCE MATRIX

| Control/feature | Src | Unit | Integ | pgTAP local | CI | Device | AR review | Hosted SB | EAS | Sentry event | Finance | Prod | Label |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RLS owner scoping | ✅ | — | ✅(claimed) | ✅ files, NOT run here | ❌ none | ✅(owner, iOS) | — | ❓ | — | — | — | — | VERIFIED code / pgTAP NOT EXECUTED / device OWNER-ATTESTED |
| Field encryption | ✅ | ✅ 605/605 incl. 8 crypto | — | ✅ 90.sql (not run) | ❌ | ✅(owner, iOS) | — | ❓ (needs KEK) | — | — | — | — | VERIFIED (unit executed) / pgTAP NOT EXECUTED |
| Password auth + signup OTP(8) | ✅ | ✅ | ✅(claimed) | n/a | ❌ | ✅(owner, iOS) | — | ❓ | — | — | — | — | VERIFIED code + unit executed |
| Account deletion cascade | ✅ | — | — | ✅ 30.sql (not run) | ❌ | ❌ | — | ❓ | — | — | — | — | VERIFIED code / NOT EXECUTED |
| Finance determinism | ✅ | ✅ 140/140 property | — | n/a | ❌ | — | — | — | — | — | ✅ owner-attested | ❌ | VERIFIED (executed) / finance OWNER-ATTESTED |
| E2E flows (Maestro + Playwright) | ✅ 5 Maestro + 4 Playwright specs | — | — | — | ❌ | ✅(owner, iOS) | — | — | — | — | — | — | VERIFIED (specs present) / run result OWNER-ATTESTED |
| Sentry scrubbing | ✅ | ✅ | — | n/a | ❌ | — | — | — | ❌ | ❌ no real event | — | — | IMPLEMENTED / NOT EXECUTED |
| gitleaks | ✅ config | — | — | — | ❌ not wired | — | — | — | — | — | — | — | IMPLEMENTED / NOT EXECUTED |
| CI pipeline | ❌ no `.github/` | — | — | — | ❌ | — | — | — | — | — | — | — | NOT FOUND |
| Android device pass | — | — | — | — | — | ❌ **out of scope this release** | — | — | — | — | — | — | descoped, not a gap |

Evidence date/commit for code/test rows: `a96953b` (2026-07-23), unit/property/typecheck re-executed
2026-07-23 (605+140+134+77 = 956 tests, all passing; 0 typecheck errors in 4/4 packages). Device, e2e-run,
and finance rows are OWNER-ATTESTED 2026-07-23, not independently reproduced in this session. CI,
hosted-Supabase, EAS, Sentry-event, and Arabic-review evidence is still absent from the tree.

---

## SECTION 12 — CLAIM-BY-CLAIM REVIEW OF THE EXISTING PDF COPY

**App-flow claims**

| Claim | Classification | Corrected wording | Paths | Missing | Public? | Footnote? | Remove? |
|---|---|---|---|---|---|---|---|
| Password sign-up/sign-in | VERIFIED | keep | `supabase-auth-service.ts` | — | yes | no | no |
| "Six-digit" signup verification | **CONTRADICTED** | "**eight-digit** email code" | `auth-service.ts:4` | — | yes (corrected) | no | **fix number** |
| Profile provisioning | VERIFIED | keep | `user-profile-repository.ts:103` | — | yes | no | no |
| Append-only consent | VERIFIED | keep | `..010` | — | yes | no | no |
| Mock bank connection stores nothing | VERIFIED | keep | `threat-model.md:7` | — | yes | no | no |
| Retrieve/select/import obligations | VERIFIED | keep | `obligation-repository.ts` | — | yes | no | no |
| Atomic obligation save RPCs | VERIFIED | keep (`save_conventional_loan`/`save_murabaha`/`save_card`) | migrations | — | yes | no | no |
| Versioned amortization projection | VERIFIED | keep | finance-engine | — | yes | no | no |
| Residual detection | VERIFIED | keep | `computeResidualDetection` | — | yes | no | no |
| Rate-change repricing calc | VERIFIED | keep (`addedCostFromRepricing`) | finance-engine | — | yes | no | no |
| Calculation-run audit | VERIFIED | keep | `..008` | — | yes | no | no |
| Bank rate campaigns | VERIFIED (DEMO) | mark demo/dashboard | `..016001` | — | yes | yes (demo) | no |
| Append-only rate periods | VERIFIED | keep | `..006` | — | yes | no | no |
| Schedule proposals + self/bank decision | VERIFIED | keep | `..018084829` | — | yes | no | no |
| Bank payment recording | VERIFIED | keep (`record_bank_payment`) | `..07` | — | yes | no | no |
| Client-only field encryption | VERIFIED | keep, scope-limited to 5 fields | Section 7 | — | yes | **yes (scope)** | no |
| Per-user DEK + server KEK | VERIFIED | keep; KEK is Edge secret, not in DB | Section 7 | KEK must be set | yes | yes | no |
| Account deletion | VERIFIED | keep | `delete-account` | — | yes | no | no |
| Endpoint-map names | VERIFIED (current set) | use only Section 4 names | Section 4 | — | yes | no | remove stale names |

**Security claims**

| Claim | Classification | Corrected wording / note |
|---|---|---|
| Passwords never handled by app code | VERIFIED | Supabase receives/hashes; app never persists — keep |
| bcrypt (specifically) | UNKNOWN | Supabase hashing algorithm not a repo fact — say "Supabase-managed password hashing", no algorithm name |
| Email verification | VERIFIED | keep (signup only) |
| Short-lived rotating sessions | **CONTRADICTED** | app uses `persistSession:false`, `autoRefreshToken:false` — say "session lives for one app run; re-sign-in each launch" |
| Generic auth messaging | VERIFIED | keep |
| RLS on every table | VERIFIED | keep (22/22) |
| "15 protected tables" | **CONTRADICTED** | **22** RLS-enabled tables |
| "40+ owner-scoped policies" | VERIFIED (≈) | exactly **40** policies |
| "23 server functions with pinned privileges" | CONTRADICTED (count) | **17** functions total; 9 user-callable RPCs; 23 = count of `SECURITY DEFINER`/`search_path` occurrences, not functions |
| "80+ CHECK constraints" | VERIFIED | exactly **80** |
| AES-256 encryption at rest | CONFIGURATION-DEPENDENT | Supabase-managed; present as platform assurance, not repo-controlled |
| TLS-only transport | CONFIGURATION-DEPENDENT | platform assurance |
| Client-side AES-256-GCM PII encryption | VERIFIED | keep, **5 fields only**, client-only scope |
| Hardware-backed token storage | VERIFIED (adapter) | SecureStore/Keychain-Keystore via `secureStoreAdapter` |
| Service-role/KEK server-only | VERIFIED | keep |
| gitleaks CI enforcement | **CONTRADICTED / NOT FOUND** | config exists, **no CI**; say "gitleaks config present, not yet enforced in CI" or remove |
| No sensitive logs | VERIFIED (design+tests, not executed) | keep with "unit-tested" footnote |
| No product analytics | VERIFIED | keep |
| Right to erasure | VERIFIED | keep |
| Account-deletion cascades | VERIFIED | keep |
| Backup deletion implications | DOCUMENTED INTENT | do not claim; footnote as policy/pending |
| pgTAP cross-user tests | IMPLEMENTED / NOT EXECUTED | say "pgTAP suite present (10 files); not re-run in this pass — confirm separately before citing as executed" |
| Fixed financial vectors | VERIFIED (present) / finance sign-off OWNER-ATTESTED | say "reviewed and approved by the finance team" — internal sign-off, dated 2026-07-23 |
| "956 automated tests passing" / "500+ unit tests" | VERIFIED (executed 2026-07-23) | keep; cite the precise figure (956) or "over 900" rather than a round 500+ |
| "Typechecked, zero errors" | VERIFIED (executed 2026-07-23, 4/4 packages) | keep |
| "Tested on device" | OWNER-ATTESTED (iOS, 2026-07-23) | say "manually verified on a physical iOS device"; do not extend to Android |
| "End-to-end tested" | VERIFIED (specs present) / OWNER-ATTESTED (run+pass) | say "covered by Maestro and Playwright end-to-end suites" |
| Sentry safeguards | IMPLEMENTED / NOT EXECUTED | keep with "no verified live event" footnote |
| No certificate pinning | VERIFIED (accepted risk AR-3) | keep |
| No biometric app lock | VERIFIED (accepted) | keep; note connect-bank "Face ID" is a labelled simulation |

---

## SECTION 13 — SAFE COPY FOR THE REDESIGNED DOCUMENTS

**A. Product/architecture intro.** Eltizamati is a bilingual (Arabic/English) mobile app for managing
loan and credit-card obligations in Jordan. It runs in two modes: an offline **demo mode** backed by
bundled seed data (no network, no account), and a **personal mode** backed by Supabase (Postgres with
row-level security, Auth, and Edge Functions). A pure-TypeScript finance engine derives every projected
number deterministically; it never stores state.

**B. Security intro.** Personal data is isolated per user by Postgres row-level security on every table,
reached only with the user's own session token; the app bundle carries a public anon key, never a
service-role key. A defined set of free-text personal fields is additionally encrypted on the device
with a per-user key, so that a database dump or a leaked service key yields ciphertext for those fields.

**C. Verified application-flow stages.** Mode selection → password sign-up → eight-digit email-code
verification → profile provisioning → consent → simulated bank connection (nothing stored) → obligation
import/manual entry via atomic save RPCs → deterministic amortization, residual, and rate-change
projections with persisted calculation runs → payment logging → append-only rate history → schedule
proposals and loan-application decisions (demo/dashboard) → sign-out with per-user cache cleanup →
account deletion with cascade.

**D. Verified security layers.** Anon-key-only client; RLS deny-by-default on 22 tables with 40
owner-scoped policies; 9 `SECURITY DEFINER` RPCs with pinned `search_path`; JWT-verified privileged
Edge Functions that never trust a client-supplied user id; client-only AES-256-GCM encryption of five
PII fields under a per-user DEK wrapped by a server-held KEK; SecureStore-backed session storage;
release-only Sentry with PII scrubbing; account deletion via cascade.

**E. Tested and reviewed.** 956 automated unit and property-based tests pass across the mobile app,
finance engine, domain layer, and bank-simulator dashboard, with zero TypeScript errors in all four
packages (re-executed 2026-07-23). The calculation logic and fixed test vectors have been reviewed and
approved by the finance team. The app has been manually verified end-to-end on a physical iOS device
with no defects raised, and the Maestro and Playwright end-to-end suites have been run.

**F. Implemented but not yet independently verified.** pgTAP suite execution (present, not re-run in
this pass), hosted-Supabase round-trips, a real Sentry event, an EAS build, gitleaks enforcement, and
an Arabic linguistic-reviewer pass — code/config exists; independent runs are pending.

**G. Accepted limitations / demo-only.** Personal mode requires network (no offline editing); sessions
do not survive app restart; `email` and `institution_name` are stored in plaintext by design; encrypted
fields are readable only on the user's authenticated device (a lost key = unrecoverable for those five
fields); the bank-simulator dashboard is an unauthenticated demo tool; the connect-bank sign-in and its
"Face ID" are labelled simulations; rate campaigns and application decisions are demo mechanisms;
**Android is explicitly out of scope for this release** (not tested, by deliberate decision).

**H. How claims are verified.** Each claim in these documents maps to a repository file (and often a
test), or to a dated owner attestation where independent reproduction was not performed in this
session. Counts are computed from migrations at commit `a96953b`; test counts are from the 2026-07-23
execution. Platform assurances (at-rest encryption, TLS, token lifetimes) are labelled as
configuration-dependent, not repository-controlled.

**I. Glossary.** *RLS* — database rule limiting each row to its owner. *Anon key* — public client key,
safe to ship. *Service-role key* — full-access server key, never in the app. *DEK/KEK* — a per-user
data key wrapped by a master key held only server-side. *Envelope encryption* — encrypting a key with
another key. *RPC* — a database function the app calls. *Edge Function* — server code running beside the
database. *pgTAP* — database test framework. *Amortization* — the loan repayment schedule.

---

## SECTION 14 — DIAGRAM DATA

Node fields: Display · Technical · Actor · Trust zone · Data · Auth · Label · Path.

**1. App architecture context** — Borrower(device,untrusted) → Mobile app(`apps/mobile`, anon+JWT) →
{Supabase Auth, PostgREST+RLS, Edge Functions} → Postgres. Sentry(release, scrubbed).
**2. Demo-mode data flow** — Mobile → in-memory `Demo*Repository` (no auth/network) → seed
(`packages/demo-data`). Label DEMO-ONLY.
**3. Personal authenticated flow** — Mobile(JWT) → PostgREST(RLS) / save_* RPC(definer) → tables.
**4. Calculation engine** — service → finance-engine(10 formulas, pure) → `calculation_runs`.
**5. Rate-change/residual** — rate_periods(append) + `addedCostFromRepricing`/`residualDetection`.
**6. Bank-simulator** — Dashboard(no auth) → `demo_publish_rate_campaign`/`demo_decide_*`.
**7. Account deletion** — Mobile → `delete-account`(service-role) → `admin.deleteUser` → FK cascade.
**8. Defense-in-depth** — anon key · RLS · definer RPCs · JWT-verified Edge · field encryption · SecureStore · scrubbed Sentry.
**9. RLS trust boundary** — client rows gated by `auth.uid()`; service-role bypasses RLS (privileged Edge only).
**10. Secret/key location** — anon key(client) · service-role key(Edge only) · KEK/`FIELD_ENC_KEK`(Edge secret only) · wrapped DEK(Postgres) · raw DEK(device memory only).
**11. Verification pipeline** — unit(Jest/Vitest) · property(finance) · pgTAP(local) · [CI: absent] · [device/hosted/finance: pending].

Edge fields (example, deletion): Mobile → delete-account · action delete · HTTPS `functions.invoke` ·
data: JWT only · write · auth: user JWT verified then service role · failure: 401/500 mapped.

---

## SECTION 15 — FINAL BLOCKERS BEFORE PUBLICATION

**Safe to publish now (VERIFIED):** two-mode architecture; RLS on 22 tables / 40 policies / 80 CHECK
constraints; atomic save RPCs; deterministic decimal-safe finance engine; client-only AES-256-GCM
encryption of 5 fields with per-user DEK + server KEK; account deletion cascade; anon-key-only client;
no product analytics; connect-bank stores nothing; **956 automated tests passing, 0 typecheck errors
across all 4 packages (executed 2026-07-23).**

**Safe to publish with owner-attested wording (not independently re-run in this session):** finance-team
review/approval of the calculation logic; manual QA pass on a physical iOS device; execution of the
Maestro and Playwright end-to-end suites. Use language like "reviewed and approved by the finance
team" / "verified on a physical device" rather than implying a third-party audit or CI-gated proof —
the underlying artifacts (spec files, test vectors) are in the repo; the pass/fail result is the
owner's word, dated 2026-07-23.

**Require wording changes:** "six-digit"→**eight-digit**; "15 tables"→**22**; "23 functions"→**17 (9
RPCs)**; "short-lived rotating sessions"→"no cross-restart session / re-sign-in each launch"; at-rest &
TLS → label as platform assurance; encryption → add "5 fields, client-only, email/institution plaintext".

**Require repository documentation fixes (not blocking the PDF, but note):** `security-controls.md`,
`threat-model.md`, `system-architecture.md` still describe SQLite and omit field encryption; STATUS.md
is behind this branch. These should be reconciled but are out of scope for a read-only audit.

**Require config screenshots / owner confirmation:** `FIELD_ENC_KEK` set; hosted Supabase settings;
dashboard access control for any public URL.

**Require live testing:** pgTAP run (not yet re-executed against a local Supabase stack), hosted RLS
round-trip, real Sentry event. (Unit/property tests and typecheck are now executed and passing —
see above; field-cipher's 8 cases already ran as part of the 605-test mobile suite.)

**Require device testing:** Android pass (explicitly out of scope for this release, not merely
pending); Arabic reviewer pass. iOS manual QA is owner-attested as done (2026-07-23).

**Require security review / removal:** "gitleaks CI enforcement" (no CI) — remove or restate; do not
claim backup erasure timing.

**Must be removed:** any "six-digit" statement; any SQLite/Drizzle persistence claim; any endpoint
names not in Section 4; any "all PII encrypted" phrasing.

**Recommended order of corrections:** (1) fix the numeric/wording contradictions; (2) add encryption
scope footnotes; (3) restate at-rest/TLS/CI/Sentry as pending or platform; (4) reconcile the stale docs
separately.

**Final decision: READY ONLY AS A REVIEW DRAFT.** The verified feature and security substance is
strong and largely publishable once the wording corrections above are applied. As of 2026-07-23, unit
testing, typechecking, finance-team sign-off, iOS manual device QA, and e2e test execution have moved
from "pending" to "done" (the last three as dated owner attestation, not repo-reproducible evidence).
What remains open: several presentation claims still contradicted by code (OTP length, table/function
counts, session behavior, CI-enforcement claims), no CI pipeline in the tree, Android intentionally out
of scope, and hosted-Supabase/Sentry-event/EAS/Arabic-review/pgTAP-execution still unproven in this
environment. Do not represent this document as a substitute for a third-party security audit.

---

*End of evidence pack. Working tree confirmed unchanged after audit (`git status --short`: only the
untracked `docs/pdf/` and `docs/security-overview.html`).*
