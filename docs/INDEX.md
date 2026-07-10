# Eltizamati Engineering Knowledge Base — Index

**How to use:** every document is self-contained but cross-referenced by stable ids. Start with the README; agents start here + `AI_AGENT_RULES.md`.
**ID registry (where each id family is defined):** ASM/RES → `00-product/assumptions-validation-backlog.md` · DEC → `08-delivery/decision-memo.md` · CON/GAP → `00-audit/00-source-audit.md` · FR → `01-requirements/functional-requirements.md` · NFR → `01-requirements/non-functional-requirements.md` · US → `01-requirements/user-stories.md` · SCR/NAV → `02-ux/` · TERM → `00-product/glossary.md` · BR/INV/CONV → `03-domain/` · TV → `03-domain/calculation-test-vectors.md` · ADR → `09-decisions/` · RISK → `08-delivery/roadmap-and-risks.md` · PRIN/PER/JTBD → `00-product/`.

## 00-audit — Phase 1–2 outputs (read first for context)

- [Source audit: conflicts, gaps, classification, missing-docs notice](00-audit/00-source-audit.md)
- [Critique & recommendations: what was challenged and why](00-audit/01-critique-and-recommendations.md)

## 00-product

- [Vision, problem, goals, principles](00-product/vision-strategy.md)
- [Personas & jobs-to-be-done](00-product/personas-jtbd.md)
- [Glossary (bilingual, TERM ids)](00-product/glossary.md)
- [Assumptions & validation backlog (ASM/RES)](00-product/assumptions-validation-backlog.md)

## 01-requirements

- [Functional requirements (FR)](01-requirements/functional-requirements.md)
- [Non-functional requirements (NFR)](01-requirements/non-functional-requirements.md)
- [MVP scope, cut lines, demo data set](01-requirements/mvp-scope.md)
- [User stories, acceptance criteria, edge cases (US)](01-requirements/user-stories.md)

## 02-ux

- [Information architecture & navigation (NAV, DEC-002)](02-ux/information-architecture.md)
- [Screen inventory & state matrix (SCR)](02-ux/screen-inventory.md)
- [Design system "Calm Clarity" (tokens, primitives, RTL)](02-ux/design-system.md)
- [Content & terminology rules (tone, Islamic terminology, Arabic rules)](02-ux/content-terminology.md)

## 03-domain

- [Domain model (entities, VOs, status model, BR registry)](03-domain/domain-model.md)
- [Financial calculation specification (formulas, CONV, confidence, refusal)](03-domain/financial-calculation-spec.md)
- [Calculation test vectors (TV, validation workflow)](03-domain/calculation-test-vectors.md)
- [Data provenance & freshness (BR-PROV)](03-domain/data-provenance.md)

## 04-architecture

- [System architecture (context, layers, data flow, repo layout, naming)](04-architecture/system-architecture.md)
- [Provider abstraction & demo→real transition](04-architecture/provider-abstraction.md)
- [Offline/sync (local-only MVP; P1 design freeze)](04-architecture/offline-sync.md)
- [Mobile primer for web developers](04-architecture/mobile-primer-for-web-devs.md)

## 05-data-api

- [Database schema: local + Supabase, ERD, RLS](05-data-api/database-schema.md)
- [API & provider contracts (services now, HTTP at P1)](05-data-api/api-and-providers.md)
- [Seed & demo data architecture](05-data-api/seed-demo-data.md)

## 06-security-privacy

- [Threat model (T-ids, accepted risks)](06-security-privacy/threat-model.md)
- [Security & privacy controls, classification, retention, checklist](06-security-privacy/security-controls.md)

## 07-quality-operations

- [Testing strategy (pyramid, financial verification)](07-quality-operations/testing-strategy.md)
- [CI/CD, environments, release, observability, budgets](07-quality-operations/ci-cd-environments.md)

## 08-delivery

- [Hackathon plan: milestones, traceability, demo script](08-delivery/hackathon-plan.md)
- [Roadmap & risk register (RISK)](08-delivery/roadmap-and-risks.md)
- [Decision memo — needs humans (DEC)](08-delivery/decision-memo.md)
- [Readiness review & first slice](08-delivery/readiness-review.md)
- [First coding-agent prompt (M0)](08-delivery/first-slice-prompt.md)

## 09-decisions (ADRs)

[Template](09-decisions/adr-template.md) · [0001 Framework: Expo+TS](09-decisions/ADR-0001-cross-platform-framework.md) · [0002 Backend: Supabase deferred](09-decisions/ADR-0002-backend-supabase-deferred.md) · [0003 Monorepo](09-decisions/ADR-0003-monorepo-structure.md) · [0004 State mgmt](09-decisions/ADR-0004-state-management.md) · [0005 Expo Router](09-decisions/ADR-0005-navigation-expo-router.md) · [0006 Persistence](09-decisions/ADR-0006-local-persistence.md) · [0007 Finance engine](09-decisions/ADR-0007-finance-engine-isolation.md) · [0008 Obligation subtypes](09-decisions/ADR-0008-obligation-subtype-modeling.md) · [0009 Providers](09-decisions/ADR-0009-provider-abstraction.md) · [0010 i18n/RTL](09-decisions/ADR-0010-i18n-rtl.md) · [0011 Testing](09-decisions/ADR-0011-testing-stack.md) · [0012 Auth/demo mode](09-decisions/ADR-0012-auth-demo-mode.md) · [0013 Local-first MVP](09-decisions/ADR-0013-local-first-mvp.md) · [0014 Errors](09-decisions/ADR-0014-error-taxonomy.md) · [0015 Observability](09-decisions/ADR-0015-observability.md) · [0016 Backend/auth activation — 3-week build; amends 0002/0012/0013](09-decisions/ADR-0016-backend-auth-activation.md)

## 99-sources (verbatim originals)

- [Master product brief (SRC-1, authoritative input)](99-sources/ELTIZAMATI_MASTER_BRIEF.md)
- [Architect prompt (SRC-2, process contract)](99-sources/FABLE_5_ARCHITECT_PROMPT.md)
- **SRC-3** (architecture PDF) & **SRC-4** (UI blueprint HTML, "Wadeh") — supplied 2026-07-10, delta-audited in [audit §7](00-audit/00-source-audit.md). **SRC-5** (pitch deck) still outstanding.

## Root governance

[`AI_AGENT_RULES.md`](../AI_AGENT_RULES.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`CODE_REVIEW_CHECKLIST.md`](../CODE_REVIEW_CHECKLIST.md) · [`DEFINITION_OF_DONE.md`](../DEFINITION_OF_DONE.md)
