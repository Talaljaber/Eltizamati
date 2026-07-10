# ADR-0010 — Localization: i18next + ICU, Terminology Namespaces, Reload-on-Language-Switch

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low-Medium

## Context & forces
Arabic-first with full RTL from foundation (§35.3); contract-aware terminology per obligation kind (BR-TERM-001); Arabic's six plural forms; React Native's RTL model (`I18nManager.forceRTL` requires an app restart to re-layout).

## Alternatives
- **i18next + react-i18next + i18next-icu — chosen:** ICU plurals (Arabic-correct), namespaces (the terminology-map mechanism from `content-terminology.md §1` falls out naturally), interpolation with formatters routed to our `formatMoney`/`formatDate`, huge corpus for AI agents.
- **react-intl (FormatJS):** solid ICU, but message extraction workflow is heavier and per-kind namespace switching is less ergonomic. Viable runner-up.
- **Lingui:** elegant macros, smaller RN mindshare; macro magic is a mild AI-agent hazard. Rejected.

## Decision
i18next with: `common`, per-feature, `glossary`, and per-kind terminology namespaces (`term-conventionalLoan`, `term-murabaha`, …); locale files co-authored EN+AR per key (NFR-L10N-004). Numbers/dates via `Intl` (Hermes) through the single formatting module; Western Arabic digits for financial figures (design-system §3, pending RES-009 confirmation).

**Language switch:** persist locale → set `I18nManager.forceRTL` → controlled app reload (`expo-updates` reloadAsync / dev equivalent), restoring to the settings screen (US-010). A live in-place flip (Flutter-style) is not reliably achievable in RN; we design the UX around the reload rather than pretending.

## Consequences
Terminology correctness becomes data (namespace files reviewable by finance/product teammates — the validation workflow §33.2 wants). Lint + key-coverage script keep both locales complete (NFR-L10N-001). Obligation: every new obligation kind ships its terminology namespace in the same PR (ADR-0008 consequence list).
