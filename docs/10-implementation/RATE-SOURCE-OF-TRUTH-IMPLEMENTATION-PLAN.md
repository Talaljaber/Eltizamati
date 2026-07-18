# Rate Source of Truth and Ephemeral Mobile What-If Plan

> **Status:** Approved product behavior; implementation not started  
> **Scope:** Authoritative dashboard-published loan rates plus a non-persistent mobile rate scenario  
> **Explicitly out of scope:** Editing a customer's contractual installment or loan from the bank dashboard/mobile app  
> **Owner decision:** A rate increase changes the projected amount still payable, not the current outstanding principal. The contractual installment remains unchanged until a separate, explicit installment-edit feature is approved.

This document is intentionally prescriptive. An implementation agent must follow it in order and must not invent alternate financial behavior.

## 1. Required outcome

There are two different flows. They must never share a write path.

### 1.1 Authoritative bank rate publication

The Bank Rate Simulator dashboard is the only application allowed to publish a new rate into an existing customer's real loan rate history.

Publishing a rate campaign must:

1. Target only eligible, allowlisted, open, conventional variable-rate loans from the selected institution.
2. Append one new `rate_periods` row per eligible loan.
3. Preserve genuine rate changes as a chronological sequence. Use `superseded_by` only when correcting an erroneous row, never merely because a later rate takes effect.
4. Use demo/dashboard provenance and the originating campaign ID.
5. Keep the persisted contractual installment unchanged.
6. Keep `loan_details.outstanding_balance` unchanged.
7. Re-run the existing finance-engine projection with `installmentPolicy: { kind: 'unchanged' }`.
8. Persist authoritative calculation runs and generate supported insights/notifications.
9. Show the projected impact as an estimate, never as confirmed bank contract data.

The dashboard's separate benchmark simulator remains informational. Recording a benchmark change must not modify `rate_periods`, loans, balances, installments, calculation runs, or insights.

### 1.2 Mobile customer what-if scenario

The existing mobile **Log Rate Change** action must become **What if the rate changes?**

The mobile scenario must:

1. Read the customer's authoritative persisted loan and rate history.
2. Accept a hypothetical annual rate and effective date.
3. Append the hypothetical period only to an in-memory copy of the rate history.
4. Run the finance engine with the contractual installment unchanged.
5. Clearly label every result as hypothetical/estimated.
6. Discard the hypothetical input and result when the route is left.

The mobile scenario must not:

- call `RatePeriodRepository.append`;
- insert/update/delete `rate_periods`;
- update the obligation or `loan_details`;
- update `outstanding_balance` or `installment`;
- persist a `calculation_run`;
- raise an insight;
- send a notification or email;
- mutate TanStack Query's authoritative loan/rate caches;
- create or populate `contractualBalloon`.

## 2. Financial meaning and labels

Do not confuse these values:

| Value                                            | Meaning                                                                    | May a hypothetical/published rate change overwrite it?  |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Current outstanding principal                    | Principal reported as owed now (`loan_details.outstanding_balance`)        | **No**                                                  |
| Contractual installment                          | Current agreed recurring payment (`loan_details.installment`)              | **No**                                                  |
| Projected scheduled payments from the as-of date | Future unchanged installments expected through payoff/original maturity    | Recalculated estimate only; not persisted into the loan |
| Projected residual at original maturity          | Estimated unpaid balance caused by the unchanged installment               | Recalculated estimate only                              |
| Projected total still payable to finish          | Future scheduled payments after the as-of date plus the projected residual | Recalculated estimate only                              |
| Contractual balloon                              | A final payment explicitly written into the contract                       | **Never infer or populate from this feature**           |

The customer-approved meaning of “the loan amount increases” is:

> The **projected total amount still payable from now until the loan is fully repaid** can increase. The current outstanding principal is not immediately rewritten.

Do not label the projected residual as a “balloon month,” “final installment,” or confirmed contractual amount. The UI may say that a balance is estimated to remain at the original maturity and that the bank must confirm its treatment.

### 2.1 Exact projected-total definition

The scenario needs one unambiguous derived figure:

`projectedTotalStillPayable = sum(schedule payment for entries after asOf) + projectedResidualAtMaturity`

Rules:

- Use `Money` only; no JavaScript `number` arithmetic.
- Use the schedule produced by the finance engine.
- A payment is future when its schedule `date` is strictly after the calculation `asOf` date.
- If the loan pays off early, the residual is zero and only remaining schedule payments are included.
- The residual is added as an amount required to finish repayment, but is not assigned to a particular month.
- This is an estimate based on the modeled schedule, not an official payoff quote.
- Baseline and hypothetical projections must use the same `asOf`, principal, term, start date, installment, and historical rate periods. Only the hypothetical rate period differs.

This is new financial output. It must live in `packages/finance-engine`, be registered/versioned, receive deterministic test vectors, and be documented in an ADR note. Do not calculate it in a React component, hook, route, dashboard service, or formatter.

## 3. Current implementation problems

An implementation agent must confirm these statements are still true before editing:

1. `apps/mobile/app/obligation/[id]/log-rate.tsx` calls `ObligationService.logRateChange`.
2. `apps/mobile/src/services/obligation-service.ts` calls `ratePeriodRepository.append`.
3. `apps/mobile/src/services/repositories/supabase/rate-period-repository.ts` inserts into the real `rate_periods` table.
4. Therefore, the current customer-facing action changes authoritative rate history and affects real calculations.
5. `apps/bank-simulator-dashboard/src/server/rate-campaign-publish-service.ts` already appends rate periods through `demo_publish_rate_campaign` and persists calculation runs/insights.
6. The campaign UI currently exposes `unchanged`, `recalculated`, and/or `unknownTreatment`. This conflicts with the approved behavior for publication: publishing a rate alone must not silently model a changed installment.
7. `demo_benchmark_rates` is intentionally disconnected from customer contracts and should remain so.

## 4. Binding architecture rules

Read these files completely before implementation:

- `AI_AGENT_RULES.md`
- `docs/INDEX.md`
- `docs/04-architecture/system-architecture.md`, especially section 2
- `docs/09-decisions/ADR-0007-finance-engine-isolation.md`
- `docs/09-decisions/ADR-0017-supabase-first-mvp-persistence.md`
- `docs/dashboard.md`, especially “Required variable-rate simulation behavior”
- `docs/03-domain/financial-calculation-spec.md`
- `docs/03-domain/data-provenance.md`
- `docs/05-data-api/database-schema.md`
- `docs/06-security-privacy/threat-model.md`
- `docs/07-quality-operations/testing-strategy.md`
- the Supabase skill instructions available to the agent

Keep dependency direction:

`UI -> application service -> domain/finance engine`

Infrastructure repositories may depend on domain contracts. UI code must not call Supabase or finance formulas directly.

Do not modify the arithmetic of `variableProjection.v1`. Reuse it from a new registered scenario formula. If existing signed-off output cannot support a required figure, stop and report a `DOC-ISSUE` rather than inventing another definition.

## 5. Workstream A — correct the product documentation first

The current documentation still defines mobile rate logging as a persistent write. Update it before code so the code has an authoritative specification.

### 5.1 Required documentation changes

Update these existing IDs; do not invent replacement requirement IDs:

- `FR-RATE-002`: customer can run a hypothetical rate-change scenario; it is not persisted. Only the authorized dashboard campaign can append a later authoritative rate period.
- `FR-RATE-003`: a dashboard-published/imported authoritative rate change triggers persisted recalculation and insights. A mobile hypothetical scenario triggers neither persistence nor insights.
- `FR-RATE-004`: include the approved distinction between outstanding principal, projected residual, and projected total still payable.
- `SCR-RATE-ADD`: rename/redefine it as a what-if rate scenario screen instead of a log-rate mutation modal.
- Rate-history screen secondary action: change “log rate change” to “try a different rate”/equivalent approved bilingual wording.
- `docs/04-architecture/system-architecture.md` section 3: replace the sequence in which mobile logging persists a rate with two sequences: dashboard authoritative publish and mobile ephemeral calculation.
- `docs/05-data-api/database-schema.md`: document that authenticated customers may create only the initial rate for a newly created owned loan; later periods are dashboard/service-role only.
- `docs/dashboard.md`: make `unchanged installment` the only publication behavior in this approved flow. Alternative servicing-policy exploration may remain documented as a future/non-publishing simulator concept, but must not be selectable during publication.

Add EN and AR copy together. Terminology must comply with the existing conventional-loan vocabulary. Do not apply conventional interest terminology to Islamic products; this feature must remain unavailable for Murabaha/Ijara/Diminishing Musharakah.

## 6. Workstream B — harden Supabase as the source of truth

Removing a button is not sufficient. An old or malicious mobile client must not be able to append a later rate or supersede a dashboard-published rate.

The project uses imperative migrations. Do not invent a timestamped migration filename manually. Run:

```text
npx supabase migration new restrict_customer_rate_history_writes
```

Then edit the generated migration using the repository's normal patch workflow.

### 6.1 Required database authorization behavior

After the migration:

- `authenticated` can select only its owned `rate_periods` rows.
- `authenticated` may insert the first/initial rate period for an owned loan during manual loan creation.
- `authenticated` cannot insert a second/later rate period for that loan.
- `authenticated` cannot update any rate-period column, including `superseded_by`.
- `authenticated` cannot delete rate periods.
- `anon` has no rate-period write access.
- The service-role dashboard publication can append a later effective rate without superseding valid history.
- Cross-user access remains impossible.

Use a database guard (trigger/function plus grants/RLS as appropriate) so “initial row only” is enforced atomically in Postgres. Account for concurrent inserts; serialize/check by `obligation_id` within the transaction rather than relying only on a client-side `historyFor` check.

Do not use `user_metadata` for authorization. Do not expose a service-role key to either client application.

### 6.2 Harden the dashboard RPC

`public.demo_publish_rate_campaign` is `SECURITY DEFINER`. PostgreSQL functions normally receive `EXECUTE` for `PUBLIC`, so an explicit `GRANT EXECUTE ... TO service_role` alone is insufficient.

For every current overload/signature of this function:

1. Revoke execute from `PUBLIC`, `anon`, and `authenticated`.
2. Grant execute only to `service_role`.
3. Retain the fixed `search_path`.
4. Keep the allowlist/institution/loan eligibility checks in the server service and RPC.
5. Add a database test proving an authenticated borrower cannot call it.

Run Supabase security advisors after the migration and address findings related to touched functions/policies. Do not broaden access to resolve a failing test.

### 6.3 Preserve initial manual-loan creation

The current mobile create-loan flow saves the obligation/details and then appends the initial rate. The hardening must preserve that supported flow.

Required tests:

- new owned conventional variable-rate loan + first rate succeeds;
- a second direct customer append fails;
- dashboard campaign append succeeds;
- loan editing preserves existing rate history;
- fixed-rate and Islamic products remain excluded from campaign publishing.

If atomic initial loan + initial rate creation is introduced, keep it a focused follow-up inside this workstream and test rollback of all rows on failure. Do not add customer installment editing.

## 7. Workstream C — make dashboard publication always preserve installment

### 7.1 UI and request contract

In `apps/bank-simulator-dashboard/src/app/bank-rate-simulator/`:

- Remove the publication control that lets the operator choose a recalculated installment policy.
- Show a read-only statement: “Existing installment remains unchanged.”
- Keep preview of the estimated consequences.
- Do not accept `servicingPolicy` from untrusted `FormData` for publication.

In the server publish request/repository boundary:

- Remove `servicingPolicy` from the public action/request shape where practical.
- Set the publication policy server-side to `unchanged`.
- If the database parameter remains for compatibility, always pass `'unchanged'` from this flow and reject any other publication value server-side.

### 7.2 Persistence invariants

Add regression tests around `publishCampaign` and the RPC proving that publishing:

- appends the expected rate-period row while preserving valid chronological history;
- does not update `loan_details.installment` or its provenance;
- does not update `loan_details.outstanding_balance` or its provenance;
- does not update `contractual_balloon`;
- persists projection/residual calculation runs using the unchanged installment;
- can generate the supported rate-increase/residual insights;
- cannot affect ineligible loans;
- does not turn a benchmark simulation record into a loan rate.

The existing `recalculated` formula policy may remain in the finance engine for other signed-off uses. Do not delete or change it. It is simply not selectable for this publication flow.

## 8. Workstream D — add a pure rate what-if formula

Create a new finance-engine formula instead of calculating scenario totals in UI/application code. Suggested registered ID: `rateChangeScenario`, version `1`. Before using this name, search the registry and docs; reuse an existing canonical ID if one already exists.

### 8.1 Inputs

Use domain value objects and existing domain types:

- original principal;
- authoritative rate periods;
- term months;
- start date;
- contractual installment;
- `asOf`;
- hypothetical annual `Rate`;
- hypothetical effective `LocalDate`.

### 8.2 Validation

Refuse safely when:

- required loan inputs are missing;
- the product is unsupported before the formula is called;
- the hypothetical date is before loan start or after contractual maturity;
- the hypothetical date duplicates/conflicts with an active authoritative period;
- the hypothetical rate is outside existing `Rate` validation;
- authoritative rate history is invalid.

The hypothetical period must use a deterministic in-memory ID/reference suitable for hashing. It must never be persisted and must be explicitly marked as hypothetical in the scenario result/provenance metadata used by UI.

### 8.3 Calculation

The formula must:

1. Run a baseline `variableProjection.v1` with authoritative rate periods and unchanged installment.
2. Create an in-memory rate-period list containing the hypothetical period, applying the same append/supersession semantics required by `validateRatePeriods` without mutating the input objects.
3. Run a hypothetical `variableProjection.v1` with unchanged installment.
4. Calculate baseline and hypothetical future scheduled payments after `asOf` using `Money`.
5. Add each projection's residual to obtain baseline/hypothetical `projectedTotalStillPayable`.
6. Return a comparison containing at least:
   - current authoritative rate;
   - hypothetical rate;
   - effective date;
   - unchanged installment;
   - baseline/hypothetical projected total still payable;
   - baseline/hypothetical projected residual at maturity;
   - baseline/hypothetical projected payoff period when available;
   - baseline/hypothetical next affected payment cost/principal allocation when available;
   - negative-amortization indicator;
   - confidence and assumptions through the normal engine outcome.

Do not call the database, clock, random UUID generator, logger, or notification code from the formula.

### 8.4 Formula governance

Required artifacts:

- formula implementation under `packages/finance-engine/src/formulas/`;
- registry type and registry entry;
- export from the package's established public API;
- unit tests for increase, decrease, no-op rate, early payoff, residual, negative amortization, boundary dates, invalid history, and missing inputs;
- deterministic JSON test vectors under `packages/finance-engine/vectors/` following existing naming conventions;
- property/determinism coverage where the current formula test structure supports it;
- an ADR note documenting the exact projected-total definition and why the figure is not an outstanding-principal mutation.

Do not change `variableProjection.v1` expected values.

## 9. Workstream E — replace mobile persistence with an ephemeral service

### 9.1 Application service

Create a focused application service such as `RateWhatIfService` under `apps/mobile/src/services/`.

It must:

- accept already-read loan/rate data and hypothetical input;
- call the registered `rateChangeScenario.v1` formula;
- return a `Result`/engine outcome in the repository's existing error style;
- perform no repository writes;
- not depend on `CalculationRunRepository`;
- not use `CalculationService.runCalculation`, because that method persists a calculation run;
- have unit tests with repository write spies proving zero writes.

### 9.2 Hook and screen

Replace/rework:

- `apps/mobile/app/obligation/[id]/log-rate.tsx`
- the navigation row in `apps/mobile/app/obligation/[id].tsx`
- associated feature hooks/components following the repository's feature-folder law

Preferred route behavior:

- The route may remain temporarily for deep-link compatibility, but its visible title and function become the what-if scenario.
- Use component/hook state for the draft rate, effective date, and result.
- Debounce calculation if needed using the existing scenario pattern.
- Do not store the scenario in AsyncStorage, SecureStore, Zustand persistence, Supabase, or demo repositories.
- On unmount, no scenario data remains. If TanStack Query is used for calculation, give it an ephemeral key, `gcTime: 0`, and explicitly remove it on unmount. Simpler local state is preferred.
- Invalidate no authoritative query after calculating.

### 9.3 Mobile presentation

Show:

- persistent current outstanding principal, explicitly labeled “unchanged in this scenario”;
- persistent contractual installment, explicitly labeled “unchanged in this scenario”;
- current published rate and hypothetical rate;
- effective date;
- baseline versus hypothetical projected total still payable;
- baseline versus hypothetical projected residual at original maturity;
- change in cost/principal allocation when supported;
- payoff timing/negative-amortization explanation when supported;
- estimate/confidence/assumption/provenance treatment using existing design-system primitives;
- a persistent scenario notice such as “What-if only — this does not change your loan.”

Do not show a save/publish/log button. The primary action is “Calculate”/“Update scenario”; navigation away discards it.

Add all user-visible strings in both:

- `apps/mobile/src/i18n/translations/en.json`
- `apps/mobile/src/i18n/translations/ar.json`

Use existing formatting helpers and `Amount`/provenance primitives. No `toFixed`, raw monetary arithmetic, hard-coded colors, or ad hoc fallback English strings.

### 9.4 Remove the obsolete mobile write path

After the screen no longer uses it:

- remove `ObligationService.logRateChange` if no other approved caller remains;
- remove/update its tests that assert customer persistence;
- keep the repository `append` contract only if it is still required for initial loan creation/import infrastructure;
- do not expose a general “append later rate” customer service method;
- ensure deep links and screen inventory reference the what-if behavior.

## 10. Tests and verification

### 10.1 Finance engine

Run the focused new formula tests and the full finance-engine suite. Confirm:

- deterministic output for identical inputs;
- baseline equals hypothetical for a no-op rate;
- a rate increase with unchanged installment cannot lower the modeled financing cost under the signed-off test vector;
- current outstanding principal input is never mutated;
- projected total still payable uses only schedule entries strictly after `asOf` plus residual;
- residual is never copied to `contractualBalloon`.

### 10.2 Mobile unit/component tests

Required assertions:

- screen loads authoritative rate history;
- invalid rate/date shows localized validation;
- calculation renders a clearly hypothetical result;
- navigating away and reopening starts with an empty scenario draft/result;
- no call is made to `ratePeriodRepository.append`;
- no call is made to `obligationRepository.save`;
- no call is made to `calculationRunRepository.save`;
- no insight/notification write occurs;
- current outstanding principal and installment remain unchanged in rendered comparison;
- EN and AR render without missing keys; RTL layout remains valid.

### 10.3 Dashboard tests

Required assertions:

- publication action ignores/rejects an injected recalculated policy;
- server sends `unchanged` to the projection and RPC;
- preview and publish use the same policy;
- benchmark record creation never calls the campaign publisher;
- installment/balance/contractual-balloon rows are byte/value unchanged after publication.

### 10.4 Database tests

Extend pgTAP/database tests to prove:

- borrower can select own rate history;
- borrower cannot select another user's history;
- borrower can create only the initial rate for an owned new loan;
- borrower cannot append a later rate directly;
- borrower cannot update/supersede/delete a rate;
- borrower/anon cannot execute `demo_publish_rate_campaign`;
- service role can publish a later effective rate while retaining prior valid periods;
- the applicable rate is the latest non-corrected period effective on or before the calculation date;
- failed publication is atomic;
- publication leaves installment, outstanding balance, their provenance, and contractual balloon unchanged.

### 10.5 Commands

Discover the installed Supabase CLI commands using `npx supabase --help` before relying on command syntax. Then run, at minimum:

```text
pnpm --filter @eltizamati/finance-engine test
pnpm --filter @eltizamati/mobile test
pnpm --filter bank-simulator-dashboard test
pnpm run supabase:reset
pnpm run supabase:test
pnpm run supabase:gen-types
pnpm run test:integration
pnpm run check
```

Generate types after the final local migration state. Regenerate twice and confirm the second generation produces no diff.

Perform a manual EN and AR walkthrough:

1. Publish a dashboard campaign for an allowlisted variable-rate test loan.
2. Confirm mobile rate history shows the published rate.
3. Confirm installment and current outstanding principal are unchanged.
4. Confirm authoritative projected values update.
5. Open the mobile what-if screen and calculate another hypothetical rate.
6. Confirm the scenario differs on screen but rate history does not change.
7. Leave and reopen; confirm the scenario was discarded.
8. Refresh/restart the app; confirm only the dashboard-published rate remains.

## 11. Acceptance criteria

Implementation is complete only when all statements below are true:

- [ ] Dashboard rate campaign is the only path that can append a later authoritative customer rate.
- [ ] Benchmark simulator cannot change a loan.
- [ ] Mobile customer cannot append, edit, supersede, or delete authoritative rate history.
- [ ] Mobile customer can create an ephemeral rate what-if scenario.
- [ ] The scenario creates no persistent rows and no notifications/insights.
- [ ] Leaving the scenario discards its inputs/results.
- [ ] Published and hypothetical rate changes preserve the stored installment.
- [ ] Published and hypothetical rate changes preserve current `outstanding_balance`.
- [ ] UI distinguishes current outstanding principal from projected total still payable.
- [ ] Projected total still payable follows the exact definition in section 2.1.
- [ ] Projected residual is not represented as a contractual balloon or assigned to a balloon month.
- [ ] Dashboard publication calculations use `installmentPolicy: unchanged`.
- [ ] All new copy exists in English and Arabic.
- [ ] Database enforcement blocks old/malicious customer clients, not only the new UI.
- [ ] Finance, mobile, dashboard, pgTAP, integration, lint, typecheck, dependency, and formatting checks pass.
- [ ] No customer-loan/installment editing feature was implemented.

## 12. Explicit non-goals for this change

Do not implement any of the following without a new owner approval:

- dashboard editing of a customer's installment;
- mobile self-service contractual installment changes;
- approval workflows for installment changes;
- replacing an outstanding principal with a projected payoff amount;
- automatically extending contractual maturity;
- generating a balloon/final-payment row;
- inferring a loan rate directly from a benchmark rate;
- applying campaigns to fixed-rate or Islamic products;
- saving customer what-if scenarios;
- changing signed-off `variableProjection.v1` arithmetic.

## 13. Implementation order and stop gates

Follow this order:

1. Update the requirements/architecture documentation.
2. Add database tests that fail under current permissions.
3. Add the migration and make the database tests pass.
4. Add the new finance-engine formula, vectors, and ADR note.
5. Add the ephemeral mobile application service and tests.
6. Replace the mobile screen/navigation/copy.
7. Lock dashboard publication to unchanged installment and add regression tests.
8. Regenerate Supabase types.
9. Run focused tests, full `pnpm run check`, database tests, integration tests, and manual EN/AR verification.

Stop and report instead of guessing if:

- finance-approved expected values are missing for the new projected-total vectors;
- existing requirements conflict after the documentation update;
- preserving initial manual-loan creation requires a materially larger authorization redesign;
- local Supabase cannot be started/reset after two or three investigated attempts;
- any proposed fix would expose `service_role`, weaken RLS, or grant dashboard RPC execution to customers;
- any work starts to implement customer installment editing.

## 14. Required final implementation report

The implementing agent must report:

- concise summary of behavior changed;
- migration name and authorization model;
- exact formula ID/version and projected-total definition;
- files changed grouped by docs/database/engine/mobile/dashboard;
- focused and full verification commands with pass/fail counts;
- manual EN/AR walkthrough result;
- confirmation that no hosted migration was applied unless separately authorized;
- confirmation that no real customer data was accessed;
- `ASSUMPTION:` lines for any approved assumptions;
- `DOC-ISSUE:` lines for unresolved documentation gaps;
- explicit statement that customer installment editing remains unimplemented.
