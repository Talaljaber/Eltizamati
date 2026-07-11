# Eltizamati — التزاماتي

**One clear, understandable view of all your financial obligations — what you owe, what changed, what it costs, and what your choices do about it.**

Jordan-first, MENA-ready mobile app for tracking and _understanding_ loans, Islamic financing, and credit cards: rate changes, financing cost, repayment progress, residual-balance ("balloon") risk, and honest what-if scenarios. Built for the Rally Fintech Hackathon; architected to keep living after it.

> Eltizamati is not a bank, credit bureau, or financial adviser. It explains and estimates — clearly labeling every figure as official, user-entered, or estimated — and never claims to modify contracts or guarantee outcomes.

## Current status (2026-07-11)

**Phase: implementation in progress — Phase 1 (Stabilize the foundation) of a 9-phase plan.**
Live status: **[docs/10-implementation/STATUS.md](docs/10-implementation/STATUS.md)** · Execution plan: **[docs/08-delivery/IMPLEMENTATION_PLAN.md](docs/08-delivery/IMPLEMENTATION_PLAN.md)** · Current-state audit: [docs/10-implementation/CURRENT_STATE.md](docs/10-implementation/CURRENT_STATE.md).

**Architecture update (2026-07-11, [ADR-0017](docs/09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** the MVP is **Supabase-first** — personal mode requires a Supabase account and persists exclusively to Supabase (Postgres + Auth + RLS); **SQLite is postponed post-MVP** ([roadmap](docs/08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)); demo mode runs from bundled deterministic in-memory seed data and stays fully offline (the scripted demo remains airplane-mode-safe). Supersedes the local-first MVP framing of ADR-0006/0013 and the timing of ADR-0002/0012/0016.

**Update (2026-07-10):** the supporting architecture doc (SRC-3) and UI blueprint (SRC-4) were supplied and [delta-audited](docs/00-audit/00-source-audit.md). With the hackathon confirmed at **~3 weeks**, scope expanded to include **email auth, Supabase backend + RLS, versioned consent, local notifications, the card payoff simulator, and a labeled-mock connect flow**. See [ADR-0016](docs/09-decisions/ADR-0016-backend-auth-activation.md) (now superseded in sequencing by ADR-0017) and [MVP scope](docs/01-requirements/mvp-scope.md).

## Quick links

| I want to…                                                | Go to                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **See where implementation stands right now**             | [`docs/10-implementation/STATUS.md`](docs/10-implementation/STATUS.md)                                                                   |
| **Read the phase-based implementation plan**              | [`docs/08-delivery/IMPLEMENTATION_PLAN.md`](docs/08-delivery/IMPLEMENTATION_PLAN.md) → [phase files](docs/10-implementation/phases/)     |
| Understand the whole documentation set                    | [`docs/INDEX.md`](docs/INDEX.md)                                                                                                         |
| See what was audited/challenged in the original materials | [`docs/00-audit/`](docs/00-audit/00-source-audit.md)                                                                                     |
| Know exactly what the hackathon MVP is                    | [`docs/01-requirements/mvp-scope.md`](docs/01-requirements/mvp-scope.md)                                                                 |
| Understand the architecture & stack                       | [`docs/04-architecture/system-architecture.md`](docs/04-architecture/system-architecture.md) + [ADRs](docs/09-decisions/adr-template.md) |
| Check the financial math rules                            | [`docs/03-domain/financial-calculation-spec.md`](docs/03-domain/financial-calculation-spec.md)                                           |
| Start implementing (agents)                               | [`AI_AGENT_RULES.md`](AI_AGENT_RULES.md) → [`docs/08-delivery/first-slice-prompt.md`](docs/08-delivery/first-slice-prompt.md)            |
| Approve pending product decisions                         | [`docs/08-delivery/decision-memo.md`](docs/08-delivery/decision-memo.md)                                                                 |
| Validate calculations (finance teammates)                 | [`docs/03-domain/calculation-test-vectors.md`](docs/03-domain/calculation-test-vectors.md)                                               |

## Stack (decided — rationale in `docs/09-decisions/`)

Expo (React Native) + TypeScript strict · pnpm monorepo (`apps/mobile` + `packages/{domain, finance-engine, demo-data}`) · Expo Router · TanStack Query + Zustand · **Supabase (Postgres + RLS + Auth) as the MVP persistence for personal-mode data (ADR-0017)** · bundled in-memory deterministic seed data for the offline demo mode · i18next (Arabic/English, RTL from day one) · decimal.js-backed `Money`/`Rate` value objects · Vitest + fast-check / Jest + RNTL / Maestro / pgTAP · GitHub Actions + EAS Build · Sentry. SQLite/local-first is **post-MVP** ([roadmap](docs/08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md)). CRIF/Open Banking ship as a **labeled mock** (real access is post-hackathon). The scripted demo runs in demo mode, in airplane mode, always.

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run quality checks (types, format, lint, tests)
pnpm run ci:check

# 3. Start the mobile app
cd apps/mobile
pnpm start
```

For detailed contribution guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentation map

```
docs/
├── INDEX.md            ← start here
├── 00-audit/           source audit, critique & challenged decisions
├── 00-product/         vision, personas, glossary, assumptions
├── 01-requirements/    FR/NFR, MVP scope, user stories
├── 02-ux/              IA, screens & states, design system, content rules
├── 03-domain/          domain model, calculation spec, test vectors, provenance
├── 04-architecture/    system architecture, providers, offline, mobile primer
├── 05-data-api/        schemas (local + Supabase), contracts, seed data
├── 06-security-privacy/ threat model, controls
├── 07-quality-operations/ testing, CI/CD, observability
├── 08-delivery/        hackathon plan, risks, decisions needed, readiness
├── 09-decisions/       ADR-0001…0015
└── 99-sources/         original brief & prompt (verbatim)
```

Governance: [`AI_AGENT_RULES.md`](AI_AGENT_RULES.md) · [`CODE_REVIEW_CHECKLIST.md`](CODE_REVIEW_CHECKLIST.md) · [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md)
