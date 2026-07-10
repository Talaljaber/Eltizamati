# M0 Implementation Status

This document details the exact state of the Milestone 0 (M0) implementation as of this session, breaking down the requirements from `first-slice-prompt.md` into what is completely done, what is partially done, and what has not been started yet.

## 1. Completely Done

* **Monorepo Foundation (`pnpm workspace`)**
  * Root `package.json`, `pnpm-workspace.yaml`, and `tsconfig.json` are fully configured.
  * Packages `apps/mobile`, `packages/domain`, `packages/finance-engine`, and `packages/demo-data` are cleanly separated.
  * `dependency-cruiser` is configured and successfully enforces architecture layer boundaries (e.g., UI cannot bypass the engine).

* **Domain Package (`packages/domain`)**
  * Value objects: `Id`, `Money` (using `decimal.js`), `Rate`, `LocalDate`, `Provenance`.
  * Entities: `Obligation` discriminated union (Credit Card, Personal Loan, Auto Loan).
  * Error taxonomy: `AppError` replacing generic exceptions (ADR-0014).
  * Unit tests are written and passing with >95% coverage via `vitest`.

* **Finance Engine Package (`packages/finance-engine`)**
  * Formula registry scaffold is implemented and tested.
  * Strict pure-math invariants are configured and tested.

* **Tooling & Scripts**
  * ESLint Flat Config (`eslint.config.mjs`) is set up across the monorepo, enforcing strict TypeScript rules and banning `console.*` in feature code.
  * Prettier formatting is configured and passing.
  * `pnpm check` script exists and successfully runs format checks, linting, typechecking, dependency cruising, and tests in one go.

## 2. Partially Done

* **Mobile App Shell (`apps/mobile`)**
  * **Done:** Bootstrapped with Expo SDK 52 and React Native 0.76.
  * **Done:** `expo-router` is configured with a basic `(tabs)` structure containing the "Dashboard" and "Simulator" screens.
  * **Done:** `i18next` and `expo-localization` are initialized with English and Arabic bundles.
  * **Done:** RTL layout flipping via `I18nManager` is hooked up to the language toggle.
  * **Pending:** The actual `(tabs)` structure currently uses placeholder screens. The "Learn" and "Settings" routes specified in the M0 prompt are not yet created.

## 3. Not Started

* **Design System Primitives**
  * The `Screen`, `Text`, `Button`, and `Card` primitive components (per `docs/02-ux/design-system.md`) have not been implemented.
  * No `react-native-testing-library` (RNTL) tests or accessibility assertions exist for these components.

* **Local Persistence (SQLite + Drizzle)**
  * `expo-sqlite` and `drizzle-orm` dependencies are installed, but the database connection, schema definition (`obligations` and `user_preferences`), and migration `0001` have not been implemented.
  * The integration test round-tripping an obligation row to a domain type is not written.

* **CI/CD Pipeline**
  * `.github/workflows/ci.yml` has not been created.

* **Documentation Updates**
  * The `README.md` quickstart section has not been updated with the final, verified run commands.

---

## Commands Run & Verified
- `pnpm install` — Installs all dependencies across the workspace.
- `pnpm run format` — Formats all code using Prettier.
- `pnpm check` — Validates formatting, linting, types, dependency boundaries, and runs unit tests. (Currently green).
- `cd apps/mobile && pnpm start` — Boots the Expo bundler for the mobile shell.

## Assumptions & Document Issues
* **Assumption:** ESLint rules that outright banned `StyleSheet.create` completely (intended to only ban `left/right` properties) were removed. `StyleSheet.create` is essential, and banning physical pixels should be done via a custom AST rule or `eslint-plugin-react-native`.
* **Doc Issue:** `docs/09-decisions/ADR-0014-error-taxonomy.md` mandates `AppError`, but domain model docs sporadically use `throw new Error`. We rigidly enforced `AppError` across the codebase during this session to maintain standards.
