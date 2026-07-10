# Eltizamati — التزاماتي

**One clear, understandable view of all your financial obligations — what you owe, what changed, what it costs, and what your choices do about it.**

Jordan-first, MENA-ready mobile app for tracking and _understanding_ loans, Islamic financing, and credit cards: rate changes, financing cost, repayment progress, residual-balance ("balloon") risk, and honest what-if scenarios. Built for the Rally Fintech Hackathon; architected to keep living after it.

> Eltizamati is not a bank, credit bureau, or financial adviser. It explains and estimates — clearly labeling every figure as official, user-entered, or estimated — and never claims to modify contracts or guarantee outcomes.

## Current status (2026-07-10)

**Phase: engineering knowledge base complete — implementation not yet started.**
The repository currently contains the full documentation and decision system that any engineer or AI agent needs to build the product without additional context. First implementation milestone: **M0** (see below).

**Update (2026-07-10):** the supporting architecture doc (SRC-3) and UI blueprint (SRC-4) were supplied and [delta-audited](docs/00-audit/00-source-audit.md). With the hackathon confirmed at **~3 weeks**, scope expanded to include **email auth, Supabase backend + RLS, versioned consent, local notifications, the card payoff simulator, and a labeled-mock connect flow** — all as week-3 work **off the critical demo path** (the scripted demo stays airplane-mode-safe). See [ADR-0016](docs/09-decisions/ADR-0016-backend-auth-activation.md), the [3-week plan](docs/08-delivery/hackathon-plan.md), and [MVP scope](docs/01-requirements/mvp-scope.md). No load-bearing architectural decision changed.

## Quick links

| I want to…                                                | Go to                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Understand the whole documentation set                    | [`docs/INDEX.md`](docs/INDEX.md)                                                                                                         |
| See what was audited/challenged in the original materials | [`docs/00-audit/`](docs/00-audit/00-source-audit.md)                                                                                     |
| Know exactly what the hackathon MVP is                    | [`docs/01-requirements/mvp-scope.md`](docs/01-requirements/mvp-scope.md)                                                                 |
| Understand the architecture & stack                       | [`docs/04-architecture/system-architecture.md`](docs/04-architecture/system-architecture.md) + [ADRs](docs/09-decisions/adr-template.md) |
| Check the financial math rules                            | [`docs/03-domain/financial-calculation-spec.md`](docs/03-domain/financial-calculation-spec.md)                                           |
| Start implementing (agents)                               | [`AI_AGENT_RULES.md`](AI_AGENT_RULES.md) → [`docs/08-delivery/first-slice-prompt.md`](docs/08-delivery/first-slice-prompt.md)            |
| Approve pending product decisions                         | [`docs/08-delivery/decision-memo.md`](docs/08-delivery/decision-memo.md)                                                                 |
| Validate calculations (finance teammates)                 | [`docs/03-domain/calculation-test-vectors.md`](docs/03-domain/calculation-test-vectors.md)                                               |

## Stack (decided — rationale in `docs/09-decisions/`)

Expo (React Native) + TypeScript strict · pnpm monorepo (`apps/mobile` + `packages/{domain, finance-engine, demo-data}`) · Expo Router · TanStack Query + Zustand · expo-sqlite + Drizzle (system of record for the offline demo) · i18next (Arabic/English, RTL from day one) · decimal.js-backed `Money`/`Rate` value objects · Vitest + fast-check / Jest + RNTL / Maestro · GitHub Actions + EAS Build · Sentry. **Supabase (Postgres + RLS + Auth + Edge Functions) is activated during the three-week build (M6, ADR-0016)** as a real secondary capability — email auth, versioned consent, cloud persistence with RLS-from-first-migration — while the scripted demo runs local-first in airplane mode. CRIF/Open Banking ship as a **labeled mock** (real access is post-hackathon).

## Local setup

Implementation starts at M0; once it lands this section will contain the verified commands (target: `pnpm install && pnpm check && pnpm dev` — see [`CONTRIBUTING.md`](CONTRIBUTING.md)).

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
