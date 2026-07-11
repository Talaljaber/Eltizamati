# Security & Privacy Controls

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** controls marked "(P1)" for auth/RLS/consent/erasure are now **MVP**: RLS deny-by-default + pgTAP cross-user tests, Supabase session tokens in SecureStore, server-backed consent records, server-side account deletion + audit. Storage rule updated: tokens→SecureStore; prefs→key-value (MMKV/AsyncStorage); **personal financial data→Supabase only (no local financial DB in MVP)**; demo data→bundled in-memory seed. C3 handling reads "RLS-guarded (MVP)" for personal mode; demo mode holds no real financial data. Supabase env vars: anon key only, via typed `core/config`; service-role keys exist only in Supabase/Edge Function environments, never in the client or repo. **Offline personal-data limitation is an accepted, stated MVP posture** (honest error states, no offline editing). Demo mode is isolated: never authenticated, never writes to Supabase, always banner-labeled.

Companion to `threat-model.md`. Owner for every control: Talal (solo dev) — the "ownership" column therefore states the _enforcement mechanism_, which matters more here than a name.

## 1. Data classification

| Class                    | Examples                                           | Handling                                                                                                           |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| C3 — Sensitive financial | balances, rates, payments, institutions, schedules | Local DB only (MVP); RLS-guarded (P1); never in logs/analytics/notifications; export only via explicit user action |
| C2 — Personal            | email (P1), locale, consent records                | Same protections; consent records retained per policy below                                                        |
| C1 — Operational         | crash stacks (scrubbed), perf timings, error codes | Sentry allowed; must contain no C2/C3                                                                              |
| C0 — Public              | education content, glossary                        | No restrictions                                                                                                    |

**Minimization rule (NFR-PRIV-001):** a field is collected only when an implemented feature reads it; schema reviews check new columns against this table.

## 2. Control catalog (mechanism-enforced wherever possible)

| Area            | Control                                                                                                                        | Mechanism                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Secrets         | None in repo/client; public config only                                                                                        | gitleaks CI gate; `core/config` typed whitelist; P1 secrets in Supabase function env                    |
| Storage         | Tokens→SecureStore; prefs→MMKV; domain→SQLite                                                                                  | Lint rule on storage imports; code review                                                               |
| AuthZ (P1)      | RLS deny-by-default, per-table owner policies, anon key client                                                                 | Migration template includes RLS; pgTAP cross-user suite in CI                                           |
| Transport       | TLS only; cleartext blocked                                                                                                    | OS defaults + `usesCleartextTraffic:false` / ATS; release config check                                  |
| Logging         | Structured logger with safe-metadata whitelist per error code; no raw entity logging                                           | `logger` module is the only console access (lint bans `console.*` in features); unit tests on redaction |
| Crash reporting | Sentry, `sendDefaultPii:false`, beforeSend scrubber, release-only                                                              | Config in repo; checklist                                                                               |
| Deep links      | Allow-listed routes; params re-resolved                                                                                        | Route-guard tests                                                                                       |
| Dependencies    | Minimal-dep policy; justification note per new dep; lockfile; audit + Dependabot                                               | CI + AI_AGENT_RULES #12                                                                                 |
| Builds          | dev/preview/prod EAS profiles; debug menus stripped in preview+prod; demo mode is a _feature_, not a debug flag                | Build config diff in CI                                                                                 |
| Consent         | Versioned docs; acknowledgment recorded (local MVP; server P1); re-consent on version bump; feature-gated (P1 provider access) | ConsentService gate + tests                                                                             |
| Erasure         | Local wipe (MVP) transactional + verified; P1 server erasure workflow + audit event                                            | Absence tests (NFR-PRIV-003)                                                                            |
| Export          | Explicit user action; C3 data → user-chosen destination only (share sheet); P1 re-auth                                         | Manual test; P1 auth test                                                                               |
| Audit (P1)      | `audit_events` for: consent changes, connection grant/revoke, export, deletion, sign-in anomalies                              | Service-layer emission; append-only table                                                               |
| AI-agent gate   | Rules file + CI + review checklist security section                                                                            | Process                                                                                                 |

## 3. Retention & deletion policy (draft — legal validation RES-003/ASM-012)

| Data                       | Retention                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Local financial data (MVP) | Until user erases; no server copies exist                                                           |
| Account data (P1)          | Life of account; hard-delete ≤ 30 days after deletion request; backups age out ≤ 30 days after that |
| Consent/audit records (P1) | Retained post-deletion in de-identified form where legally required, else deleted with account      |
| Crash data                 | Sentry default 90 days                                                                              |

## 4. Security verification checklist (run before demo & before any release)

- [ ] gitleaks clean; `pnpm audit` no criticals
- [ ] Release build: no debug menu, no cleartext, correct env profile
- [ ] Grep/log review: no C2/C3 in any log statement (spot check + tests green)
- [ ] Deep-link fuzz: malformed ids/routes → safe fallback
- [ ] Erase-all verified (row counts 0, prefs cleared, onboarding shown)
- [ ] Demo banner present in demo mode on every screen (honesty control)
- [ ] (P1) pgTAP RLS suite green; anon key only in client; Edge Function secrets not in bundle
- [ ] (P1) Consent gates block provider sync without consent
