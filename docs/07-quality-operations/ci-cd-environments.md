# CI/CD, Environments, Release & Observability

> **⚠ Architecture update (2026-07-11, [ADR-0017](../09-decisions/ADR-0017-supabase-first-mvp-persistence.md)):** environments now include Supabase in MVP — `development` uses local `supabase start` (or a dev cloud project), `preview`/`production` use dedicated Supabase projects; typed env validation (`core/config`) covers `SUPABASE_URL`/anon key (fail fast at boot). CI additions once Phases 3–4 land: apply migrations to an ephemeral/local Supabase and run pgTAP + repository integration tests. The `development` row's "local SQLite" is superseded — no SQLite in MVP.

## 1. CI (GitHub Actions — `/.github/workflows/ci.yml`)

Pipeline on every PR + main push (target < 8 min):

1. `pnpm install --frozen-lockfile`
2. **Format check** (prettier) → **Lint** (eslint incl. boundary/RTL/money rules) → **Typecheck** (`tsc --noEmit`, strict) → **dependency-cruiser** (layer rules NFR-MNT-002)
3. **Tests:** Vitest packages (with engine coverage gate ≥95%) → Jest app suite
4. **gitleaks** secret scan; `pnpm audit --audit-level=high` (non-blocking warn at first, blocking at P1)
5. On `main`: EAS preview build trigger is **manual** (`workflow_dispatch`) — hackathon builds are deliberate, not per-commit (EAS build minutes + determinism).

Merge rule: red CI blocks merge (NFR-MNT-006). Solo-dev honesty: PRs to main even when self-merging — CI is the reviewer that never sleeps; substantive changes also get AI code review before merge (CONTRIBUTING).

## 2. Environments

| Env           | What                                                                                                 | Config source                        |
| ------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `development` | Expo dev build/Go, local SQLite, dev toggles visible                                                 | `.env.development` via app.config.ts |
| `preview`     | Signed APK for demo/judges; release JS; Sentry on; dev toggles off; demo mode available as _feature_ | EAS profile `preview`                |
| `production`  | Store-track build (post-hackathon)                                                                   | EAS profile `production`             |

P1 adds Supabase projects per env (`dev` cloud project + `prod`; local `supabase start` for development). Env vars typed & validated at startup in `core/config` — a missing var fails fast at boot, not mid-demo.

## 3. Release process (hackathon)

1. Feature freeze ≥ 48h before judging (mvp-scope DoD).
2. `eas build -p android --profile preview` → APK; install on primary + backup device.
3. Run security verification checklist + demo rehearsal checklist (airplane mode, AR + EN).
4. Tag `demo-v1` on the exact commit; APK artifact attached to the GitHub release (provenance of what judges saw).

## 4. Observability

- **MVP:** Sentry (react-native/expo SDK) in preview/prod only — crashes + errors with scrubbing (NFR-SEC-004); breadcrumbs limited to navigation events (screen names only). Structured local logger with levels; dev console output; no remote log shipping.
- **Metrics that matter later (P1):** sync success rate, calculation failure/refusal rate, provider latency, app-start time — named now so instrumentation lands with the features, not retrofitted.
- **Product analytics:** none in MVP (privacy-first posture; DEC in critique §2.7). If adopted later: event taxonomy must pass NFR-PRIV-004 review; candidate events listed in SRC-1 §30.1.

## 5. Performance budgets

Cold start ≤2.5s mid-range Android (NFR-PERF-001) · scenario calc ≤300ms/360 periods (NFR-PERF-002, benchmarked in engine tests) · dashboard 20 obligations jank-free (NFR-PERF-003) · APK size sanity check (<60MB warn). Measured on the actual demo device during rehearsal — budgets exist to be _checked_, not admired.

## 6. Definition of Done

Canonical checklist lives in root `DEFINITION_OF_DONE.md` (feature-level + milestone-level). CI encodes the automatable subset.
