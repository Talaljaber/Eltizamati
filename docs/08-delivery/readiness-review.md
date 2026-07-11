# Implementation Readiness Review (Phase 6)

> **⚠ Superseded as the current readiness statement (2026-07-11).** This review predates [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md) (Supabase-first, no SQLite in MVP) and the M0→phase restructuring. The live position is **[docs/10-implementation/STATUS.md](../10-implementation/STATUS.md)**; the execution plan is [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Retained for its scorecard/blocker history. Note RES-003 (PDPL) now gates **Phase 4** (first real personal data), earlier than this review assumed.

**Date:** 2026-07-10 · **Verdict: READY to begin M0**, with the blockers/dependencies below tracked (none block M0–M2).

**Amendment 2026-07-10 (SRC-3/4 delta-audit + three-week timeline):** SRC-3/4 supplied and audited (`00-audit/00-source-audit.md §7`); source completeness upgraded 🟡→🟢 (deck still pending). Scope expanded for a three-week build (auth, Supabase backend, consent records, local notifications, card simulator, duplicate detection, mock-connect flow — ADR-0016), all as **week-3 work off the critical demo path**. The M0 first slice and the demo-spine sequencing are **unchanged**. New guardrail: the scripted demo stays airplane-mode-safe (mvp-scope §5a).

## 1. Readiness scorecard

| Dimension                             | Score            | Evidence / gap                                                                                                                                                                                                                           |
| ------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product clarity (problem, story, MVP) | 🟢               | Sharp value prop + scope table + change control (`mvp-scope.md`)                                                                                                                                                                         |
| Requirements traceability             | 🟢               | FR/NFR/US/SCR/BR/TV cross-referenced; matrix in `hackathon-plan.md §3`                                                                                                                                                                   |
| Domain & calculation spec             | 🟢 (with caveat) | Formulas, conventions, refusal rules, invariants specified; **TV-30x expectations pending finance teammates** (blocks M3 exit, not start)                                                                                                |
| Architecture decisions                | 🟢               | ADR-0001…0015 with alternatives + reversal costs                                                                                                                                                                                         |
| UX specification                      | 🟢               | IA, 22 screens with states, design-system contracts, content rules                                                                                                                                                                       |
| Security/privacy                      | 🟢               | Threat model with accepted-risk honesty; controls mechanized where possible                                                                                                                                                              |
| Delivery plan                         | 🟢               | Three-week calendar (M0–M8) with exit demos, cut lines, demo script + fallbacks                                                                                                                                                          |
| Source completeness                   | 🟢               | SRC-3/4 supplied and delta-audited (`00-source-audit.md §7`); only SRC-5 (deck) outstanding                                                                                                                                              |
| Backend/auth readiness                | 🟢 (with caveat) | Schema + RLS + auth/consent already designed (docs/05, docs/06, ADR-0002/0016); M6 is activation, not design. **Caveat:** first real network/auth surface in the project — treat M6 as the highest new-integration risk after the engine |
| External validations                  | 🟡               | RES-001 (judging rules), RES-009 (Arabic review), RES-003 (PDPL — now more weight since real accounts + consent ship), TV-30x sign-off outstanding                                                                                       |
| Team workflow for non-devs            | 🟢               | Vectors as JSON + content files + decision memo = teammate-editable surfaces                                                                                                                                                             |

## 2. Blockers & their owners (none block starting)

| Item                                         | Blocks                                                          | Owner                               |
| -------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| TV-30x expected values (finance spreadsheet) | M3 _exit_                                                       | Finance teammates (structure ready) |
| RES-009 Arabic native review                 | M8 demo freeze                                                  | Product teammate                    |
| RES-001 judging rules                        | final scope trim                                                | Talal                               |
| RES-010 pre-work permissibility              | repo usage at event                                             | Talal (**check first**)             |
| RES-003 PDPL/consent legal review            | M6 (real accounts + consent now ship) — elevated from post-demo | Talal + legal teammate              |
| RES-002 real CRIF/OB access                  | only affects the _real_ provider (mock ships regardless)        | Talal                               |
| DEC-001…005 sign-off                         | nothing (defaults apply)                                        | Team                                |

## 3. Assumptions permitted for the prototype

ASM-003/005/007/008/009/011 (registry `assumptions-validation-backlog.md`) — each surfaces in-product as assumption notes where user-visible. Production gate: none may remain unvalidated.

## 4. Validated-by-design decisions

Airplane-mode demo (ASM-013) · type-gated Islamic math (BR-CALC-020 via ADR-0008) · provenance-mandatory rendering (design-system `Amount`) · append-only rate history (BR-RATE-001).

## 5. First implementation slice (exact)

**M0 as specified in `hackathon-plan.md`**, in this order:

1. Scaffold monorepo (structure from `system-architecture.md §7`), pnpm, TS strict, eslint+prettier+dependency-cruiser configs, CI workflow.
2. Expo app with Expo Router: 3 tabs + placeholder screens; dev build with MMKV.
3. i18n foundation (ADR-0010): locale files EN/AR, RTL flip flow, language screen.
4. Design tokens + `Screen/Text/Button/Card` primitives with tests.
5. SQLite+Drizzle: first migration = `obligations` core + `user_preferences`; in-memory integration test.
6. Sentry (preview profile), README quickstart, `pnpm check` green.

**Exit:** bilingual shell on a physical Android device from a fresh clone; CI green. This is also ADR-0001's validation gate — RTL/tooling friction reopens the framework question _now, cheaply_.

## 6. Prompt for the first coding agent

See `first-slice-prompt.md` (copy-paste ready), which binds the agent to `AI_AGENT_RULES.md`.
