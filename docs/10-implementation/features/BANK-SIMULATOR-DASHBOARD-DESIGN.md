# Bank Simulator Dashboard design

## What this is

A demo-only web dashboard (`apps/bank-simulator-dashboard`, Next.js App
Router) that simulates how a bank or financial regulator could interact with
Eltizamati's database. Hackathon demonstration only — never used by real bank
employees, Central Bank employees, customers, or the public. It has **no user
authentication**; the entire safety model rests on (1) every privileged
Supabase/email credential staying server-side, and (2) a mandatory test-user
allowlist gating every query that reaches client-level data. Source spec:
`docs/dashboard.md` (+ its `correction` appendix, lines 1097–1327, which fixes
the primary demonstration story — see "The rate-campaign story" below).

It never claims to be the Central Bank of Jordan, a licensed bank system, an
Open Banking integration, a credit bureau, or a production
customer-management system. A permanent banner states this on every page.

## Current-state audit

Before this branch, the monorepo had one app (`apps/mobile`, Expo/React
Native) and three pure-TypeScript packages (`@eltizamati/domain`,
`@eltizamati/finance-engine`, `@eltizamati/demo-data`). No web app, no
Next.js, no server-side Supabase client, no email-sending code, and no
Playwright existed anywhere in the repo. This is the first genuinely
greenfield web surface — nothing to migrate, but also nothing to copy
wholesale; every server pattern here (env loading, service-role Supabase
client, allowlist gate) is a new sibling to the equivalent mobile pattern,
not a fork of it (apps never import each other).

## Data fields discovered (present in the schema today)

Confirmed directly against `supabase/migrations/` — every table below already
exists and is exercised by the mobile app.

**`profiles`** — `user_id`, `locale` (`en`/`ar`), `data_mode` (`demo`/
`personal`), `created_at`, `updated_at`, `full_name`, `phone_number`
(E.164), `primary_bank`, `reminder_day_of_month`, `user_threshold_amount`.
**The authentication email is not stored in `profiles`.** When a test user's
email is needed (e.g. to address a demo notification), the dashboard's
server layer must fetch it via the Supabase Admin API (`auth.admin.getUserById`)
through the service-role client — never assume it lives in a table.

**`obligations`** (base, ADR-0008 class-table inheritance) — `id`, `user_id`,
`kind` (`conventionalLoan`/`murabaha`/`ijara`/`diminishingMusharakah`/
`creditCard`/`genericFacility`), `nickname`, `institution_name`,
`institution_id`, `currency` (`JOD` only), `opened_date`, `closed_date`,
`notes`, `provenance_json`, `created_at`, `updated_at`. Only three kinds have
a detail table (below); `ijara`/`diminishingMusharakah`/`genericFacility`
have a base row only — no computed fields are possible for them beyond what
`obligations` itself carries.

**`loan_details`** (kind=`conventionalLoan`) — `original_principal`,
`outstanding_balance` (nullable), `installment`, `rate_type`
(`fixed`/`variable`/`mixed`/`unknown`), `term_months`, `start_date`,
`maturity_date`, `first_payment_date` (nullable), `payment_frequency`
(`monthly` only), `purpose`, `contractual_balloon` (nullable) — each material
field paired with a `*_prov` provenance column. **Rate history is not here**
— see `rate_periods`.

**`murabaha_details`** (kind=`murabaha`) — `asset_cost`, `disclosed_profit`,
`total_sale_price`, `installment`, `term_months`, `start_date`,
`profit_rate_disclosed` (display-only, no provenance, BR-CALC-020). No rate
periods — Murabaha is never repriced.

**`card_details`** (kind=`creditCard`) — `credit_limit`, `current_balance`,
`statement_balance` (nullable), `statement_date` (nullable),
`minimum_payment_rule_json` (`{type:'percent'|'fixed'|'unknown', ...}`),
`purchase_apr` (nullable), `cash_advance_apr` (nullable), `due_date`
(nullable), `grace_days` (nullable), `fees_json` (array, contractual line
items only).

**`rate_periods`** — append-only rate history. `id`, `obligation_id`,
`user_id`, `annual_rate`, `effective_from`, `superseded_by` (nullable FK to
another `rate_periods.id`), `provenance_json`, `created_at`. Enforcement
(verified in `20260715090000_atomic_obligation_writes_and_append_only_rates.sql`):
`authenticated` has `REVOKE UPDATE` then a column-level
`GRANT UPDATE (superseded_by)` — Postgres itself rejects any attempt to
rewrite `annual_rate`/`effective_from` on an existing row, independent of
RLS. A partial unique index enforces non-overlapping active
(`superseded_by IS NULL`) periods per `(obligation_id, effective_from)`.

**`payments`** — `paid_on`, `amount`, `alloc_principal`/`alloc_cost`/
`alloc_source` (all-or-nothing, `official`/`estimated`), `period_ref`
(nullable FK to `rate_periods`), `provenance_json`.

**`calculation_runs`** — `formula_id`, `formula_version`, `as_of`,
`inputs_json`, `inputs_hash` (SHA-256), `outcome_kind` (`result`/`refused`),
`confidence` (only when `result`), `result_json` (only when `result`),
`missing_fields_json`/`partial_json` (only when `refused`),
`assumptions_json`, `calculated_at`. Immutable — a re-run always inserts a
new row.

**`insights`** — `rule_id`, `severity`, `title_key`/`body_key` (i18n keys,
never inline copy), `params_json`, `trigger_hash` (dedup key with `rule_id`+
`obligation_id`), `deep_link`, `read_at`.

**`consent_records`** — `doc_type`, `version`, `locale`, `acknowledged_at`.
Append-only.

**Provenance model** (`packages/domain/src/value-objects/provenance.ts`):
`SourceClass = 'official' | 'bureau' | 'userEntered' | 'estimate' | 'demo'`.
Every material figure is either an optional `Sourced<T>` (absent ≠ zero — a
nullable value/prov column pair maps to `undefined`, never `0`) or a required
one. The dashboard reuses this vocabulary verbatim; it never invents a sixth
source class.

## Data fields confirmed missing (never invented)

No table anywhere stores: salary, employer, national ID, credit score,
delinquency/approval score, internal bank account numbers, or credit-bureau
history. No "data-source status" / connection-health table exists — freshness
is derived per-field from provenance timestamps (`isStale()`,
BR-PROV-003), not read from a status row.

For the Benchmark Simulator specifically (Phase 5), the schema has **no**
benchmark identity, margin/spread, cap, floor, or repricing-frequency
columns anywhere. Wherever a screen would need one of these to compute a
contract-level effect, it must render:

> Contract impact cannot be calculated from the available data.

— never a guess, never a silent default.

## Architecture

`apps/bank-simulator-dashboard` — Next.js App Router, TypeScript strict,
server components + server actions/route handlers for all mutations, Vitest
for unit/server tests, Playwright for E2E (Phase 5). `next.config.ts`
transpiles the three workspace packages (they ship raw `.ts`, no build step).
Binds to localhost by default; `instrumentation.ts` calls `getDashboardEnv()`
at process boot, which throws — crashing startup — if
`DEMO_DASHBOARD_ENABLED` is not `true`, or if `NODE_ENV=production` without
an explicit `DEMO_DASHBOARD_ALLOW_REMOTE=true`.

**Server boundary.** `src/server/**` is the only place `@supabase/supabase-js`
and (from Phase 4) `nodemailer` may be imported — enforced by two
dependency-cruiser rules (`no-supabase-outside-dashboard-server-boundary`,
`no-dashboard-secrets-in-shared-components`). The Supabase client
(`src/server/supabase/client.ts`) is constructed with `SUPABASE_SECRET_KEY`
(service-role), never the anon key — this app has no signed-in session, so
RLS could never authorize it anyway. **This means RLS provides no backstop
here**: every query the dashboard issues must explicitly filter to
`assertAllowlistConfigured()`'s user-id list itself (`src/server/allowlist.ts`).
There is intentionally no "show all auth users" code path.

**Generated types.** `src/server/supabase/database.types.ts` is this app's
own copy (not imported from `apps/mobile` — apps never import each other).
It currently mirrors the migrations by hand because no local Supabase stack
was running when this app was scaffolded; regenerate it for real via
`npx supabase gen types typescript --local --schema public > apps/bank-simulator-dashboard/src/server/supabase/database.types.ts`
before trusting it as a source of truth, then treat it exactly like the
mobile equivalent (never hand-edited, excluded from lint/format).

**Finance engine reuse.** `@eltizamati/finance-engine` and
`@eltizamati/domain` are consumed directly — `resolveRuntimeFormula`,
`variableProjection`, `residualDetection`, `aggregates`, the pure insight
evaluators (`packages/finance-engine/src/insights/rules.ts`), `Money`/`Rate`,
`Provenance`/`demoSourced(...)`, `toCanonicalJsonValue`/`hashCanonicalJson`,
`validateRatePeriods`. No new formula is introduced anywhere in this feature;
no financial math lives in a React component. `CalculationService`/
`InsightEvaluationService` themselves live inside `apps/mobile` and can't be
imported cross-app, so the dashboard's server layer re-implements the same
thin orchestration sequence — resolve formula → execute → canonicalize+hash →
persist `calculation_run` → evaluate insight candidates — directly over the
pure engine functions, using `apps/mobile/src/services/insight-evaluation-service.ts#evaluateForLoan`
as the reference algorithm.

**Row→domain mappers.** The mobile mappers
(`apps/mobile/src/services/repositories/supabase/mappers/*`) can't be
imported cross-app either. The dashboard defines its own read-only server
mappers under `src/server/` as each read model is built (Phase 2+), reusing
the same `Money.of(String(...))`/`Rate.fromDecimal(String(...))`
decimal-string discipline the mobile mappers use to avoid float precision
loss. **DOC-ISSUE:** this duplicates logic that would be better extracted
into a shared, platform-neutral `packages/persistence-mappers` consumed by
both apps — deferred here to avoid touching mobile code in a dashboard-only
branch; worth a follow-up ADR if a third consumer ever appears.

## The rate-campaign story (the primary demonstration)

Fixed by the `correction` appendix in `docs/dashboard.md`. The story is:
a variable lending rate increases → the installment stays unchanged (default
servicing policy) → a larger share of each payment covers financing cost →
less reduces principal → a **projected residual** may remain at the
_original_ contractual maturity date → the dashboard explains this, never
computes it in the UI → the customer gets a bilingual notification.

Mechanically: append a new `rate_periods` row (demo provenance, campaign id,
never mutate history) → run `variableProjection` with
`installmentPolicy: { kind: 'unchanged' }` → feed the result into
`residualDetection` → persist the outcome as a `calculation_run` (formula id

- version, canonical input snapshot, `as_of`, assumptions, confidence,
  provenance) → evaluate insight candidates → mark the campaign complete. Two
  alternative servicing policies are exposed (`recalculated`, and an explicit
  "unknown contract treatment" that refuses to compute a final outcome) —
  `unchanged` is the default, never silently applied to every product.

**Hard distinction, enforced in the type system, not just in copy:** a
`contractualBalloon` (official/user-entered, from the original contract) is
a completely different field from a `projectedResidualAtMaturity` (a
finance-engine estimate). The publish flow must never write the latter into
the former, and no display may present a projected residual as a confirmed
final payment unless a genuinely confirmed contractual source says so.

## Eligibility for the Bank Rate Simulator

Included: conventional loans, variable-rate, known current balance, known
current rate, known installment, known maturity/remaining term, belonging to
an allowlisted user. Excluded, each with an explicit on-screen reason:
fixed-rate loans, Murabaha, Ijara, diminishing Musharakah, credit cards
(unless a separate APR flow is built), obligations from another institution,
incomplete records, obligations with no known current rate, non-allowlisted
users.

## Benchmark Simulator boundary (Phase 5)

A simulated Central Bank benchmark change is stored as its own record and
never auto-updates any borrower's contract. It surfaces which variable-rate
obligations are _potentially_ linked, which obligations are missing the
benchmark/margin data needed to compute a real effect, and states plainly
where "contract impact cannot be calculated from the available data" applies
— which, given the current schema, is effectively everywhere a lending-rate
change hasn't been separately entered through the Bank Rate Simulator.

## Phased delivery

Phase 1 (this phase): app shell, env guard, server Supabase boundary, root
tooling wiring, Demo Settings (config status only — real actions land in
Phase 2/4), this design doc. Phase 2: Overview + Client directory read
models. Phase 3: Client detail + Bank Rate Simulator + impact preview (the
primary feature). Phase 4: publish transaction, demo migrations, email
outbox, activity log. Phase 5: Benchmark Simulator, portfolio analytics,
bilingual/RTL, full unit/server/db/E2E test coverage — the point at which
this becomes a complete, solid, working dashboard architecture.

## What this feature will never do

Push, merge, open a PR, tag, deploy, apply a migration to hosted Supabase,
change a hosted secret, or send a real email outside an explicit owner
action against Talal's approved test address. No hosted mutation happens as
part of any automated step in this build.
