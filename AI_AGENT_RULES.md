# AI Agent Rules — Binding for All Coding Agents

Every AI agent (and human) writing code in this repository is bound by these rules. "The docs" = `docs/` knowledge base indexed at `docs/INDEX.md`. Violating a MUST is grounds for rejecting the change regardless of whether it "works."

## A. Before editing

1. **MUST read** `docs/INDEX.md`, the relevant feature spec (FR/US/SCR ids), `docs/04-architecture/system-architecture.md §2` (dependency rules), and any ADR touching your area. If your task names none, ask or stop.
2. **MUST search before creating**: an existing design-system primitive, domain service, formatter, error code, fixture builder, or query key that does the job means you use it — duplicates are defects (grep first: `rg` for the concept and the TERM- code name).
3. **MUST NOT invent** database fields, routes, statuses, error codes, formulas, thresholds, or terminology. Missing definitions go back as `DOC-ISSUE:` reports, not improvisation.

## B. While editing

4. **Dependency direction is law** (`ui → application → domain ← infrastructure`; packages never import the app). If your change needs an upward import, your design is wrong — stop.
5. **Money & rates:** only `Money`/`Rate` value objects; no `number` arithmetic on monetary values; no `toFixed`; formatting only via `core/formatting`. (NFR-MNT-003)
6. **Financial logic** lives only in `packages/finance-engine` (formulas) or domain services (rules). **MUST NOT** compute financial values in components, hooks, or route files — including "trivial" sums (FR-CALC-006).
7. **Formula changes:** new/changed math requires a version bump in the registry, updated/new test vectors, and an ADR note — no exceptions (T-12).
8. **Strings:** all user-visible text via i18n keys, EN **and** AR added together; terminology via the per-kind namespaces (BR-TERM-001) — never conditionally word-swap in components.
9. **Styles:** logical properties only (start/end); tokens only (no raw hex/sizes in features); design-system primitives for money (`Amount`), status (`StatusChip`), provenance.
10. **Statuses/enums:** use domain enums; deriving obligation status anywhere but `deriveObligationStatus` is forbidden (BR-STAT-001).
11. **Errors:** return `Result` with taxonomy codes (ADR-0014); no catch-and-swallow; no `console.*` in features (use the logger); no PII/financial values in any log (NFR-SEC-004).
12. **Dependencies:** adding any package requires a one-paragraph justification in the PR (what, why, alternatives, size); prefer stdlib/existing deps. Never add: analytics SDKs, state libraries, chart libraries (see design-system §5), or anything touching crypto/storage without an ADR.
13. **Consistency beats novelty:** no new architectural patterns, folder shapes, or idioms introduced inside one feature. If the established pattern is inadequate, file a `DOC-ISSUE:`/propose an ADR first.
14. **Provenance & honesty:** every material figure rendered must carry provenance (use `Amount`); estimates must render as estimates (BR-CALC-014); never label demo/mock data as live (C-07).
15. **Security:** no secrets in code/env-committed files (gitleaks will catch you; don't make it); tokens only via SecureStore accessors; deep links only via the route allow-list; never weaken a security control "to make the demo work" — if truly necessary, document it loudly in the PR and the threat model.
16. **Codegen:** generated files (drizzle-kit, etc.) only via the project's generation commands; never hand-edit generated output.

## C. Scope & size

17. Keep changes small and single-purpose; a PR that mixes a feature with a refactor gets split. Massive generated files must be decomposed before review.
18. Update tests and docs **in the same change** as behavior. A behavior change without a test/doc delta is incomplete.

## D. Before submitting

19. Run `pnpm check` (format, lint, typecheck, depcruise, tests) — green or don't submit.
20. Report: concise change summary, verification evidence (commands + output), `ASSUMPTION:` lines for anything you assumed, `DOC-ISSUE:` lines for any doc gap/conflict found. Never silently resolve a documentation conflict (§35.15).

## E. Standard feature-implementation prompt template

```
Implement <FR-ids / US-ids> for Eltizamati.
Read first: docs/INDEX.md, AI_AGENT_RULES.md, <feature spec paths>, <relevant ADRs>, docs/02-ux/screen-inventory.md#<SCR-ids>.
Scope: <exact screens/services/formulas>, milestone <Mx>. Out of scope: <list>.
Follow the feature folder shape in docs/04-architecture/system-architecture.md §7.
Acceptance: <AC list or pointer>; all states from the screen state matrix; EN+AR strings; tests per docs/07-quality-operations/testing-strategy.md for this layer.
Verify with pnpm check + <specific manual/E2E step>. Report per AI_AGENT_RULES §D.
```
