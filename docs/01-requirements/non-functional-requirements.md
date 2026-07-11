# Non-Functional Requirements

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** Supabase is the MVP persistence for personal-mode data — NFR-SEC-002 (RLS from first migration) and NFR-SEC-003 (SecureStore tokens) are now **MVP-blocking**, not P1. Reliability NFRs that assumed total offline capability apply to **demo mode** (bundled in-memory seed — fully offline); **personal mode requires network for authoritative reads/writes** and must surface honest offline/error/retry states instead of promising offline editing. No SQLite in MVP.

**ID scheme:** `NFR-<CAT>-###`. Categories: SEC security, PRIV privacy, L10N localization, A11Y accessibility, PERF performance, REL reliability, MNT maintainability, TEST testability, OPS operations.
Verification column states how compliance is checked. SRC-1 §35's twenty non-negotiables are all represented here (mapping noted).

## Security (see also `docs/06-security-privacy/`)

| ID          | Requirement                                                                                                                                       | Verification                               | SRC-1 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----- |
| NFR-SEC-001 | No secrets, API keys, or privileged credentials in client code or repo. Public keys (e.g. Supabase anon key) only, and only via env config.       | gitleaks in CI; code review                | §35.7 |
| NFR-SEC-002 | Server-side authorization (Postgres RLS) on every user-data table from the first migration; client roles hold least privilege.                    | RLS test suite (pgTAP or SQL tests)        | §35.8 |
| NFR-SEC-003 | Auth/session tokens only in OS secure storage (Keychain/Keystore via expo-secure-store), never AsyncStorage/MMKV/SQLite.                          | Code review + lint rule on token accessors | §27   |
| NFR-SEC-004 | Logs and crash reports contain no balances, rates, account numbers, names, or tokens; Sentry configured with scrubbing + `sendDefaultPii: false`. | Log-policy tests; Sentry config review     | §27   |
| NFR-SEC-005 | Deep links validated: only allow-listed routes; parameters treated as untrusted (no direct entity trust; re-fetch by id with authorization).      | Route-guard unit tests                     | §27   |
| NFR-SEC-006 | Release builds: no debug menus, no demo bypasses of consent, no cleartext HTTP.                                                                   | Build config diff check in CI              | §27   |
| NFR-SEC-007 | Dependency risk managed: lockfile committed, `pnpm audit` + Dependabot in CI, new deps require justification (AI_AGENT_RULES #12).                | CI                                         | §27   |
| NFR-SEC-008 | Provider payloads validated at the boundary (zod schemas) before entering domain; malformed data → typed error, never partial writes.             | Contract tests                             | §27   |

## Privacy

| ID           | Requirement                                                                                                                          | Verification                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| NFR-PRIV-001 | Data minimization: only fields required by an implemented feature are collected/stored (data classification table in docs/06).       | Schema review against classification |
| NFR-PRIV-002 | Consent versioned, timestamped, specific, revocable where applicable; feature access gated on required consents.                     | Consent-gate tests (P1)              |
| NFR-PRIV-003 | Full local erasure (MVP) and full account erasure (P1) complete within the session / within defined SLA; verified by absence checks. | Erasure test                         |
| NFR-PRIV-004 | No analytics events carry exact balances or contract identifiers.                                                                    | Event-schema review                  |
| NFR-PRIV-005 | Notification content on lock screen is minimized by default ("A payment is due soon" — no amounts/institutions).                     | Manual check (S/P1)                  |

## Localization

| ID           | Requirement                                                                                                                                                 | Verification                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| NFR-L10N-001 | 100% of user-visible strings via i18n keys; no hardcoded copy.                                                                                              | ESLint rule (no-literal-strings in JSX) + key-coverage script |
| NFR-L10N-002 | Full RTL mirroring in Arabic: layout, navigation gestures, icons with direction semantics. Logical (start/end) styling only; `left/right` styles forbidden. | ESLint rule + RTL screenshot pass per screen                  |
| NFR-L10N-003 | Dates, numbers, and currency locale-aware; JOD formatting per BR-CALC-014 through the single `formatMoney` utility.                                         | Unit tests; lint forbids `toFixed` on money                   |
| NFR-L10N-004 | Arabic is authored content, not machine translation (RES-009 review before demo).                                                                           | Content review sign-off                                       |
| NFR-L10N-005 | Layouts tolerate 1.5× text length and system font scaling without truncating material figures.                                                              | RNTL + manual font-scale pass                                 |

## Accessibility

| ID           | Requirement                                                                                              | Verification                                |
| ------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| NFR-A11Y-001 | All interactive elements have accessible labels/roles; screen-reader order matches visual hierarchy.     | RNTL a11y queries; TalkBack spot checks     |
| NFR-A11Y-002 | Contrast ≥ WCAG AA; status/meaning never conveyed by color alone (badge text + icon).                    | Token-level contrast check in design system |
| NFR-A11Y-003 | Touch targets ≥ 44×44pt.                                                                                 | Design-system component defaults            |
| NFR-A11Y-004 | Reduced-motion honored (no essential info in animation).                                                 | Manual check                                |
| NFR-A11Y-005 | Charts have text equivalents (the summary sentence _is_ the primary artifact; the chart illustrates it). | Screen spec requirement                     |

## Performance & reliability

| ID           | Requirement                                                                                                                                                   | Verification                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| NFR-PERF-001 | Cold start to interactive dashboard ≤ 2.5s on a mid-range Android device (demo device measured).                                                              | Manual timing on demo hardware |
| NFR-PERF-002 | Scenario calculation returns ≤ 300ms for a 360-period schedule on-device; engine work never blocks the JS thread for > 1 frame chunk without a loading state. | Engine benchmark test          |
| NFR-PERF-003 | Lists virtualized; dashboard renders 20 obligations without jank.                                                                                             | Manual + profiler              |
| NFR-REL-001  | The full demo path works with airplane mode on (ASM-013).                                                                                                     | Demo rehearsal checklist       |
| NFR-REL-002  | Local schema migrations are forward-only, versioned, and tested against seeded prior versions.                                                                | Migration tests                |
| NFR-REL-003  | Engine is deterministic: identical inputs → identical outputs, across devices and runs.                                                                       | Property test (INV-5)          |

## Maintainability & testability (SRC-1 §35.1–6, 9–20)

| ID           | Requirement                                                                                                                               | Verification                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| NFR-MNT-001  | Single cross-platform codebase (Expo/React Native, ADR-0001); Android + iOS build targets configured even though hackathon ships Android. | Repo structure; `eas.json`                             |
| NFR-MNT-002  | Dependency direction enforced: `ui → application → domain`; `finance-engine` and `domain` import nothing from app/infra.                  | dependency-cruiser (or eslint-plugin-boundaries) in CI |
| NFR-MNT-003  | Money/rate arithmetic only via `Money`/`Rate` value objects; raw number arithmetic on monetary values forbidden.                          | ESLint restriction + review checklist                  |
| NFR-MNT-004  | All material decisions recorded as ADRs before or with implementation.                                                                    | PR checklist                                           |
| NFR-MNT-005  | `pnpm i && pnpm dev` (documented in README) yields a running app with seed data — no undocumented steps.                                  | Fresh-clone test                                       |
| NFR-MNT-006  | CI enforces: format (prettier), lint (eslint), typecheck (tsc --strict), tests. Red CI blocks merge.                                      | GitHub Actions                                         |
| NFR-TEST-001 | `finance-engine` ≥ 95% line coverage + property tests for all invariants (INV-1…7); coverage gate in CI for that package only.            | vitest coverage                                        |
| NFR-TEST-002 | Status derivation, provenance resolution, mappers, and validation covered by unit tests.                                                  | vitest/jest                                            |
| NFR-TEST-003 | Critical flows (onboard → dashboard → detail → scenario) covered by Maestro E2E on Android.                                               | CI (or pre-demo run)                                   |
| NFR-OPS-001  | Sentry crash reporting wired in release builds (scrubbed per NFR-SEC-004); environments separated (dev/preview/prod build profiles).      | Config review                                          |
