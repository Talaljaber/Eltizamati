# First Coding-Agent Prompt (M0 — Foundation)

Copy-paste this to the first implementation agent, from the repo root, after reading it yourself once.

---

You are implementing milestone M0 of Eltizamati. Before writing anything:

1. Read, in order: `README.md`, `docs/INDEX.md`, `AI_AGENT_RULES.md`, `docs/04-architecture/system-architecture.md`, `docs/04-architecture/mobile-primer-for-web-devs.md`, `docs/08-delivery/readiness-review.md §5`, and ADR-0001, 0003, 0004, 0005, 0006, 0010. These documents are binding; do not invent structure, names, dependencies, or behavior beyond them.

2. Implement M0 exactly as scoped in `docs/08-delivery/hackathon-plan.md §M0` and sequenced in `docs/08-delivery/readiness-review.md §5`:
   - pnpm monorepo: `apps/mobile`, `packages/domain`, `packages/finance-engine`, `packages/demo-data` (packages may start near-empty but with correct package.json boundaries, tsconfig project references, and one passing placeholder test each).
   - Expo app (current stable SDK, TypeScript strict) with Expo Router: `(tabs)` = Home/Obligations/Learn placeholders + a settings route.
   - i18n per ADR-0010: i18next + ICU, `en` and `ar` locale files for all M0 strings, language-selection screen as app entry when no locale is persisted, RTL flip via persisted locale + I18nManager + reload.
   - Design tokens + primitives `Screen`, `Text`, `Button`, `Card` per `docs/02-ux/design-system.md §1–2`, each with an RNTL test including accessibility assertions; logical (start/end) styles only.
   - SQLite via expo-sqlite + Drizzle: migration 0001 creating `obligations` core and `user_preferences` per `docs/05-data-api/database-schema.md`; money/date column conventions exactly as specified (decimal TEXT, ISO dates); one integration test round-tripping an obligation row through a mapper to a domain type stub.
   - Tooling: eslint (with the RTL rule banning left/right styles, no-literal-JSX-strings, `console.*` ban in features), prettier, dependency-cruiser enforcing the layer rules in `system-architecture.md §2`, vitest configs for packages, jest-expo for the app.
   - `.github/workflows/ci.yml` per `docs/07-quality-operations/ci-cd-environments.md §1`.
   - Root scripts: `pnpm check` = format-check + lint + typecheck + depcruise + all tests.
   - README quickstart section updated to the real commands you verified.

3. Constraints (violations = do not submit):
   - Every rule in `AI_AGENT_RULES.md`, especially: no new dependencies beyond those named in the ADRs without a written justification in the PR; no financial logic anywhere (M0 has none); no hardcoded user-facing strings; feature-folder shape identical across features.
   - Keep commits small and scoped (scaffold / app shell / i18n / design system / db / CI).

4. Verification before you finish: `pnpm check` green; app boots on Android (document the exact command); language switch EN↔AR flips layout after reload; fresh-clone quickstart followed literally works.

5. Report back with: what you built, commands run + outputs, any assumption you had to make (as `ASSUMPTION:` lines), and anything in the docs you found ambiguous or contradictory (as `DOC-ISSUE:` lines) — do not silently resolve doc conflicts.

---

**Note to Talal:** review this agent's PR against `CODE_REVIEW_CHECKLIST.md`, then run the app on your physical device before merging — M0 is ADR-0001's validation gate (readiness-review §5).
