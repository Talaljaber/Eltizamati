# Code Review Checklist

Apply to every PR (human- or AI-authored). Skip sections that genuinely don't apply; never skip **Correctness & Money** or **Security** when they do.

## Correctness & Money

- [ ] No `number` arithmetic on monetary values; `Money`/`Rate` VOs used; rounding only at spec'd boundaries (BR-CALC-003/004)
- [ ] No financial computation outside engine/domain services (incl. sums in components)
- [ ] Formula changes: version bumped, vectors updated, ADR note present (T-12)
- [ ] Statuses only via `deriveObligationStatus`; enums, not strings
- [ ] Estimates rendered as estimates (≈, badge, confidence); provenance present on material figures (`Amount` used)
- [ ] Unknown data renders "unknown" — no invented defaults, no silent zeros (BR-CALC-016 / FR-OBL-003)

## Architecture

- [ ] Dependency direction respected (depcruise green is necessary, not sufficient — check intent)
- [ ] No duplicate primitive/service/formatter/fixture (searched?)
- [ ] Feature folder shape matches the standard; no new patterns smuggled into one feature
- [ ] New dependency justified in PR description; scope/size sane
- [ ] Errors via taxonomy codes + Result; no swallowed catches; recovery/UX state mapped

## i18n / RTL / a11y

- [ ] All strings via i18n keys, EN + AR both present; ICU plurals for counts
- [ ] Terminology namespace correct per obligation kind (BR-TERM-001 — grep Murabaha screens for "interest"/"فائدة")
- [ ] Logical styles only (no left/right); directional icons registered; AR screenshot attached for new screens
- [ ] a11y labels/roles on interactive elements; touch targets; text alternatives for charts

## Security & privacy

- [ ] No secrets/keys; no PII or financial values in logs/errors/analytics; safe-metadata only
- [ ] Storage tier correct (tokens→SecureStore; prefs→MMKV/AsyncStorage; personal financial data→Supabase only; demo data→in-memory seed — ADR-0017 + ADR-0006 surviving clauses; **no local financial DB in MVP**)
- [ ] Deep links via allow-list; params re-resolved, not trusted
- [ ] No demo/debug bypass reachable in preview/production builds

## Tests & docs

- [ ] Behavior change ⇒ test change in same PR; bug fix ⇒ regression test named after the rule/issue
- [ ] Engine changes keep coverage gate; property tests still meaningful (not neutered generators)
- [ ] Schema change ⇒ both migrations (local + /supabase) + migration test
- [ ] Docs updated (FR/SCR/BR/ADR/glossary as applicable); `ASSUMPTION:`/`DOC-ISSUE:` lines addressed
- [ ] `pnpm check` green in CI

## Product truth

- [ ] Nothing implies live integrations that don't exist (C-07)
- [ ] Copy respects recommendation boundary + tone rules (content-terminology.md §2–3)
- [ ] Change maps to an id (FR/US/BR/ADR/TV/milestone) — if not, why does it exist?
