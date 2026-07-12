# Independent Full-Repository Current-State Audit — Eltizamati

## 1. Audit metadata

- **Audit date/time:** 2026-07-12, 12:38–13:25 Asia/Amman, with final static review continuing afterward.
- **Auditor:** Codex, acting as independent principal-engineering, financial-software, security, and delivery reviewer.
- **Repository:** Talaljaber/Eltizamati; local path C:\Users\hp\.m2\Eltizamati.
- **Primary audited state:** current working tree, including pre-existing uncommitted changes.
- **Current branch / HEAD:** phase6-finance-engine / 23d1fed62cfb2570db085c7bc94687e7bcc95ea0.
- **Remote branch:** origin/phase6-finance-engine is the same SHA.
- **Remote main:** bef47ae0b78ef937314a0085e8aa1857b19e3404 from git ls-remote at 2026-07-12. GitHub compare reports remote main is two commits ahead of 23d1fed with 23d1fed as merge base and no file delta; the two commits are merge-history commits.
- **Local main:** b371e587304e8a8d6eb89b392de67a1a7914d376; stale and 14 commits behind before fetch. The fetch deleted stale origin/Main and failed to update a broken origin/main tracking ref.
- **Initial working tree (E1, 12:38:17+03:00):** modified docs/08-delivery/IMPLEMENTATION_PLAN.md and docs/10-implementation/STATUS.md; untracked .claude/ and docs/10-implementation/phases/PHASE-10-ios-parity-push-and-saved-scenarios.md; no staged changes. Frozen outside the repository at C:\tmp\eltizamati-audit-initial-state-2026-07-12.txt.
- **Environment:** Node v23.8.0; command-line pnpm 11.7.0, while Corepack used the declared pnpm 10.17.0 for installation; Git 2.47.1.windows.2; Docker client 29.6.1 but daemon unavailable; Expo SDK 54.0.35; Windows PowerShell.
- **Declared runtime:** package.json permits Node >=20 but CI explicitly uses Node 20. Node 23 is non-LTS and differs from CI/device guidance. Expo Doctor could not be obtained locally.
- **Availability:** internet/GitHub connector and git ls-remote were available; gh, gitleaks, supabase, expo-doctor, adb, eas, and maestro executables were unavailable. Docker daemon was unavailable. A later network-enabled approval was rejected because the environment usage quota was exhausted.
- **Scope limits:** no local-Supabase execution, pgTAP re-run, generated-type regeneration, integration test, emulator, Expo Go, physical device, airplane-mode walkthrough, process-death test, Arabic visual review, native-speaker review, finance-team validation, preview build, or production validation was performed.
- **Evidence levels:** E1 = executed in this audit; E2 = current static code/config evidence; E3 = historical commit/PR/report/record not reproduced; E4 = unsupported claim.

## 2. Executive verdict

Eltizamati currently provides a deterministic three-obligation demo seed, in-memory demo repositories, onboarding, a bilingual three-tab shell, a populated obligations list, minimal raw-field obligation details, Supabase schema/repository/auth building blocks, and an eight-formula finance-engine package. The Android JavaScript export succeeds and 162 mobile unit/component assertions pass.

It does **not** currently provide the advertised product story. Home still renders “pending” placeholders instead of engine-backed totals and next payment (apps/mobile/app/(tabs)/index.tsx:87-118). The loan route remains the explicitly minimal Phase 5 implementation and has none of Phase 7’s rate-impact, explanation, schedule, scenario, bank-question, or insight-center surfaces (apps/mobile/app/obligation/[id].tsx:1-248). Reset-demo exists only as an application-service method and has no UI caller (apps/mobile/src/services/import-service.ts:143-145).

Personal mode is not end-to-end. The real app provider never calls createCompositionRoot; it mounts only demo repositories and a separate auth/consent pair (apps/mobile/src/providers.tsx:32-90). Tabs and detail are guarded by RequireDemoRepositories and redirect when demo repositories are absent (apps/mobile/app/(tabs)/_layout.tsx:1-44; apps/mobile/src/features/demo/components/RequireDemoRepositories.tsx:14-19). Sign-in and sign-up set onboarding complete but never set dataMode to personal, and consent persistence is fire-and-forget before navigation (apps/mobile/app/auth/sign-in.tsx:36-51; apps/mobile/app/auth/sign-up.tsx:34-52). The complete Supabase repository family exists only in unused composition code (apps/mobile/src/services/composition-root.ts:55-79).

The repository is not currently gate-green. E1 format:check fails on the pre-existing untracked Phase 10 file. The exact finance command failed twice: first run 116/118 with two 120-second property-test timeouts; second run 118/118 but non-zero with two worker RPC errors. Therefore test:packages, test, check, and ci:check are not green. Exact current-HEAD GitHub Actions run 29186310426 failed; jobs 86632921321 and 86632921324 contain zero executed steps.

The app is **not demo-ready**, **personal mode is not end-to-end**, **none of Phases 1–6 meet all mandatory binary exit criteria under the governing documents**, and **Phase 7 may not begin**. Phases 4, 5, and 6 must formally reopen; Phases 1–3 require verification exceptions to be resolved rather than being described as “verified complete.”

**Single recommended next action:** reopen Phase 4 and replace the running demo-only provider path with the actual mode-aware composition root/repository context, then prove one synthetic sign-in → consent persisted → personal tabs → repository read/write → sign-out/in restore flow through the mounted app. Stop if that single E1 path is not green; do not start Phase 7 UI.

## 3. Product scope and critical user story

The binding product goal is a Jordan-first, bilingual AR/EN mobile app that makes loans, Murabaha financing, and cards understandable, with provenance and estimate honesty. The critical demo story is: onboarding → populated dashboard → variable-rate loan → rate history/impact → residual-risk explanation → +50 JOD scenario → bank questions, offline and in Arabic and English (docs/01-requirements/mvp-scope.md §1; docs/08-delivery/hackathon-plan.md §4).

Binding constraints are:

- UI → application → domain, with infrastructure depending inward on domain; UI must not use repositories or the engine directly.
- Demo mode is deterministic, in memory, unauthenticated, network-free, visibly labeled, and never inserted into Supabase.
- Personal mode is authenticated and Supabase-only; no SQLite financial database, no durable personal financial data in AsyncStorage.
- Material numbers require provenance; derived numbers require explainability and a persisted CalculationRun.
- Money/rates use value objects and decimal arithmetic; missing material inputs cause refusal, not defaults.
- Murabaha must not use conventional-interest terminology or speculative repricing math.
- Explicit non-goals include advice, contract modification, money movement, real provider claims, and unsupported finance conventions.

## 4. Repository and history state

### Branch, divergence, and dirty tree

- phase6-finance-engine at 23d1fed is aligned with its remote phase branch.
- Remote main is bef47ae and contains the current phase head plus two merge commits; local main is stale at b371e58.
- STATUS.md says the current HEAD is de3f850 (docs/10-implementation/STATUS.md:16), contradicted by E1 git rev-parse.
- The initial dirty tree contained only the four entries listed in §1. The two modified docs add a post-Phase-9 “Phase 10,” although Phase 9 is still planned. The Phase 10 file also causes E1 format failure.
- The mandatory git fetch failed: unable to resolve/update refs/remotes/origin/main after deleting stale origin/Main. The audit did not rewrite refs.

### Commit and PR history

- PR #3 merged Phase 5/UI work: base e8dd63b, head 464dcde, 9 commits, no reviews. It included demo and Supabase repository work and PHASE-5-COMPLETION.md.
- PR #4 merged initial Phase 6: base b371e58, head 4dda2c2, 13 commits, no reviews. Post-merge commits then fixed canonical serialization, registry typing, typecheck, and Supabase CalculationRun coverage.
- PR #5 merged remediation/Phase 4 closure: base 88354e5, head 23d1fed, 12 commits, no reviews. GitHub compare reports the head was one commit behind the base’s branch history at comparison time.
- Completion documentation was written before defects were found: PHASE-6-COMPLETION.md now admits the original merge did not typecheck, had a canonical-hash collision, and lacked Supabase CalculationRun tests.
- Current Phase 4/5/6 code is on remote main through PR #5, not only on an unmerged branch.

### CI

GitHub connector E1/E2 remote evidence for 23d1fed:

- CI run 29186310426: completed/failure.
- Supabase job 86632921321: completed/failure, zero steps.
- build-and-test job 86632921324: completed/failure, zero steps.
- PRs #3, #4, and #5 have no submitted reviews.

The claim that this is “external” may be a reasonable diagnosis, but no phase file authorizes waiving its binary “CI green” exit criterion. The current commit has actual CI evidence, and it is red.

## 5. Current architecture

### Intended

The intended architecture is one mode-aware composition root selecting a complete repository family, one QueryClient, application services invoking the engine, and UI consuming mode-neutral hooks.

### Actual

- packages/domain contains VOs, entities, repository ports, status and validation services.
- packages/finance-engine contains eight formula implementations, registry/refusal types, vectors, properties, and insight rules.
- packages/demo-data contains deterministic builders/fixtures anchored to DEMO_DATE 2026-07-01.
- apps/mobile contains demo-only home/list/detail routes, onboarding, auth screens, Supabase infrastructure/repositories, and CalculationService.
- supabase contains 12 migrations, three pgTAP suites, generated types, and delete-account Edge Function.
- The running provider tree constructs its own QueryClient and demo repository family; it separately constructs Supabase auth and consent only. It does not consume createCompositionRoot or expose personal repositories.
- Home/list/detail directly request DemoRepositories and hardcode user-1. This is mode branching and infrastructure selection outside the documented single composition root.
- Normal mobile Jest excludes integration tests (apps/mobile/jest.config.js:4-7); root check never proves Supabase behavior.
- SQLite/Drizzle are not imported by production source, but drizzle-orm and expo-sqlite remain direct mobile dependencies and expo-sqlite remains an app plugin (apps/mobile/package.json:27,34; apps/mobile/app.json:31).

## 6. Phase status matrix

| Phase | Documented status                          | Completion report | Actual implementation status       | Verification status                                                            | Key gaps                                                                            | Reopen?                | Next dependency                |
| ----- | ------------------------------------------ | ----------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------- | ------------------------------ |
| 1     | STATUS complete; phase file In Progress    | Exists            | IMPLEMENTED BUT NOT FULLY VERIFIED | Current local basics mostly pass; CI red; phase report lacks required evidence | binary CI/clean-tree/device/doctor evidence                                         | Verification exception | CI/account owner               |
| 2     | STATUS complete; phase file Planned        | Exists            | IMPLEMENTED BUT NOT FULLY VERIFIED | Domain E1 119/119; CI red; report counts 14 decisions vs phase’s 16            | provisional rules; peer review absent                                               | Verification exception | product/finance decisions      |
| 3     | STATUS complete; phase file Planned        | Exists            | IMPLEMENTED BUT NOT FULLY VERIFIED | Strong E2 SQL; E3 68/68 only; E1 Docker unavailable; CI red                    | current live DB/type-drift not reproduced                                           | Verification exception | Docker + CI                    |
| 4     | STATUS complete; phase file Ready to begin | Exists            | PARTIALLY COMPLETE                 | isolated tests pass; running personal mode breaks                              | composition root unused, personal repos unmounted, consent/deletion flow incomplete | **Yes**                | mounted personal spine         |
| 5     | STATUS complete; phase file Planned        | Exists            | PARTIALLY COMPLETE                 | builders/demo repos pass; mobile tests pass                                    | Home placeholders, no reset UI, no airplane/AR/device E1                            | **Yes**                | engine-backed home/reset       |
| 6     | STATUS complete; phase file Planned        | Exists            | IMPLEMENTED BUT NOT FULLY VERIFIED | exact command non-zero twice; pending signed vectors                           | flaky/timeout gate, CI, TV-104/203/30x/601                                          | **Yes**                | stable gate + finance sign-off |
| 7     | Planned                                    | Missing           | PARTIALLY COMPLETE                 | one late-arriving insight-evaluation service/test; no Phase 7 UI               | all core journey screens missing                                                    | No; do not start       | reopen 4–6                     |
| 8     | Planned                                    | Missing           | NOT STARTED                        | no rich subtype/manual/settings/learn flows                                    | nearly all scope absent                                                             | No                     | Phase 7                        |
| 9     | Planned                                    | Missing           | NOT STARTED                        | no Maestro/device/Sentry/EAS/release evidence                                  | all hardening/release gates absent                                                  | No                     | Phase 8                        |

### Phase 1 detailed audit

| Item   | Requirement                       | Claimed evidence       | Current code evidence                    | Test/runtime evidence                               | Missing evidence                                     | Verdict                              |
| ------ | --------------------------------- | ---------------------- | ---------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| 1.1    | Review/commit existing work       | completion claim       | commits exist                            | E2 history                                          | phase report has no commit table; tree not clean now | Implemented, verification incomplete |
| 1.2    | LF policy                         | report                 | .gitattributes exists                    | format currently fails on Phase 10 file             | clean current tree                                   | Implemented, verification incomplete |
| 1.3    | five primitives + formatter tests | 64 tests               | six current primitive suites + formatter | E1 mobile 162/162                                   | RTL stories not recorded                             | Verified complete                    |
| 1.4    | pnpm check green                  | claimed                | scripts exist                            | E1 check exit 1                                     | green aggregate                                      | Partially implemented                |
| 1.5    | Node LTS, doctor, Metro bundle    | historical Metro claim | Expo config exists                       | E1 Android export pass; Node 23; doctor unavailable | LTS/doctor/Metro/device record                       | Implemented, verification incomplete |
| 1.6    | not-found/settings navigation     | claimed                | routes registered                        | E1 bundle pass                                      | manual navigation                                    | Implemented, verification incomplete |
| 1.7    | language persistence              | claimed                | AsyncStorage in i18n                     | unit/static only                                    | cold-start/RTL device evidence                       | Implemented, verification incomplete |
| 1.8    | CI workflow green                 | workflow exists        | CI YAML                                  | current run red/zero steps                          | green run                                            | Partially implemented                |
| 1.9    | verified README                   | quickstart exists      | commands documented                      | current ci:check fails                              | corrected current instructions                       | Partially implemented                |
| Exit 1 | clean status                      | claimed                | no                                       | dirty primary tree                                  | clean checkout evidence                              | Not implemented                      |
| Exit 2 | check exit 0                      | claimed                | no                                       | E1 exit 1                                           | pass                                                 | Not implemented                      |
| Exit 3 | required tests                    | claimed                | yes                                      | E1 pass                                             | —                                                    | Verified complete                    |
| Exit 4 | nav/i18n persistence              | claimed                | yes                                      | no device restart                                   | runtime proof                                        | Implemented, verification incomplete |
| Exit 5 | CI passes                         | waived                 | workflow only                            | E1 remote fail                                      | green CI                                             | Not implemented                      |
| Exit 6 | README verified                   | claimed                | stale command outcome                    | E1 contradiction                                    | update after recovery                                | Partially implemented                |
| Exit 7 | completion report                 | exists                 | sparse                                   | E4-heavy                                            | commands/exits/limitations                           | Implemented, verification incomplete |

**Phase 1:** IMPLEMENTED BUT NOT FULLY VERIFIED. Report validity: INSUFFICIENT EVIDENCE. Formal implementation reopen is unnecessary, but closure must be corrected after CI and current gates pass.

### Phase 2 detailed audit

| Item   | Requirement                           | Claimed evidence         | Current code evidence                                                           | Test/runtime evidence                                                                       | Missing evidence                         | Verdict                              |
| ------ | ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| 2.1    | ObligationBase provenance/institution | report                   | obligation.ts                                                                   | E1 domain pass                                                                              | —                                        | Verified complete                    |
| 2.2    | RatePeriod/non-overlap                | report                   | entity + validator                                                              | E1 domain pass                                                                              | live persistence semantics E1            | Implemented, verification incomplete |
| 2.3    | Payment                               | report                   | entity + allocation validator                                                   | E1 domain pass                                                                              | —                                        | Verified complete                    |
| 2.4    | supporting entities                   | report                   | CalculationRun/Insight/Consent/Profile; ScheduleEntry formally kept engine-side | E1 compile/pass                                                                             | formal cut is documented                 | Formally cut                         |
| 2.5    | Percentage/Confidence                 | report                   | VOs                                                                             | E1 pass                                                                                     | upper-bound decision remains provisional | Implemented, verification incomplete |
| 2.6    | card rule/fees                        | report                   | union and fee                                                                   | E1 pass                                                                                     | product validation                       | Implemented, verification incomplete |
| 2.7    | Murabaha invariant                    | report                   | validate-murabaha                                                               | E1 pass                                                                                     | finance validation                       | Implemented, verification incomplete |
| 2.8    | ownership/timestamps/v7 IDs           | report                   | branded IDs/userId                                                              | tests do not prove UUIDv7 generation everywhere; app fallbacks are timestamp/random strings | UUIDv7 runtime conformance               | Partially implemented                |
| 2.9    | canonical storage mapping             | report                   | Money/Rate + SQL numeric                                                        | static only                                                                                 | live round-trip current E1               | Implemented, verification incomplete |
| 2.10   | full status derivation                | report                   | deriveObligationStatus                                                          | E1 16 tests pass                                                                            | due matching heuristic provisional       | Implemented, verification incomplete |
| 2.11   | DEMO_DATE narrative                   | report                   | 2026-07-01; seed tests                                                          | E1 demo-data pass                                                                           | finance sign-off                         | Implemented, verification incomplete |
| 2.12   | schema design                         | report                   | database-schema.md                                                              | E2 compared to migrations                                                                   | current generated drift E1               | Implemented, verification incomplete |
| 2.13   | RLS design                            | report                   | docs + SQL                                                                      | E2                                                                                          | current DB execution                     | Implemented, verification incomplete |
| 2.14   | repository ports                      | report                   | contracts/repositories.ts                                                       | E1 typecheck                                                                                | full substitutability absent             | Implemented, verification incomplete |
| 2.15   | generated types strategy              | report                   | documented/generated file                                                       | E2                                                                                          | regeneration E1                          | Implemented, verification incomplete |
| 2.16   | deletion contract                     | report                   | docs + Edge Function                                                            | E2                                                                                          | audit event/client cleanup/absence E1    | Partially implemented                |
| Exit 1 | all 16                                | report says 14 decisions | most exist                                                                      | mixed                                                                                       | count/reconciliation                     | Implemented, verification incomplete |
| Exit 2 | status chain                          | claimed                  | yes                                                                             | E1 pass                                                                                     | provisional semantics                    | Implemented, verification incomplete |
| Exit 3 | ports exported                        | claimed                  | yes                                                                             | E1 typecheck                                                                                | —                                        | Verified complete                    |
| Exit 4 | schema matches domain                 | claimed                  | likely                                                                          | E2                                                                                          | generated/live diff                      | Implemented, verification incomplete |
| Exit 5 | check + CI green                      | waived                   | scripts                                                                         | E1 red                                                                                      | green CI                                 | Not implemented                      |
| Exit 6 | report                                | exists                   | yes                                                                             | contradictions retained                                                                     | corrected closure                        | Implemented, verification incomplete |

**Phase 2:** IMPLEMENTED BUT NOT FULLY VERIFIED. Report validity: STALE.

### Phase 3 detailed audit

| Item   | Requirement            | Claimed evidence      | Current code evidence                                | Test/runtime evidence   | Missing evidence     | Verdict                              |
| ------ | ---------------------- | --------------------- | ---------------------------------------------------- | ----------------------- | -------------------- | ------------------------------------ |
| 3.1    | Supabase project       | report                | config, migrations, tests                            | E2                      | E1 stack             | Implemented, verification incomplete |
| 3.2    | typed env/secrets      | report                | env loader/example                                   | E1 unit pass            | gitleaks unavailable | Implemented, verification incomplete |
| 3.3    | all tables/constraints | report                | 10 tables, numeric columns                           | E2                      | E1 migration apply   | Implemented, verification incomplete |
| 3.4    | same-migration RLS     | report                | each creating migration enables RLS/policies         | E2 rg evidence          | E1 database          | Implemented, verification incomplete |
| 3.5    | pgTAP matrix           | 68/68 historical      | 43+14+11 plans; authenticated role used in RLS suite | E3 only                 | E1 current run       | Implemented, verification incomplete |
| 3.6    | generated types        | historical diff-clean | database.types.ts                                    | E2                      | E1 regeneration      | Implemented, verification incomplete |
| 3.7    | deletion groundwork    | report                | cascades + test                                      | E2                      | current execution    | Implemented, verification incomplete |
| Exit 1 | fresh reset            | E3 pass               | scripts exist                                        | not executed            | Docker               | Cannot determine                     |
| Exit 2 | ownership/RLS          | claimed               | E2 verified                                          | not executed            | database catalog     | Implemented, verification incomplete |
| Exit 3 | pgTAP green            | E3                    | tests credible                                       | not executed            | Docker               | Implemented, verification incomplete |
| Exit 4 | types diff-clean       | E3                    | generated file                                       | not executed            | CLI/Docker           | Cannot determine                     |
| Exit 5 | CI green               | explicitly red        | workflow                                             | E1 red                  | account fix          | Not implemented                      |
| Exit 6 | secret scan            | historical/manual     | no obvious secret in tracked sources                 | gitleaks unavailable    | tool evidence        | Implemented, verification incomplete |
| Exit 7 | report                 | exists                | yes                                                  | self-waives binary gate | corrected report     | Implemented, verification incomplete |

**Phase 3:** IMPLEMENTED BUT NOT FULLY VERIFIED. Report validity: MATERIALLY INCORRECT because it marks complete while its own mandatory CI criterion is red.

### Phase 4 detailed audit

| Item   | Requirement                  | Claimed evidence                                          | Current code evidence                                              | Test/runtime evidence                                     | Missing evidence                         | Verdict                              |
| ------ | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| 4.1    | Supabase client/SecureStore  | report                                                    | client + adapter                                                   | E1 unit pass                                              | device/session-size behavior             | Implemented, verification incomplete |
| 4.2    | auth flows/screens/restore   | report                                                    | screens/service                                                    | E1 mock-heavy component/unit pass                         | mounted app restore/personal tabs        | Partially implemented                |
| 4.3    | server consent               | report                                                    | repository/hook                                                    | sign-in does not await mutation                           | live current E1; failure gate            | Partially implemented                |
| 4.4    | all Supabase repos/mappers   | report                                                    | seven implementations                                              | static + historical integration                           | running app context                      | Implemented, verification incomplete |
| 4.5    | Query foundation             | report                                                    | QueryClient and keys                                               | E1 units                                                  | duplicate QueryClient/composition path   | Partially implemented                |
| 4.6    | single composition root      | report                                                    | file exists                                                        | unused by production; providers constructs competing path | E2 direct search                         | Documented only                      |
| 4.7    | offline/error UX             | report                                                    | auth ErrorState                                                    | E1 component pass                                         | personal data screens do not exist/mount | Partially implemented                |
| 4.8    | deletion full workflow       | report                                                    | server function only                                               | no client invoke/reauth/cache/prefs workflow              | no E1                                    | Partially implemented                |
| 4.9    | biometric lock               | cut                                                       | none                                                               | none                                                      | cut recorded                             | Formally cut                         |
| Exit 1 | auth/write/restore           | report cites integration harness                          | harness excluded from normal tests; UI cannot reach personal repos | not executed live                                         | mounted flow                             | Partially implemented                |
| Exit 2 | all repos + shared contracts | shared contracts run only demo; Supabase behavior bespoke | repos exist                                                        | E3 integration                                            | true substitutability/current E1         | Implemented, verification incomplete |
| Exit 3 | cross-user app path          | historical service test                                   | no running app path                                                | not executed                                              | E1                                       | Cannot determine                     |
| Exit 4 | deletion zero rows + audit   | report                                                    | no audit table/client flow                                         | not executed                                              | full workflow                            | Partially implemented                |
| Exit 5 | consent versioned            | report                                                    | repository                                                         | navigation does not await write                           | not executed                             | proof                                | Partially implemented |
| Exit 6 | offline/error                | report                                                    | auth-only                                                          | E1 units                                                  | personal screens                         | Partially implemented                |
| Exit 7 | boundary                     | report                                                    | supabase imports confined to infra/auth integration                | E1 depcruise pass                                         | composition intent                       | Implemented, verification incomplete |
| Exit 8 | check/CI/AR/report           | report                                                    | translations parity                                                | E1 check/CI fail; no visual AR                            | green gates                              | Not implemented                      |

**Phase 4:** PARTIALLY COMPLETE. Report validity: MATERIALLY INCORRECT. Severity P1; blocks personal mode and Phase 7’s “both modes” criterion. Owner: Phase 4 application-integration owner. **Formally reopen.**

### Phase 5 detailed audit

| Item   | Requirement                                 | Claimed evidence            | Current code evidence                                                                                                         | Test/runtime evidence                            | Missing evidence                      | Verdict                              |
| ------ | ------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- | ------------------------------------ |
| 5.1    | deterministic canonical builders            | report                      | builders/constants                                                                                                            | E1 45/45 demo-data                               | signed numeric TV coupling            | Implemented, verification incomplete |
| 5.2    | all demo repos + ImportService              | report                      | implementations/service                                                                                                       | E1 mobile contracts                              | event pipeline remains TODO Phase6    | Implemented, verification incomplete |
| 5.3    | reset demo                                  | report                      | ImportService.resetDemo                                                                                                       | no screen caller                                 | unit/UI evidence absent               | Partially implemented                |
| 5.4    | onboarding/modes                            | report                      | four screens                                                                                                                  | account path broken after auth; manual disabled  | component coverage partial            | Partially implemented                |
| 5.5    | mode/banner                                 | report                      | AsyncStorage/banner                                                                                                           | demo only                                        | mode exclusivity/personal restoration | Partially implemented                |
| 5.6    | populated Home                              | report admits dummy metrics | hardcoded pending at lines 87-118                                                                                             | E1 mobile assertions do not test real aggregates | engine consumption/states             | Partially implemented                |
| 5.7    | obligations list                            | report                      | list                                                                                                                          | no real filters/error state; user-1 hardcoded    | E1 mobile pass lacks screen test      | Partially implemented                |
| 5.8    | minimal detail                              | report                      | route                                                                                                                         | raw values, N/A literal, no Amount for money     | no screen test                        | Partially implemented                |
| 5.9    | DS additions                                | report                      | six primitives                                                                                                                | some primitive tests, not full RTL stories       | visual RTL                            | Implemented, verification incomplete |
| 5.10   | offline verification                        | report                      | no network imports in demo repos                                                                                              | no E1 airplane/device                            | recorded walkthrough                  | Implemented, verification incomplete |
| Exit 1 | fresh populated bilingual offline dashboard | claimed                     | placeholders                                                                                                                  | no E1 walkthrough                                | real totals/AR/offline                | Partially implemented                |
| Exit 2 | three correct obligations/provenance/status | builders correct            | list hides values; detail raw values not Amount provenance                                                                    | static only                                      | UI evidence                           | Partially implemented                |
| Exit 3 | reset exact                                 | service exists              | no UI                                                                                                                         | no E1                                            | end-to-end reset                      | Partially implemented                |
| Exit 4 | contracts/import                            | claimed                     | tests exist                                                                                                                   | E1 mobile pass                                   | ImportService dedicated test clarity  | Implemented, verification incomplete |
| Exit 5 | no Supabase demo dependency                 | demo repos clean            | AppProviders always mounts AuthServiceProvider and constructs Supabase client even in demo, contradicting “no effect” comment | export only                                      | missing env demo runtime              | Partially implemented                |
| Exit 6 | states/AR/check/CI                          | claimed                     | key parity 167/167                                                                                                            | check/CI fail; no visual AR                      | all states                            | Not implemented                      |
| Exit 7 | report                                      | exists                      | 32-line report lists unresolved TS errors/future commit                                                                       | E4-heavy                                         | real closure evidence                 | Partially implemented                |

**Phase 5:** PARTIALLY COMPLETE. Report validity: MATERIALLY INCORRECT. Severity P1 for closure/demo readiness; blocks demo spine and Phase 7. Owner: Phase 5 UI/application owner. **Formally reopen.**

### Phase 6 detailed audit

| Item   | Requirement                                | Claimed evidence             | Current code evidence                        | Test/runtime evidence                                              | Missing evidence                    | Verdict                              |
| ------ | ------------------------------------------ | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | ------------------------------------ |
| 6.1    | typed deterministic contracts/hash/refusal | remediation report           | registry + canonical serializer              | E1 domain and finance assertions; finance process red              | stable exact gate                   | Implemented, verification incomplete |
| 6.2    | eight formulas                             | report                       | all eight source files/registry              | E1 formula assertions mostly pass                                  | signed demo/card anchors            | Implemented, verification incomplete |
| 6.3    | decimal/rounding                           | report                       | Decimal/Money implementations                | E1 properties partly flaky                                         | independent schedule comparison     | Implemented, verification incomplete |
| 6.4    | vectors                                    | report                       | seven JSON families                          | TV-104/203/30x/601 still PENDING-FINANCE/reviewedBy null           | independent expected numbers        | Partially implemented                |
| 6.5    | INV-1..7 properties                        | report                       | 1000-run fixed-seed properties, broad ranges | exact run 1 timed out two; run 2 assertions pass but worker errors | stable CI/unfixed seed record       | Implemented, verification incomplete |
| 6.6    | coverage gate                              | report 99.89/95.43/100/99.89 | config thresholds valid                      | same figures reproduced only in non-zero run                       | successful process                  | Implemented, verification incomplete |
| 6.7    | CalculationRun persistence                 | report                       | service + demo/Supabase repos                | E1 demo service tests; Supabase not E1                             | current live round-trip             | Implemented, verification incomplete |
| 6.8    | insight primitives                         | report                       | rules.ts                                     | E1 unit assertions within finance runs                             | mounted evaluation/event production | Implemented, verification incomplete |
| Exit 1 | eight registry bodies                      | claimed                      | yes                                          | E1                                                                 | —                                   | Verified complete                    |
| Exit 2 | vector families/pending clear              | report explicitly pending    | partial                                      | structural tests only for TV-30x                                   | finance sign-off                    | Partially implemented                |
| Exit 3 | properties green in CI                     | claimed                      | tests exist                                  | E1 exact command non-zero; CI zero steps                           | stable green CI                     | Not implemented                      |
| Exit 4 | coverage gate pass                         | claimed                      | threshold                                    | coverage printed during non-zero run                               | successful coverage command         | Implemented, verification incomplete |
| Exit 5 | refusal                                    | report                       | refusal tests                                | E1 assertions pass                                                 | persistence/UI refusal E1           | Implemented, verification incomplete |
| Exit 6 | run persistence                            | report                       | service/repositories                         | Supabase historical only                                           | E1 both implementations             | Implemented, verification incomplete |
| Exit 7 | check/CI/report                            | report                       | report exists                                | E1 check and CI fail                                               | green gates                         | Not implemented                      |

**Phase 6:** IMPLEMENTED BUT NOT FULLY VERIFIED. Report validity: MATERIALLY INCORRECT as a closure report. Severity P1; blocks Phase 7. Owner: Phase 6 finance-engine owner plus finance team for signed vectors. **Formally reopen.**

### Phase 7 detailed audit

| Item   | Requirement                           | Claimed evidence                                      | Current code evidence                                                      | Test/runtime evidence             | Missing evidence     | Verdict               |
| ------ | ------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | -------------------- | --------------------- |
| 7.1    | full loan detail/two numbers/payments | none                                                  | minimal Phase 5 detail only                                                | none                              | feature              | Not implemented       |
| 7.2    | rate history                          | none                                                  | no route/feature                                                           | none                              | feature              | Not implemented       |
| 7.3    | rate impact/residual explanation      | none                                                  | engine only                                                                | none                              | UI/service           | Not implemented       |
| 7.4    | reusable explain sheet                | none                                                  | no route/component                                                         | none                              | feature              | Not implemented       |
| 7.5    | schedule                              | none                                                  | engine schedule only                                                       | none                              | screen               | Not implemented       |
| 7.6    | scenario planner                      | none                                                  | formula only                                                               | none                              | UI/perf              | Not implemented       |
| 7.7    | bank questions                        | none                                                  | no screen/content                                                          | none                              | feature              | Not implemented       |
| 7.8    | live insights center/read state       | seeded rows/repositories plus late concurrent service | InsightEvaluationService exists but is not mounted; center absent          | late E1 mobile service tests pass | UI/event integration | Partially implemented |
| 7.9    | six DS primitives                     | some absent                                           | TimelineItem/FieldRow/InsightBanner/ProgressBar/Sheet/SectionHeader absent | none                              | components/tests     | Not implemented       |
| 7.10   | identical personal-mode hooks         | none                                                  | demo-only routes                                                           | personal mode broken              | full path            | Not implemented       |
| Exit 1 | airplane AR+EN spine                  | none                                                  | absent                                                                     | none                              | all                  | Not implemented       |
| Exit 2 | TV-30x signed                         | none                                                  | reviewedBy null                                                            | none                              | finance sign-off     | Blocked externally    |
| Exit 3 | provenance/explain/run                | none                                                  | absent UI                                                                  | none                              | all                  | Not implemented       |
| Exit 4 | scenario/perf                         | none                                                  | absent UI                                                                  | none                              | all                  | Not implemented       |
| Exit 5 | insight center                        | none                                                  | absent                                                                     | none                              | all                  | Not implemented       |
| Exit 6 | states/check/CI/report                | none                                                  | no report                                                                  | gates red                         | all                  | Not implemented       |

**Phase 7:** PARTIALLY COMPLETE at service level only because of the late concurrent change described in Appendix H; the product-facing phase remains effectively unstarted. Report validity: MISSING.

### Phase 8 detailed audit

| Item   | Requirement                           | Claimed evidence | Current code evidence                           | Test/runtime evidence | Missing evidence              | Verdict               |
| ------ | ------------------------------------- | ---------------- | ----------------------------------------------- | --------------------- | ----------------------------- | --------------------- |
| 8.1    | rich Murabaha detail                  | none             | minimal raw fields only                         | none                  | full feature/terminology test | Not implemented       |
| 8.2    | rich card detail/utilization          | none             | minimal raw fields                              | none                  | full feature                  | Not implemented       |
| 8.3    | manual add/edit/payment/rate          | none             | no routes/forms/services                        | none                  | all                           | Not implemented       |
| 8.4    | complete settings/reset/erase/account | none             | language-only settings; server delete primitive | none                  | all workflows                 | Not implemented       |
| 8.5    | data status                           | none             | absent                                          | none                  | feature                       | Not implemented       |
| 8.6    | legal/Learn topics                    | shell only       | Learn placeholder route                         | none                  | content/screens               | Partially implemented |
| 8.7    | threshold/reminder setting            | none             | absent                                          | none                  | feature                       | Not implemented       |
| 8.8    | state matrix/forms                    | none             | absent                                          | none                  | all                           | Not implemented       |
| Cut 1  | mock-connect                          | none             | absent                                          | none                  | formal cut decision           | Not implemented       |
| Cut 2  | card simulator                        | formula only     | no UI                                           | formula assertions    | ship or formal cut            | Partially implemented |
| Cut 3  | notifications                         | none             | absent                                          | none                  | formal cut                    | Not implemented       |
| Cut 4  | duplicate detection                   | none             | absent                                          | none                  | formal cut                    | Not implemented       |
| Exit 1 | all detail types                      | none             | no                                              | none                  | all                           | Not implemented       |
| Exit 2 | both-mode manual entry                | none             | no                                              | none                  | all                           | Not implemented       |
| Exit 3 | settings/data/legal/Learn             | none             | no                                              | none                  | all                           | Not implemented       |
| Exit 4 | utilization/threshold insights        | none             | no                                              | none                  | all                           | Not implemented       |
| Exit 5 | cut decisions                         | none             | no Phase 8 status                               | none                  | decisions                     | Not implemented       |
| Exit 6 | check/CI/report                       | none             | no report                                       | gates red             | all                           | Not implemented       |

**Phase 8:** NOT STARTED. Report validity: MISSING.

### Phase 9 detailed audit

| Item   | Requirement                   | Claimed evidence     | Current code evidence             | Test/runtime evidence | Missing evidence  | Verdict               |
| ------ | ----------------------------- | -------------------- | --------------------------------- | --------------------- | ----------------- | --------------------- |
| 9.1    | Maestro E2E                   | none                 | no Maestro files/tool             | none                  | all               | Not implemented       |
| 9.2    | full integration              | historical fragments | normal CI excludes integration    | Docker unavailable    | current suite     | Not implemented       |
| 9.3    | physical Android validation   | none                 | no device tooling                 | none                  | all               | Blocked externally    |
| 9.4    | Arabic walkthrough            | none                 | key parity only                   | no visual evidence    | review/device     | Blocked externally    |
| 9.5    | accessibility pass            | primitive tests      | partial                           | E1 unit only          | full app/TalkBack | Partially implemented |
| 9.6    | network-failure personal mode | auth unit only       | personal screens absent           | none                  | all               | Not implemented       |
| 9.7    | security/privacy pass         | static controls      | no gitleaks/audit/deep-link suite | unavailable           | all               | Not implemented       |
| 9.8    | Sentry                        | none                 | dependency/config absent          | none                  | all               | Not implemented       |
| 9.9    | EAS profiles/builds           | none                 | no eas.json/tool                  | none                  | all               | Not implemented       |
| 9.10   | rehearsal/recording           | none                 | none                              | none                  | all               | Not implemented       |
| 9.11   | final docs                    | none                 | incomplete/stale docs             | none                  | all               | Not implemented       |
| Exit 1 | Maestro AR/EN                 | none                 | absent                            | none                  | all               | Not implemented       |
| Exit 2 | device/airplane/Arabic        | none                 | absent                            | none                  | all               | Blocked externally    |
| Exit 3 | performance budgets           | none                 | no benchmark/device               | none                  | all               | Not implemented       |
| Exit 4 | security green                | none                 | tools absent                      | none                  | all               | Not implemented       |
| Exit 5 | Sentry event                  | none                 | absent                            | none                  | all               | Not implemented       |
| Exit 6 | APK/two devices/tag/recording | none                 | absent                            | none                  | all               | Not implemented       |
| Exit 7 | all reports/status/risk       | none                 | reports only 1–6                  | none                  | all               | Not implemented       |

**Phase 9:** NOT STARTED. Report validity: MISSING.

## 7. Completion-report validity matrix

| Report  | Exists | Claims                           | Evidence quality                    | Current contradictions                                                             | Validity verdict      |
| ------- | ------ | -------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| Phase 1 | Yes    | stable, CI-ready, 64 tests       | mostly E4; no command table         | current CI/gates red; phase file still In Progress                                 | INSUFFICIENT EVIDENCE |
| Phase 2 | Yes    | complete decisions/schema        | good static detail, mixed E3        | says 14 decisions vs 16 scoped; binary CI unmet; provisional rules                 | STALE                 |
| Phase 3 | Yes    | complete, 68/68, generated clean | strong E3/E2                        | self-waives red CI; no current E1 DB run                                           | MATERIALLY INCORRECT  |
| Phase 4 | Yes    | personal mode complete           | isolated E1 units + E3 integration  | running composition/personal tabs broken; deletion client absent; CI red           | MATERIALLY INCORRECT  |
| Phase 5 | Yes    | completed demo first experience  | 32-line E4 summary                  | lists unresolved errors/future commit; Home dummy; reset UI absent; no walkthrough | MATERIALLY INCORRECT  |
| Phase 6 | Yes    | remediated complete engine       | candid remediation, E2 + partial E1 | exact command non-zero; pending vectors; CI red                                    | MATERIALLY INCORRECT  |
| Phase 7 | No     | —                                | —                                   | —                                                                                  | MISSING               |
| Phase 8 | No     | —                                | —                                   | —                                                                                  | MISSING               |
| Phase 9 | No     | —                                | —                                   | —                                                                                  | MISSING               |

## 8. Feature and screen inventory

| Route / capability                     | Intended SCR                 | Current component/data                            | Demo    | Personal           | States/tests                           | Verdict |
| -------------------------------------- | ---------------------------- | ------------------------------------------------- | ------- | ------------------ | -------------------------------------- | ------- |
| onboarding/language                    | SCR-ONB-LANG                 | AsyncStorage/i18n route                           | Yes     | pre-mode           | no route test/visual RTL               | Partial |
| onboarding/intro                       | SCR-ONB-INTRO                | route                                             | Yes     | pre-mode           | no component test                      | Partial |
| onboarding/consent                     | SCR-ONB-CONSENT              | local acknowledgment                              | Yes     | pre-auth only      | no decline/legal flow                  | Partial |
| onboarding/mode                        | SCR-ONB-DATA                 | demo enabled; manual disabled; account links auth | Yes     | link only          | account completion broken              | Partial |
| auth/sign-in                           | SCR-AUTH-SIGNIN              | SupabaseAuthService + consent hook                | N/A     | auth only          | mocked component tests                 | Partial |
| auth/sign-up                           | SCR-AUTH-SIGNUP              | SupabaseAuthService                               | N/A     | auth only          | mocked tests; no resend implementation | Partial |
| auth/reset                             | SCR-AUTH-RESET               | request reset                                     | N/A     | auth               | mocked tests                           | Partial |
| tabs/Home                              | SCR-HOME                     | demo repos; pending placeholders                  | Yes     | blocked            | loading only; no screen test           | Partial |
| tabs/Obligations                       | SCR-OBL-LIST                 | demo list, user-1                                 | Yes     | blocked            | loading/empty, no real filters/error   | Partial |
| tabs/Learn                             | SCR-LEARN                    | placeholder shell                                 | shell   | blocked            | no content                             | Partial |
| obligation/[id]                        | subtype details              | minimal raw-field demo route                      | Yes     | blocked            | loading/not-found; no screen test      | Partial |
| settings                               | SCR-SET                      | language-only                                     | partial | no account actions | no full tests                          | Partial |
| rate history                           | SCR-RATE-HIST                | absent                                            | No      | No                 | none                                   | Missing |
| rate impact                            | SCR-RATE-IMPACT              | absent                                            | No      | No                 | none                                   | Missing |
| explain                                | SCR-EXPLAIN                  | absent                                            | No      | No                 | none                                   | Missing |
| schedule                               | SCR-OBL-SCHEDULE             | absent                                            | No      | No                 | none                                   | Missing |
| loan simulator                         | SCR-SIM-LOAN                 | absent                                            | No      | No                 | none                                   | Missing |
| bank questions                         | SCR-BANK-QUESTIONS           | absent                                            | No      | No                 | none                                   | Missing |
| insight center                         | SCR-INS-CENTER               | absent                                            | No      | No                 | none                                   | Missing |
| add/payment/rate forms                 | SCR-OBL-ADD/PAY-ADD/RATE-ADD | absent                                            | No      | No                 | none                                   | Missing |
| data status/legal/topic/card simulator | Phase 8 screens              | absent                                            | No      | No                 | none                                   | Missing |

No deep-link allow-list implementation was found. Several user-visible literals remain: emoji icons, N/A in detail, and raw style values. apps/mobile/app/(tabs)/_layout.tsx:21 uses marginRight, violating the logical-style rule. EN/AR JSON leaf-key parity is E1 167/167, but this is not RTL or Arabic-quality validation.

## 9. Domain and financial-integrity assessment

### Value-object and canonical boundaries

Money, Rate, Percentage, Confidence, LocalDate, provenance, branded IDs, and canonical hashing exist with meaningful unit coverage. The 2026-07-12 canonical-loss remediation is real: toCanonicalJsonValue emits distinct tagged snapshots for Money, Rate, and Percentage (packages/domain/src/services/canonical-json.ts:40-67), and CalculationService uses it before hashing and persistence (apps/mobile/src/services/calculation-service.ts:59-69). Registry generic typing ties FormulaId to FormulaInput (E2 and E1 typecheck).

Risks remain:

- Application-generated fallback IDs use Date.now/Math.random and are not UUIDv7 (CalculationService:25-29; consent hook:24-29).
- Supabase mappers convert decimal storage strings to JS Number at the infrastructure boundary. With current NUMERIC precision this is probably round-trip-tolerable, but it contradicts the strongest “binary floats never touch monetary values” wording and lacks boundary-focused tests for maximum/three-decimal values.
- Status delinquency matching and Percentage upper bound remain provisional DOC-ISSUE decisions.
- CalculationService coverage is outside the finance package percentage; Supabase persistence coverage is separate and was not run E1.

### Formula table

| Formula              |   v | Required inputs / refusal                                             | Rounding / properties / vectors             | Persistence       | Open validation                | Verdict                              |
| -------------------- | --: | --------------------------------------------------------------------- | ------------------------------------------- | ----------------- | ------------------------------ | ------------------------------------ |
| amortization         |   1 | principal/rate/term/start/asOf                                        | HALF_UP 3dp; INV-1/2/4/6; TV-101–105        | service supported | TV-104 pending                 | Implemented, verification incomplete |
| variableProjection   |   1 | principal/rates/term/installment/policy/asOf; invalid history refused | full precision/3dp; INV-1/3/5/6; TV-201–205 | supported         | TV-203 pending                 | Implemented, verification incomplete |
| residualDetection    |   1 | projection/original/installment                                       | threshold/cause tests; TV-203/30x           | supported         | numeric demo residual pending  | Implemented, verification incomplete |
| extraPaymentScenario |   1 | base projection + extra amounts                                       | INV-3; TV-304 structural only               | supported         | TV-304 pending                 | Implemented, verification incomplete |
| allocationEstimate   |   1 | balance/rate/payment                                                  | floor/overpayment; TV-401–403               | supported         | no bank schedule               | Implemented, verification incomplete |
| murabahaProgress     |   1 | sale price/payments/asOf                                              | exact subtraction; INV-7; TV-501–502        | supported         | finance/terminology validation | Implemented, verification incomplete |
| aggregates           |   1 | obligations/balances/commitments                                      | provenance/exclusion; TV-701–702            | supported         | Home does not consume it       | Implemented, verification incomplete |
| cardPayoff           |   1 | balance/APR/rule/payment/asOf; missing APR/balance refused            | 600 cap/never-pay; TV-601–603               | supported         | TV-601 pending                 | Implemented, verification incomplete |

TV status: TV-104, TV-203, TV-301–305, and TV-601 have reviewedBy null/PENDING-FINANCE. The demo-seed tests explicitly make structural assertions only (packages/finance-engine/src/formulas/demo-seed-vectors.test.ts:1-6). No structural assertion is a signed numeric pass.

Property generators retain the documented broad ranges: principal 100–1,000,000 JOD, rate 0–30%, term 1–480, 1000 runs and fixed seed 424242. They have not been narrowed to trivial ranges. However, the workload exceeds the 120-second test timeout intermittently and causes worker IPC failures. No recorded unfixed-seed run was found.

## 10. Persistence, Supabase, and security assessment

E2 static positives:

- Ten user tables exist; user_id is non-null or primary-key non-null.
- Every table enables RLS in its creating migration and defines owner policies.
- Grants migration grants authenticated access so RLS can apply.
- Child tables use composite ownership foreign keys with cascades.
- rate_periods and consent_records omit delete policies; calculation_runs omit update; pgTAP explicitly tests immutability/default denial.
- RLS tests switch to role authenticated with JWT claims; they do not rely solely on superuser fixtures.
- Supabase-js imports are confined to core Supabase, auth/repository infrastructure, and integration tests; E1 depcruise reports 344 modules/963 dependencies, zero violations.
- Demo repositories/packages contain no Supabase imports and no seed.sql exists.
- AsyncStorage stores language, dataMode, onboarding flags, and local acknowledgment, not personal financial entities.
- SecureStore adapter is used for Supabase session material.
- No service-role key is present in client source; Edge Function reads it from environment.

Gaps:

- Docker/Supabase E1 unavailable, so migrations, pgTAP, integration, and type regeneration are Not Executed.
- Normal CI/check excludes personal-mode.integration.test.ts.
- Edge Function authenticates the caller and deletes auth user, but client re-auth/invoke/cache/preferences/session cleanup is absent.
- The promised audit event does not exist; platform log is substituted. This is explicitly documented but does not meet Phase 4’s own “audit event” exit text.
- Edge Function returns raw deleteError.message; this may expose operational metadata and is not mapped through the app taxonomy.
- No deep-link allow-list implementation/test was found.
- i18n module uses console.error/warn under a blanket lint disable; no financial data is logged there, but this violates the “logger only” governance pattern.
- gitleaks and dependency audit were unavailable; no current vulnerability verdict is possible.

## 11. Demo-mode assessment

DEMO_DATE is correctly fixed at 2026-07-01. Seed builders are deterministic and include the specified loan, Murabaha, card, 30 loan payments, 22 Murabaha payments, rate timing, and three seeded insights; E1 demo-data tests pass 45/45.

The demo repository/import path is real in memory and has no Supabase writes. The persistent DemoBanner is used on current data routes. However:

- Home totals and next payment are still pending placeholders.
- Obligations and details hardcode user-1.
- Status calls pass empty payment/insight arrays, so seeded history does not influence displayed status.
- ResetDemo is not exposed.
- Detail displays raw storage strings rather than Amount, and only record-level provenance.
- AppProviders always constructs AuthServiceProvider/getSupabaseClient even for demo, so “missing env does not affect demo” is not demonstrated and the comment conflicts with actual mounting.
- Airplane, process-death, Arabic visual, and device evidence are absent.

Current demo spine depth: onboarding → demo Home shell → obligations list → minimal raw detail. The rate-change story stops there.

## 12. Personal-mode assessment

Trace:

1. Onboarding/account choice reaches /auth/sign-in: implemented.
2. Sign-up/sign-in service calls: implemented and unit-tested with mocks; historical live service integration exists.
3. Verify email: pending screen exists, but resend is claimed in docs and not implemented.
4. Consent: repository/hook exists, but mutation is not awaited; navigation proceeds even if it fails.
5. dataMode/profile: sign-in/sign-up never set personal dataMode or create/update profile.
6. Repository context: complete family exists in createCompositionRoot but is never mounted.
7. Tabs: RequireDemoRepositories redirects personal/no-demo state to onboarding.
8. Read/write: only isolated integration test/service harness, not running app.
9. Sign-out/in restore: auth service and historical test only; no Settings action/mounted repository restoration.
10. Delete account: Edge Function only; no client workflow.

The first decisive runtime break is between successful authentication and repository context/tabs. Personal mode is **not end-to-end**.

## 13. Test and verification matrix

| Command/gate                                   |         Exit |                                            Counts | Evidence level | What it proves                          | What it does not prove                          |
| ---------------------------------------------- | -----------: | ------------------------------------------------: | -------------- | --------------------------------------- | ----------------------------------------------- |
| pnpm install --frozen-lockfile (CI mode)       |            0 |                                     1122 packages | E1             | lockfile resolves from store            | supported device runtime                        |
| format:check                                   |            1 |                             Phase 10 file warning | E1             | current dirty tree not formatted        | tracked source formatting alone                 |
| lint                                           |            0 |                                     zero warnings | E1             | ESLint configuration/current files      | runtime architecture                            |
| typecheck                                      |            0 |                                     root + mobile | E1             | compile-time consistency                | mounted behavior                                |
| depcruise                                      |            0 |                              344 modules/963 deps | E1             | configured import rules                 | composition intent/dead code                    |
| domain test                                    |            0 |                                15 files/119 tests | E1             | domain units/invariants                 | finance correctness/live DB                     |
| demo-data test                                 |            0 |                                  2 files/45 tests | E1             | deterministic builders                  | UI/offline device                               |
| finance exact run 1                            |            1 |                                116 pass/2 timeout | E1             | many assertions; exposes flake/timeouts | green gate                                      |
| finance exact run 2                            |            1 |               118 pass; 2 unhandled worker errors | E1             | assertions and coverage figures         | green process/CI                                |
| finance coverage printed                       | non-zero run | 99.89 stmt / 95.43 branch /100 funcs /99.89 lines | E1             | package-only instrumented coverage      | CalculationService/persistence; successful gate |
| mobile Jest direct                             |            0 |                               28 suites/162 tests | E1             | units/components/contracts              | integration, real composition, device           |
| test:packages                                  |            1 |                                   finance failure | E1             | aggregate package gate red              | —                                               |
| test                                           |            1 |                                   finance failure | E1             | repository test aggregate red           | integration                                     |
| check                                          |            1 |                                   stops at format | E1             | current gate red                        | later chained stages                            |
| ci:check                                       |            1 |                                   stops at format | E1             | local CI alias red                      | GitHub runner                                   |
| git diff --check                               |            0 |              no whitespace errors in tracked diff | E1             | diff whitespace                         | formatting of untracked file                    |
| Android Expo export                            |            0 |                      1185 modules, 3.79 MB bundle | E1             | non-device Android bundle               | launch, UX, device, offline                     |
| GitHub Actions 29186310426                     |      failure |                                2 jobs, zero steps | E1 remote      | exact-head CI red                       | code root cause                                 |
| Supabase start/reset/test/integration/type-gen | Not Executed |                                                 — | —              | —                                       | Docker daemon unavailable                       |
| expo-doctor                                    | Not Executed |                                                 — | —              | —                                       | executable/network approval unavailable         |
| pnpm audit/gitleaks                            | Not Executed |                                                 — | —              | —                                       | tool/network unavailable                        |
| emulator/device/Arabic/airplane/release        | Not Executed |                                                 — | —              | —                                       | tooling/artifacts unavailable                   |

The mobile suite warns that a worker failed to exit gracefully and was force-exited despite exit 0; this is a test-quality issue, not a green teardown.

## 14. Findings by severity

| ID   | Severity | Area                                | Evidence                                                                                                                                                     | Reproduction                              | Impact                                                                   | Required action                                                        | Owning phase     |
| ---- | -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------- |
| F-01 | P1       | Personal mode                       | providers.tsx:32-90; composition-root.ts:55-79; RequireDemoRepositories:14-19                                                                                | sign in, navigate tabs without demo repos | advertised mode cannot reach data UI                                     | mount mode-aware root/repositories and E2E-test                        | 4                |
| F-02 | P1       | Quality gate                        | E1 finance runs/check/CI                                                                                                                                     | exact commands in §13                     | no trustworthy closure/CI                                                | stabilize exact finance command and restore all gates                  | 6/1              |
| F-03 | P1       | Phase 5/demo                        | Home lines 87-118; reset has no caller                                                                                                                       | open Home/search resetDemo                | no ten-second dashboard or reset demo                                    | consume aggregates/next payment; wire reset                            | 5                |
| F-04 | P1       | Financial validation                | vector docs/JSON reviewedBy null                                                                                                                             | rg PENDING-FINANCE/reviewedBy             | judge-visible numbers undefended; Phase 7 exit blocked                   | independent finance sign-off                                           | 6/7 finance team |
| F-05 | P1       | Consent/deletion                    | sign-in:45-50; no delete client references                                                                                                                   | code trace                                | consent can fail before navigation; erase workflow incomplete            | await consent; implement verified client deletion flow                 | 4                |
| F-06 | P1       | Phase governance                    | phase files statuses + reports + red CI                                                                                                                      | compare docs/current runs                 | downstream work started on unmet binary gates                            | reopen/correct status based on evidence                                | 1–6              |
| F-07 | P2       | Test architecture                   | jest.config.js:4-7; CI workflow lacks integration                                                                                                            | inspect scripts/workflow                  | normal green Jest/check would not prove Supabase                         | add explicit disposable integration CI gate                            | 3/4              |
| F-08 | P2       | Routes/RTL/a11y                     | marginRight at tab layout:21; raw emoji/literals; no deep-link allow-list                                                                                    | required searches                         | RTL/security/accessibility gaps                                          | logical styles/icon map/allow-list tests                               | 1/9              |
| F-09 | P2       | Dead/stale architecture             | createCompositionRoot production references = zero                                                                                                           | rg excluding tests                        | misleading “complete” architecture                                       | make it active or remove competing path                                | 4                |
| F-10 | P2       | Dependencies                        | drizzle-orm/expo-sqlite direct deps/plugin; no imports                                                                                                       | rg/package config                         | stale architecture/supply-chain surface                                  | remove after confirming Expo requirement                               | 1/4              |
| F-11 | P2       | Test reliability                    | mobile forced worker exit; finance RPC errors/timeouts                                                                                                       | E1 runs                                   | flaky/non-zero CI and hidden leaks                                       | diagnose teardown/performance without reducing generators              | 6/4              |
| F-12 | P2       | Provenance UI                       | detail raw strings, no Amount                                                                                                                                | detail route:130-238                      | material values lack field provenance/explain                            | use Amount and calculation-run links                                   | 5/7              |
| F-13 | P3       | Documentation                       | README Phase 1; phase headers; completions README “none”                                                                                                     | static lines                              | reviewer confusion                                                       | reconcile only after code recovery                                     | docs owner       |
| F-14 | P3       | History/ref health                  | fetch origin/main ref failure                                                                                                                                | E1 git fetch                              | local comparison tooling unreliable                                      | repair remote ref outside review after backup                          | repo owner       |
| F-15 | P3       | Generated/tool artifacts            | install tooling created .mcp.json/.pnpm-store after initial freeze                                                                                           | E1 timestamps/status                      | violates clean audit handoff unless removed                              | remove exact audit-created untracked artifacts                         | environment/user |
| F-16 | P2       | Late Phase 7 dependency/test design | demo-data now imports finance-engine while finance-engine dev-depends on demo-data; new builder test recomputes expected trigger hashes with the same engine | late diff + builders.test.ts              | circular workspace relationship and weak self-oracle can mask rule drift | redesign seed/evaluator contract around independent fixed expectations | 6/7              |

No P0 current financial-output error or cross-user exposure was reproduced. The historical canonical collision was fixed and regression-tested.

## 15. Documentation drift

- STATUS says Phases 1–6 complete/Phase 7 ready; phase files say In Progress, Planned, or Ready to begin. Phase files define binary criteria and cannot be waived by STATUS.
- completions/README says no reports exist; reports 1–6 exist.
- README says current phase is Phase 1.
- STATUS says HEAD de3f850; actual HEAD is 23d1fed.
- STATUS says 350 tests; current separate totals are domain 119 + finance 118 + demo 45 + mobile 162 = 444 assertions when all finance assertions complete, but finance process is non-zero and totals overlap aggregate runs.
- Phase 5 report says completed while documenting unresolved type errors and a future commit; current source still labels its dashboard dummy/pending.
- Phase 6 report correctly admits earlier false claims, but still serves as closure while exact command and CI are red.
- calculation-test-vectors says the engine milestone is not done until TV-30x is signed; Phase 6 phase file says pending TV-30x can remain and gates Phase 7. Stricter financial-integrity/DoD text controls judge-visible readiness: Phase 7 cannot close, and this audit does not call Phase 6 verified.
- financial-calculation-spec says line coverage is 100%; E1 is 99.89 and only in non-zero runs.
- system architecture retains SQLite diagrams/prose under a supersession banner. Banner reduces but does not eliminate misleading content.
- security-controls retains “domain→SQLite” and “Local DB only (MVP)” rows despite ADR-0017 banner.
- database-schema text says migrations do not yet exist in places even though 12 exist.
- implementation-plan pre-existing edit says Phase 10 was added “after Phase 9 closed,” but Phase 9 is planned and no report exists.
- The correct source of truth for implementation is current code + E1 gates; for binding scope, accepted ADR-0017 + phase files + requirements/DoD; reports are historical evidence only.

## 16. Dependencies and configuration

- Required/active: Expo/RN, Router, React Query, Supabase JS, SecureStore, AsyncStorage, i18n, decimal.js, Vitest/Jest/fast-check.
- Stale/dead: drizzle-orm has no source import; expo-sqlite has no source import but remains Expo plugin/dependency. No local DB/schema/migration exists, so there is no accidental active local financial path.
- Expo SDK packages bundle successfully, but Expo Doctor was not run. Node 23 differs from CI Node 20 and recommended LTS workflow.
- packageManager is pnpm 10.17.0; global command reported 11.7.0, while Corepack installation used 10.17.0.
- Generated database.types.ts is committed and excluded from some quality tooling; current drift could not be checked.
- Finance coverage excludes index/types/test-support/config; reasonable for pure type/barrel support, but the displayed aggregate includes vitest.config.ts at zero and still passes thresholds.
- CI has build-and-test and Supabase jobs but both execute zero steps on GitHub; integration Jest is not invoked in local check.
- No eas.json, Maestro flows, Sentry config, or release profiles exist.

## 17. Blockers and pending decisions

| Blocker/decision                                    | Owner                    | Impact                                                                          |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| GitHub Actions zero-step failures                   | repository/account owner | blocks every binary CI exit                                                     |
| Node 20 LTS/device tooling                          | developer/user           | blocks doctor/device/release confidence                                         |
| Docker/local Supabase                               | developer environment    | blocks current DB/integration/type E1                                           |
| RES-003 PDPL/data residency                         | user/legal               | real personal data prohibited                                                   |
| TV-104/203/30x/601                                  | finance team             | financial closure and Phase 7 judge numbers blocked                             |
| Percentage cap/status cadence/refusal-status signal | product/domain + finance | provisional domain behavior                                                     |
| finance worker/timeouts                             | Phase 6 owner            | package and aggregate gates non-zero                                            |
| personal-mode composition                           | Phase 4 owner            | advertised personal product unusable                                            |
| Arabic native review RES-009                        | product teammate         | Arabic demo not ready                                                           |
| Audit-created .mcp.json/.pnpm-store cleanup         | environment/user         | exact clean-tree restoration; automated deletion was rejected by approval quota |

## 18. Current demo and release readiness

| Readiness dimension   | Verdict      | Basis                                          |
| --------------------- | ------------ | ---------------------------------------------- |
| Code-complete         | No           | Phases 4–9 gaps                                |
| Locally testable      | Partial      | many units pass; aggregate red; DB unavailable |
| Demo-spine ready      | No           | stops at minimal detail                        |
| Airplane-mode ready   | Not verified | architecture supports partial demo only        |
| Arabic ready          | No           | key parity only                                |
| Physical-device ready | Not verified | no tooling/evidence                            |
| Personal-mode ready   | No           | composition/routing break                      |
| Hackathon-demo ready  | No           | money-shot UI and signed numbers absent        |
| Preview/release ready | No           | no EAS/Sentry/security/device artifacts        |

## 19. Recommended recovery plan

| Priority | Owning/reopened phase | Exact goal                             | Required surfaces                                                         | Verification                                            | Stop condition                               | Dependency           |
| -------: | --------------------- | -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- | -------------------- |
|        1 | Reopen 4              | make personal mode real in mounted app | providers, composition root, mode/profile/auth guards, repository context | synthetic mounted flow through tabs/read/write/restore  | any redirect/demo-context dependency remains | Docker/Supabase      |
|        2 | Reopen 5              | finish honest first experience         | Home aggregates/next payment, status inputs, reset UI, Amount/provenance  | fresh-state EN/AR demo walkthrough; deterministic reset | placeholder/pending/raw value remains        | stable engine        |
|        3 | Reopen 6              | restore authoritative finance gate     | property runner/teardown without narrowing generators; persistence tests  | exact command twice exit 0; check/CI green              | any non-zero/unhandled error                 | CI                   |
|        4 | 6/7 finance gate      | sign numeric vectors                   | vector JSON/spreadsheet provenance                                        | reviewedBy filled; independent expectations pass        | engine-generated oracle or unsigned value    | finance team         |
|        5 | Verify 1–3            | close infrastructure exceptions        | Actions, Docker, type generation, security scan                           | exact green runs                                        | any binary criterion red                     | owner/Docker/network |
|        6 | Begin 7 only then     | implement money-shot screens           | Phase 7 routes/features/services/primitives                               | airplane AR+EN spine and persisted explains             | predecessor condition not met                | device/Arabic        |

Do not update STATUS/completion reports until the corresponding E1 stop condition is met.

## 20. Final decision

1. **Which phase is genuinely current?** Recovery between Phases 4–6; the earliest broken dependency is reopened Phase 4, not Phase 7.
2. **Which phases are verified complete?** None under the binding binary exit criteria. Phases 1–3 are substantially implemented but have unresolved verification/CI exceptions.
3. **Which completion reports are invalid or stale?** Phase 1 insufficient; Phase 2 stale; Phases 3–6 materially incorrect as closure reports.
4. **Must any phase reopen?** Yes: Phases 4, 5, and 6. Phase 1–3 closure claims also require verification correction.
5. **May Phase 7 begin now?** **No.**
6. **What exact condition changes that answer?** Mounted personal composition is proven end-to-end; Phase 5 dashboard/reset/offline bilingual path is complete; exact finance command passes twice with no unhandled errors; repo check and exact-head CI are green; judge-visible TV-30x values are independently signed before Phase 7 closure.
7. **What is the single next recommended task?** Reopen Phase 4 and implement/test the mounted sign-in → persisted personal mode/profile/consent → personal repository context → tabs read/write/restore path.

## Appendices

### A. Commands and exact exits

- Initial Git capture: exit 0.
- git fetch --all --prune: exit 1, unresolved refs/remotes/origin/main.
- git ls-remote heads: exit 0; main bef47ae, phase branch 23d1fed.
- frozen install first interactive attempt: exit 1; CI-mode sandbox attempt timed out; escalated/store-backed final attempt exit 0.
- format 1; lint 0; typecheck 0; depcruise 0.
- domain 0 (119); demo-data 0 (45).
- finance run 1 exit 1 (116 pass, 2 timeout); finance run 2 exit 1 (118 pass, two unhandled RPC errors).
- mobile Jest direct exit 0 (162; forced worker teardown warning).
- test:packages 1; test 1; check 1; ci:check 1; git diff --check 0.
- Android export first path attempt exit 1 due C:\tmp mkdir EPERM; second approved writable-output path exit 0.
- Docker version/ps exit 1 because daemon missing.

### B. Relevant commits and PRs

- Phase 1 close 964c8ea.
- Phase 3 implementation c5a9296; remediation 57db382.
- Phase 5 PR #3 head 464dcde; post-merge demo fix b371e58.
- Phase 6 PR #4 head 4dda2c2; P0 serialization fix ca46c22; typing ccf3541; live-repo coverage 908b9e1; corrected report de3f850.
- Phase 4/remediation PR #5 head 23d1fed.
- No reviews on PRs #3–#5.

### C. Route inventory

Current routes are (tabs)/index, (tabs)/obligations, (tabs)/learn/index, onboarding/{language,intro,consent,mode}, auth/{sign-in,sign-up,reset}, obligation/[id], settings/index, and +not-found. No Phase 7 analysis route exists.

### D. Formula/vector inventory

Eight version-1 formulas exist. Analytical/structural vectors are stored in tv-1xx through tv-7xx. Pending numeric values: TV-104, TV-203, TV-301–305, TV-601. All reviewedBy fields inspected for those items are null.

### E. Evidence index

- Provider/composition contradiction: apps/mobile/src/providers.tsx:32-90; apps/mobile/src/services/composition-root.ts:55-79.
- Personal route block: apps/mobile/app/(tabs)/_layout.tsx:1-44; RequireDemoRepositories.tsx:14-19.
- Auth state gap: sign-in.tsx:36-51; sign-up.tsx:34-52.
- Home placeholders: apps/mobile/app/(tabs)/index.tsx:87-118.
- Minimal detail: apps/mobile/app/obligation/[id].tsx:1-248.
- Reset service only: apps/mobile/src/services/import-service.ts:143-145.
- Canonical remediation: canonical-json.ts:40-67; calculation-service.ts:59-69.
- Integration excluded: apps/mobile/jest.config.js:4-7.
- SQLite remnants: apps/mobile/package.json:27,34; apps/mobile/app.json:31.
- Exact CI: run 29186310426/jobs 86632921321 and 86632921324, zero steps.

### F. Files not fully reviewed and why

All source/config file paths in the requested roots were inventoried and targeted searches were run across them. Documentation was read in the mandated order, with deepest line review focused on binding phase/architecture/financial/security documents. Verbatim source materials under docs/99-sources and unrelated historical audit prose were not line-by-line revalidated because current requirements and accepted ADRs supersede them. Binary assets were inventoried but not visually inspected. Generated database.types.ts was inspected by schema/search rather than every generated line. Live database behavior, device rendering, and external financial spreadsheets were unavailable under the stop conditions.

### G. Working-tree protection note

Initial user/pre-existing changes are listed in §1. Dependency tooling subsequently created untracked .mcp.json and .pnpm-store/. Their timestamps are after the frozen initial capture. A verified, path-bounded cleanup command was attempted, but the environment rejected it because the approval/usage quota was exhausted. They are not source/test/status changes and are explicitly disclosed rather than misclassified as pre-existing. The audit report is the only intentional repository artifact created by the auditor.

### H. Late concurrent working-tree changes

After the report was first written, a separate process/user edit created or modified the following paths at approximately 13:33–13:37+03:00, well after the 12:38 initial freeze and after the audit’s main E1 batch began:

- packages/demo-data/package.json
- packages/demo-data/src/builders.ts
- packages/demo-data/src/builders.test.ts
- pnpm-lock.yaml
- apps/mobile/src/services/insight-evaluation-service.ts
- apps/mobile/src/services/**tests**/insight-evaluation-service.test.ts

No audit command wrote these files. They were preserved and inspected. The changes add a demo-data runtime dependency on finance-engine, derive seeded insight hashes/params by running the finance engine, and add an InsightEvaluationService plus three mobile tests. Late E1: demo-data and mobile no-emit typechecks both exit 0; the current mobile suite exits 0 with 29 suites/165 tests (and the same forced-worker-exit warning). A direct current demo-data Vitest attempt was Not Executed successfully because esbuild hit a sandbox directory-access error before loading vitest.config.ts; it is not classified as a code failure.

These changes do not alter the main verdict: the service is not mounted, no insight-center UI exists, personal mode remains blocked, Home remains placeholder-based, and the finance/CI gates remain red. They do change Phase 7 from wholly “not started” to “partially complete at an unintegrated service level.” They also introduce F-16: demo-data now depends on finance-engine while finance-engine has a development dependency on demo-data, and the new seed test derives its expected trigger values from the same engine under test.
