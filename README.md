# Eltizamati — التزاماتي

**One clear, honest view of everything you owe — what changed, what it costs, and what your choices actually do about it.**

Eltizamati is a Jordan-first, MENA-ready mobile app for tracking and *understanding* financial obligations: loans, Islamic (Murabaha) financing, and credit cards. It surfaces rate changes, real financing cost, repayment progress, residual-balance ("balloon") risk, and honest what-if scenarios — every figure labeled as official, user-entered, or estimated, never blurred together.

> Eltizamati is not a bank, credit bureau, or financial adviser. It explains and estimates; it never modifies contracts or guarantees outcomes.

Built for the Rally Fintech Hackathon and architected to keep living past it.

---

## What's in this repository

A pnpm monorepo with two applications and three shared packages:

| Path | What it is |
| --- | --- |
| [`apps/mobile`](apps/mobile) | The Eltizamati app — Expo/React Native, TypeScript, Arabic/English with full RTL support |
| [`apps/bank-simulator-dashboard`](apps/bank-simulator-dashboard) | A web dashboard simulating a bank's loan-application review queue, used for the labeled-mock "connect to your bank" flow |
| [`packages/domain`](packages/domain) | Framework-free domain model: value objects (`Money`, `Rate`), typed errors, invariants |
| [`packages/finance-engine`](packages/finance-engine) | Amortization, payoff, and scenario math — decimal-precise, unit-tested against known vectors |
| [`packages/demo-data`](packages/demo-data) | Deterministic, bundled seed data powering the fully-offline demo mode |

## Core features

- **Unified obligations view** — loans, Murabaha financing, and credit cards in one place, each shown with its real cost, not just a balance.
- **Rate-change tracking & impact** — when a bank changes a rate, Eltizamati shows exactly what that costs going forward.
- **What-if scenarios** — simulate an extra payment or a payoff strategy before touching real money.
- **Loan applications** — apply to a simulated bank, track status, and see the outcome reflected in your obligations.
- **Learn** — a glossary, comparison tool, and an AI assistant that answers financing questions and is explicit about what it doesn't know.
- **Demo mode** — a fully offline, seeded experience for demos and reviews; no account or network required.
- **Personal mode** — real accounts backed by Supabase (Postgres + Row-Level Security + Auth), with versioned consent and local notifications.

## Status

Live, continuously-updated status: **[docs/10-implementation/STATUS.md](docs/10-implementation/STATUS.md)**
Phase-based delivery plan: **[docs/08-delivery/IMPLEMENTATION_PLAN.md](docs/08-delivery/IMPLEMENTATION_PLAN.md)** → [individual phase files](docs/10-implementation/phases/)

The mobile app, Supabase backend, loan-application flow, and bank simulator dashboard are implemented and covered by an automated test suite. Release-hardening work (Sentry observability, deep-link allow-listing, a structured logger, EAS build profiles, Maestro E2E flows) is implemented and gated; physical-device rehearsal, a funded EAS/Sentry account, and the judged demo run remain open — see [`docs/10-implementation/completions/PHASE-9-COMPLETION.md`](docs/10-implementation/completions/PHASE-9-COMPLETION.md) for the exact list.

## Architecture at a glance

- **Client:** Expo (React Native) + TypeScript strict, Expo Router, TanStack Query + Zustand, i18next (Arabic/English, RTL from day one), decimal.js-backed `Money`/`Rate` value objects.
- **Backend:** Supabase — Postgres with Row-Level Security, Auth (password + email-verification-code sign-up), and an Edge Function (`learn-assistant`) for the AI-backed Learn feature, keys server-side only.
- **Demo mode:** runs entirely from bundled, deterministic in-memory seed data — no network, works in airplane mode.
- **Observability:** Sentry, release builds only, with a scrubbing layer that strips personal/financial data before anything leaves the device ([ADR-0015](docs/09-decisions/ADR-0015-observability.md)).
- **Testing:** Jest + React Native Testing Library (mobile), Vitest + fast-check (domain/finance-engine), pgTAP (database), Maestro (E2E flows).

Full rationale for every major decision lives in [`docs/09-decisions/`](docs/09-decisions) as ADRs; the definitive architecture write-up is [`docs/04-architecture/system-architecture.md`](docs/04-architecture/system-architecture.md).

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Run the full quality gate (types, lint, format, tests, dependency rules)
pnpm run check

# 3. Start the mobile app
cd apps/mobile
pnpm start
```

The mobile app runs in **demo mode** out of the box — no Supabase project or account needed to explore it. Personal mode requires a Supabase project; see [`apps/mobile/.env.example`](apps/mobile/.env.example) and [`docs/05-data-api/`](docs/05-data-api) for the schema and setup.

To run the bank simulator dashboard:

```bash
pnpm --filter bank-simulator-dashboard dev
```

For local Supabase development:

```bash
pnpm run supabase:start   # start local Supabase
pnpm run supabase:reset   # apply migrations + seed
pnpm run supabase:test    # run pgTAP database tests
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full contribution workflow.

## Quality gate

Every change is expected to pass, locally, before it merges:

```bash
pnpm run check   # format:check + lint + typecheck + depcruise + full test suite
```

There is currently no CI pipeline running this automatically (see [`docs/10-implementation/STATUS.md`](docs/10-implementation/STATUS.md) for why) — running `pnpm run check` locally before pushing is required.

## Documentation map

```
docs/
├── INDEX.md              ← start here
├── 00-audit/              source audit, critique & challenged decisions
├── 00-product/            vision, personas, glossary, assumptions
├── 01-requirements/       functional/non-functional requirements, MVP scope, user stories
├── 02-ux/                 information architecture, screens & states, design system
├── 03-domain/             domain model, calculation spec, test vectors, provenance rules
├── 04-architecture/       system architecture, providers, offline behavior, mobile primer
├── 05-data-api/           schemas (Supabase), contracts, seed data
├── 06-security-privacy/   threat model, security controls
├── 07-quality-operations/ testing strategy, CI/CD, observability
├── 08-delivery/           delivery plan, risks, decisions, readiness
├── 09-decisions/          architecture decision records (ADR-0001…)
├── 10-implementation/     live status, phase files, runbooks, completion reports
└── 99-sources/            original brief & prompt, verbatim
```

## Key references

| I want to… | Go to |
| --- | --- |
| See where implementation stands right now | [`docs/10-implementation/STATUS.md`](docs/10-implementation/STATUS.md) |
| Read the phase-based delivery plan | [`docs/08-delivery/IMPLEMENTATION_PLAN.md`](docs/08-delivery/IMPLEMENTATION_PLAN.md) |
| Understand the whole documentation set | [`docs/INDEX.md`](docs/INDEX.md) |
| Know exactly what the MVP scope is | [`docs/01-requirements/mvp-scope.md`](docs/01-requirements/mvp-scope.md) |
| Understand the architecture & stack | [`docs/04-architecture/system-architecture.md`](docs/04-architecture/system-architecture.md) + [ADRs](docs/09-decisions) |
| Check the financial math rules | [`docs/03-domain/financial-calculation-spec.md`](docs/03-domain/financial-calculation-spec.md) |
| Validate calculations | [`docs/03-domain/calculation-test-vectors.md`](docs/03-domain/calculation-test-vectors.md) |
| Review security posture | [`docs/06-security-privacy/security-controls.md`](docs/06-security-privacy/security-controls.md) |
| Run the demo | [`docs/10-implementation/runbooks/demo-runbook.md`](docs/10-implementation/runbooks/demo-runbook.md) |
| Contribute code | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## Governance

[`AI_AGENT_RULES.md`](AI_AGENT_RULES.md) · [`CODE_REVIEW_CHECKLIST.md`](CODE_REVIEW_CHECKLIST.md) · [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

Not yet licensed for external use or distribution. All rights reserved unless a `LICENSE` file states otherwise.
