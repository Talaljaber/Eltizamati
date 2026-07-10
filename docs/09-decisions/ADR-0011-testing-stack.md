# ADR-0011 — Testing Stack: Vitest+fast-check (packages) / Jest+RNTL (app) / Maestro (E2E)

- **Status:** Accepted · **Date:** 2026-07-10 · **Confidence:** High · **Reversal cost:** Low

## Context & forces

The engine deserves the best pure-TS test ergonomics; the app needs the RN-blessed runner; E2E must be maintainable by one person. Two runners is a consciously accepted cost.

## Alternatives & decision

- **Packages — Vitest + fast-check (chosen):** fastest feedback for the code that matters most; fast-check is the property-testing standard (INV-1..7). Jest+ts-jest everywhere was the "one runner" alternative — rejected because package tests then inherit app-runner sluggishness forever to avoid one config file.
- **App — Jest via jest-expo + React Native Testing Library (chosen):** the supported path for RN component/unit tests; RNTL enforces behavior-oriented queries (incl. a11y assertions, NFR-A11Y-001).
- **E2E — Maestro (chosen) over Detox:** YAML flows, no build instrumentation, dramatically lower setup/maintenance for a solo dev; Detox's grey-box power is unneeded for our demo-spine scope. Runs the spine in EN+AR (RTL check) on Android.
- **Golden/visual tests — deliberately none (CON-09):** no infra for meaningful visual regression in RN at this budget; RNTL assertions + Maestro screenshots + manual RTL pass instead. Revisit post-hackathon.

## Consequences

Two jest/vitest configs (documented in CONTRIBUTING); CI runs both suites (ci-cd doc §1). Engine coverage gate ≥95% applies to `finance-engine` only — coverage theater elsewhere is explicitly not a goal (testing-strategy §5).
