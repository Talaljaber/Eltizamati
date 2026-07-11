# Eltizamati Implementation Plan (Master)

**Created:** 2026-07-11 · **Owner:** Principal architect (this document) + one primary coding agent per phase
**Live position:** [docs/10-implementation/STATUS.md](../10-implementation/STATUS.md) (always read that first)
**Phase files:** [docs/10-implementation/phases/](../10-implementation/phases/)
**Architecture baseline:** [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md) (Supabase-first) over the unchanged ADR-0001/0003/0004/0005/0007/0008/0009/0010/0011/0014/0015 stack.

---

## 1. Selected phase count: 9 — and why

**9 phases.** The deciding factor is the Supabase surface: schema/RLS/pgTAP foundation (pure backend, verifiable with zero app code) and auth/repositories/app-integration (client-side, verifiable only through the running app) have different skills, different verification methods, and a hard one-way dependency. Combining them (the 8-phase option) would create the single largest and riskiest phase in the plan — the first network/auth surface of the project fused with its own schema design — too big for one agent session chain to execute and one reviewer to check. Splitting anything else instead would be worse: the demo-mode phase, engine phase, and loan-journey phase are each already cohesive single domains.

- **Why not fewer (≤7):** would force either domain-contracts+schema+Supabase into one phase (schema drift risk the plan explicitly exists to prevent) or engine+loan-UI into one (mixing pure-function/vector work with screen work destroys independent verifiability).
- **Why not more (≥10):** every remaining phase has one owner-domain and one exit demo; splitting any of them would add process overhead (more completion reports, more handoffs) without reducing risk. No artificial documentation-only phase is included.

### Old M0–M8 → new phases (not a rename — SQLite work is deleted, Supabase moves from late to foundational)

| Old milestone | Disposition in new plan |
|---|---|
| M0 Foundation | **Phase 1** (minus all SQLite/Drizzle items — removed from MVP per ADR-0017; CI, tests, nav loose ends, i18n persistence in) |
| M1 Demo data & dashboard | Domain core → **Phase 2**; seed builders, onboarding, Home/Obligations → **Phase 5** |
| M2 Loan detail & histories | Loan detail/histories → **Phase 7**; Murabaha/card detail + glossary → **Phase 8** |
| M3 Engine ⭐ | Formulas/vectors/property tests → **Phase 6**; rate-impact/explain/insights UI → **Phase 7** |
| M4 Scenario planner ⭐ | **Phase 7** |
| M5 Manual entry & settings | **Phase 8** |
| M6 Backend & identity | Design → **Phase 2**; schema/RLS/pgTAP → **Phase 3**; auth/repos/integration → **Phase 4**; mock-connect → **Phase 8** (cuttable) |
| M7 Engagement depth | **Phase 8** (card simulator, notifications, thresholds, duplicate detection — all with cut lines); two-numbers hero → **Phase 7** |
| M8 Hardening & polish | **Phase 9** |

## 2. Current project position

Mid–Phase 1. The [current-state audit](../10-implementation/CURRENT_STATE.md) (2026-07-11) found: solid uncommitted foundation work (corrected 3-tab navigation, spec-exact `ObligationStatus`, design-system primitives, tooling fixes) sitting **uncommitted** on top of `origin/main`; `pnpm check` failing at `format:check` (line endings) and `test:app` (no mobile tests); no persistence, no CI, no Supabase, engine scaffold-only, demo-data placeholder-only. **Nothing below Phase 1 has started.** Phase 1 must not be marked complete on the strength of the existing uncommitted code — it closes only when verified, tested, and committed.

## 3. Architecture summary (binding for every phase)

- **Demo mode:** bundled deterministic seed (`packages/demo-data`, `DEMO_DATE = 2026-07-01`) → in-memory demo repositories → same domain + finance engine. No auth, no network, no database. Resettable. Always banner-labeled.
- **Personal mode:** Supabase-only persistence (Postgres + Auth + RLS + generated types) behind the same repository interfaces, selected at the composition root by `dataMode`. Requires sign-in. Non-null `user_id` everywhere; RLS in the creating migration; pgTAP cross-user tests.
- **Source-of-truth rule:** Supabase for personal mode; seed builders for demo mode; the engine derives and never stores; device key-value holds only non-financial preferences.
- **SQLite:** future scope only — [FUTURE_LOCAL_FIRST_ROADMAP.md](FUTURE_LOCAL_FIRST_ROADMAP.md). No phase may create local database schema, Drizzle config, or migrations.
- **Offline:** demo mode fully offline by construction; personal mode surfaces honest offline/error/retry states — no offline editing, no queued financial mutations, no sync engine.

## 4. Phase map

| # | Phase (file) | One-line objective | Status |
|---|---|---|---|
| 1 | [PHASE-01-stabilize-foundation](../10-implementation/phases/PHASE-01-stabilize-foundation.md) | Verify, finish, test, and **commit** the existing foundation; green `pnpm check`; CI | **In Progress** |
| 2 | [PHASE-02-domain-contracts-and-schema-design](../10-implementation/phases/PHASE-02-domain-contracts-and-schema-design.md) | Complete every domain entity/VO/invariant; freeze the Supabase schema + RLS design on paper | Planned |
| 3 | [PHASE-03-supabase-schema-and-security](../10-implementation/phases/PHASE-03-supabase-schema-and-security.md) | `supabase/` migrations, tables, constraints, RLS-in-creating-migration, pgTAP green, generated types | Planned |
| 4 | [PHASE-04-auth-repositories-and-integration](../10-implementation/phases/PHASE-04-auth-repositories-and-integration.md) | Email auth end-to-end, Supabase repositories, TanStack Query foundation, composition root, account deletion, offline/error states | Planned |
| 5 | [PHASE-05-demo-mode-and-first-experience](../10-implementation/phases/PHASE-05-demo-mode-and-first-experience.md) | Seed builders + in-memory demo repos + onboarding/mode-selection + populated Home/Obligations, airplane-mode verified | Planned |
| 6 | [PHASE-06-finance-engine](../10-implementation/phases/PHASE-06-finance-engine.md) | All MVP formulas implemented, vectors + property tests + real coverage gate, CalculationRun persistence | Planned |
| 7 | [PHASE-07-loan-journey](../10-implementation/phases/PHASE-07-loan-journey.md) | The complete primary demo story: loan detail → rate history/impact → residual → explanation → scenario | Planned |
| 8 | [PHASE-08-remaining-mvp-flows](../10-implementation/phases/PHASE-08-remaining-mvp-flows.md) | Murabaha/card detail, manual entry, insights center, Learn, settings/data-status, cuttable depth (card sim, notifications, mock-connect) | Planned |
| 9 | [PHASE-09-hardening-and-release](../10-implementation/phases/PHASE-09-hardening-and-release.md) | E2E, device/Arabic/a11y/offline validation, security pass, Sentry, EAS preview APK, rehearsals | Planned |

## 5. Hard dependencies

- **1 → everything:** no phase starts until the working tree is committed and `pnpm check` is green.
- **2 → 3:** migrations may not be written against unresolved domain contracts (schema-drift guard).
- **3 → 4:** repositories need tables + RLS + generated types.
- **2 → 5:** seed builders need the completed domain entities (Payment, RatePeriod, provenance). **5 does not need 3/4** — demo mode has no Supabase dependency (parallel track).
- **2 → 6:** engine needs final domain contracts; **6 does not need 3/4/5 to start** (pure functions), but its CalculationRun-persistence integration lands against 4/5 repositories.
- **5 + 6 → 7:** the loan journey renders engine output over seeded data.
- **7 → 8:** shared primitives/patterns (detail-screen shape, explain sheet) are established in 7.
- **4 + 8 → 9:** hardening validates the full surface.
- **Vectors:** TV-1xx/2xx analytical vectors gate Phase 6 exit; TV-30x finance sign-off gates Phase 7 exit (numbers judges see).
- **RES-003 (PDPL):** gates storing real personal data in Phase 4+ — synthetic/test accounts until cleared.

## 6. Parallel work tracks

- **Track A (backend):** Phase 3 → 4.
- **Track B (product):** Phase 5, and Phase 6 formula work — both may run concurrently with Track A once Phase 2 closes (different files, no shared state; demo mode never touches Supabase).
- Inside phases: design-system primitives are built just-in-time by the phase that needs them; mobile test-writing parallels feature work.
- Convergence: Phase 7 requires 5+6; Phase 8's personal-mode flows require 4.

## 7. Critical demo path

**Phase 1 → 2 → 5 → 6 → 7.** That alone yields the scripted airplane-mode demo (onboard → populated dashboard → loan → rate impact → residual → explanation → scenario → bank questions, AR+EN). Phases 3–4 (personal mode) and Phase 8's depth items are additive to the story; Phase 9 is the polish/verification gate on whatever has landed.

## 8. Cut order (first cut first)

1. Mock-connect flow (SCR-CONNECT-MOCK, US-017)
2. Card payoff simulator (SCR-SIM-CARD, `cardPayoff.v1`, US-013) — *canonical classification: MVP-conditional*
3. Local notifications + user-defined threshold insight + reminder settings
4. Duplicate-payment detection
5. Biometric app-lock
6. Personal mode as a *demonstrated* beat (auth/backend stay built, drop from the demo script)
7. **Never cut:** demo spine (Phases 5–7 output), engine vectors/coverage, provenance badges, AR/EN parity, honest labeling.

## 9. Global validation gates (every phase)

1. Existing working code is inspected before replacement — never recreate blindly.
2. `pnpm check` green (all five sub-checks) at phase exit, run from a clean shell.
3. Every new user-visible string lands in **both** `en.json` and `ar.json` in the same change.
4. New screens implement loading / empty / error / limited states where applicable (state matrix).
5. No financial logic in UI components/hooks/routes; engine/domain services only.
6. No unsafe JS `number` arithmetic on money — `Money`/`Rate` VOs only.
7. Finance functions deterministic, explicit `asOf`, no clock/network/randomness.
8. Material financial values carry provenance (`Amount` primitive; type-enforced).
9. Supabase user tables: **non-null `user_id`**; **RLS enabled in the creating migration**; pgTAP cross-user tests mandatory before the phase closes.
10. Demo mode never requires Supabase or network; personal mode never pretends to work offline.
11. Mock providers visibly labeled — always.
12. No device/emulator/RTL validation claim without recorded evidence (command output, screenshot, or recording).
13. Documentation updated in the same change as behavior (including `STATUS.md`).
14. A completion report at `docs/10-implementation/completions/PHASE-N-COMPLETION.md` with real verification evidence is mandatory before the next phase starts.
15. No agent commits without reviewing `git status` for unintended/secret files; **no push or merge without explicit user approval.**

## 10. Documentation update protocol

- `STATUS.md` is updated at every session end and at every phase state change (it is the live source of truth; `docs/10-implementation/status-m0-session-log.md` is the pre-plan historical log).
- A phase file's Status header changes only with evidence: In Progress needs a named session; Complete needs the completion report.
- Spec changes discovered mid-phase: fix the spec doc in the same change, or file a `DOC-ISSUE:` line in the completion report — never silently diverge (AI_AGENT_RULES §D).
- ADR-worthy decisions made mid-phase get an ADR in the same change (next free number; ADR-0018 onward).

## 11. Agent handoff protocol

An implementation agent starting a session must read, in order: (1) `docs/10-implementation/STATUS.md`, (2) the active phase file, (3) the docs that phase file lists under "Architecture Decisions Applied", (4) `AI_AGENT_RULES.md`. It implements only In-Scope items, runs the phase's verification commands, updates `STATUS.md` (and the completion report if closing the phase), and stops at the phase boundary. Anything Out-of-Scope discovered as necessary → record as a blocker in `STATUS.md`, don't build it.

## 12. Traceability matrix (requirement → owning phase)

Ownership = the phase that implements it. Validation may repeat in Phase 9 without transferring ownership.

| Requirement / artifact | IDs | Owning phase |
|---|---|---|
| Repo/tooling/CI foundation, mobile shell, i18n/RTL wiring, base primitives | NFR-MNT-*, NFR-L10N-002, ADR-0001/0003/0005/0010 | 1 |
| Language persistence + language screen entry | FR-ONB-001, US-001 AC-1 | 1 |
| Domain entities/VOs/invariants complete | BR-OBL-001..003, BR-RATE-001, BR-STAT-001..003, domain-model.md §2–5 | 2 |
| Supabase schema + RLS design freeze, repository interfaces, deletion contract | ADR-0008/0017, database-schema.md | 2 |
| Migrations, tables, constraints, RLS, pgTAP, generated types | NFR-SEC-002, T-05 | 3 |
| Email auth, sessions, SecureStore | FR-AUTH-001/006, US-016, NFR-SEC-003, T-03/T-04, SCR-AUTH-SIGNIN/SIGNUP/RESET | 4 |
| Supabase repositories, TanStack Query, composition root, error/offline states | ADR-0004/0014, api-and-providers.md §1 | 4 |
| Server-backed consent, account deletion + audit | FR-AUTH-002/003, NFR-PRIV-002/003 | 4 |
| Biometric app-lock | FR-AUTH-004 | 4 (cut #5) |
| Seed builders, DemoSeedProvider + ImportService, demo repositories, reset | mvp-scope §4, seed-demo-data.md, FR-SET-005, ADR-0009 | 5 |
| Onboarding, mode selection, demo banner | FR-ONB-001..006, US-001, SCR-ONB-* | 5 |
| Home dashboard + obligations list (+ `aggregates.v1` consumption) | FR-OBL-001/002, FR-CALC-006, US-002, SCR-HOME, SCR-OBL-LIST | 5 |
| All 8 formulas, vectors, property tests, coverage gate, refusal/confidence | FR-CALC-001..006, BR-CALC-*, INV-1..7, TV-1xx/2xx/4xx/5xx/6xx/7xx, ADR-0007 | 6 |
| CalculationRun persistence | FR-CALC-005 | 6 (integration with 4/5 repos) |
| Loan detail + two-numbers hero | FR-OBL-003, US-003/009, SCR-OBL-DETAIL-LOAN | 7 |
| Rate history/impact, residual, explanation, schedule, bank questions | FR-RATE-001..004, BR-CALC-012/013, SCR-RATE-HIST/IMPACT, SCR-EXPLAIN, SCR-OBL-SCHEDULE, SCR-BANK-QUESTIONS | 7 |
| Scenario planner | FR-SIM-001..003, US-004, SCR-SIM-LOAN, TV-304 | 7 |
| Core insight rules + insights center | FR-INS-001..004, US-012, SCR-INS-CENTER | 7 |
| TV-30x finance sign-off | calculation-test-vectors.md TV-3xx | gates 7 exit |
| Murabaha + card detail, terminology | FR-OBL-004/005, US-007/008, BR-TERM-001, SCR-OBL-DETAIL-MURABAHA/CARD | 8 |
| Manual add/edit/archive, log payment/rate | FR-OBL-006..008, FR-PAY-001..003/005, FR-RATE-002, US-005/006, SCR-OBL-ADD-*, SCR-PAY-*, SCR-RATE-ADD | 8 |
| Settings, data-status, legal docs, Learn/education | FR-SET-001..003/005, FR-DATA-003, FR-EDU-001..004, US-010/011, SCR-SET, SCR-DATA-STATUS, SCR-LEGAL-DOC, SCR-LEARN* | 8 |
| Card payoff simulator | FR-SIM-004, US-013, SCR-SIM-CARD, TV-6xx | 8 (cut #2) |
| Notifications + thresholds + duplicate detection | FR-NTF-001, FR-SET-006, FR-INS-001(user), FR-PAY-004 | 8 (cuts #3/#4) |
| Mock connect flow | FR-ONB-004(connect), FR-AUTH-005, US-017, SCR-CONSENT-PROVIDER, SCR-CONNECT-MOCK | 8 (cut #1) |
| E2E, device/AR/a11y/perf/security validation, Sentry, EAS, APK, rehearsal | NFR-PERF-*, NFR-A11Y-*, NFR-REL-001, ADR-0015, mvp-scope §5 | 9 |

**Flags:** `FR-SET-004`/`FR-SIM-005` (export, saved scenarios) — stretch, unassigned by design · `FR-AUTH-007`, `FR-OBL-009/010`, `FR-NTF-002` — P1, unassigned · TV-30x/TV-104/TV-203/TV-601 — **awaiting finance validation** (`PENDING-FINANCE`) · US-017/mock-connect — **cuttable** · card simulator — **MVP-conditional** (reconciled 2026-07-11; was inconsistently "MVP" vs "stretch target" across docs) · no requirement found assigned to two owning phases.

## 13. Risk register summary (delta vs `roadmap-and-risks.md`)

- **NEW — Supabase early dependency:** first network/auth surface moves to the foundation. Mitigated by the 3/4 split, local `supabase start` for dev, and the demo path's total independence from it.
- **NEW — personal mode offline gap:** accepted, stated posture (honest error states); demo mode is the offline story.
- **REDUCED — dual-persistence drift:** eliminated (one schema).
- **UNCHANGED — RISK-001 (wrong figure):** vectors + sign-off gates intact; **RISK-005 (demo-day failure):** airplane-mode demo intact, now database-free.
- **CARRIED — no Android device/emulator in the dev environment:** device validation deferred to Phase 9 gates; no phase may claim it meanwhile.

## 14. Release definition

Release = mvp-scope §5 demo-ready gate: preview APK built ≥48h early on 2 devices; scripted demo rehearsed ×3 (once airplane-mode, once Arabic); TV-30x signed; provenance/demo-banner honesty verified in the judged build; fallback recording captured; `pnpm check` + engine coverage green; Phase 9 completion report filed.
