# Contributing

This repo is built by one developer (Talal) + AI agents + non-developer teammates validating content. The rules exist to keep that mix coherent.

## Workflow

1. Work happens on branches; `main` is protected by CI (format, lint, typecheck, dependency-cruiser, tests). PRs even when self-merging — CI is the tireless reviewer; substantive changes also get an AI code-review pass before merge.
2. Every change traces to an id (FR/US/BR/ADR/RISK/TV or a milestone task). Orphan changes get a doc update first.
3. Conventional-ish commits: `feat(obligations): …`, `fix(engine): …`, `docs: …`, `chore(ci): …`. Small, single-purpose.
4. AI agents follow `AI_AGENT_RULES.md`; humans review against `CODE_REVIEW_CHECKLIST.md`; everything ships per `DEFINITION_OF_DONE.md`.

## Setup (M0 will make this literally true)

```bash
pnpm install
pnpm check        # format + lint + typecheck + boundaries + tests
pnpm dev          # expo start (dev build required once MMKV lands — see mobile primer §11)
```

Node LTS + pnpm via corepack; Android device/emulator; see `docs/04-architecture/mobile-primer-for-web-devs.md` for the mobile-specific loop.

## For non-developer teammates (yes, you)

- **Finance validation:** edit/confirm test vectors in `packages/finance-engine/vectors/*.json` (guide: `docs/03-domain/calculation-test-vectors.md`). Your spreadsheet is the source of truth for expected values — the code must match _you_.
- **Content:** education articles in `apps/mobile/content/education/<locale>/`, glossary in `docs/00-product/glossary.md`, insight copy in locale files. Arabic is authored, never machine-translated (RES-009).
- **Decisions:** `docs/08-delivery/decision-memo.md` lists what needs your sign-off; comment on the PR or in your team channel.

## Language & schema rules (the two most common mistakes)

- Every user-visible string lands in **both** `en` and `ar` files in the same PR.
- Every schema change updates **both** the Drizzle (local) migration and the `/supabase` (P1) migration in the same PR (ADR-0002).

## Milestone gates

Each milestone (M0–M6) ends with its exit demo (`docs/08-delivery/hackathon-plan.md`) plus: AR walkthrough of new screens on device, states check (loading/empty/error), and a risk-register re-score.
