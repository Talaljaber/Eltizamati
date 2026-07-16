-- Demo obligations seed — NOT wired into supabase/config.toml's db.seed.sql_paths on
-- purpose, so `supabase db reset` never runs this automatically (it would collide with
-- the pgTAP fixtures in supabase/tests/database, which expect a pristine schema). This
-- is a manual script: paste it into the Supabase SQL editor (or `psql`) against your own
-- project and run it once. It is idempotent — safe to re-run, it upserts by fixed id.
--
-- Seeds 10 obligations (5 per user) across both existing demo accounts from
-- supabase/migrations/profiles_rows.csv, spanning every obligation kind the dashboard
-- reads (conventionalLoan fixed + variable, murabaha, creditCard), several institutions,
-- a closed obligation, a loan missing outstandingBalance (exclusion-reason testing), a
-- high-utilization card, an upcoming-maturity loan, rate-period history (including a
-- superseded period), a handful of payments, one refused calculation_run, one raised
-- insight (HIGH_CARD_UTILIZATION — the one insight here that's a simple deterministic
-- function of the seeded data, so it's not a fabricated financial figure), and one
-- consent_record per user.
--
-- Run as the Postgres owner / in the SQL editor (bypasses RLS) — these are NOT run
-- through save_conventional_loan/save_murabaha/save_card, since those require
-- auth.uid() from an authenticated session, which a SQL-editor script does not have.
--
-- DEMO_ALLOWED_USER_IDS for the dashboard should include both ids below to see this data:
--   6714518c-d9b3-4d09-bbbc-df22401816d6,7d1fbec3-5af3-425c-a863-f5e33571f332

begin;

-- ─── Provenance helper ───────────────────────────────────────────────────────
-- Builds a Provenance-shaped jsonb value (packages/domain/src/value-objects/provenance.ts).
create or replace function pg_temp.prov(
  p_source text,
  p_observed_at text,
  p_recorded_at text,
  p_provider_id text default null,
  p_source_reference text default null
) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'source', p_source,
    'providerId', p_provider_id,
    'observedAt', p_observed_at || 'T00:00:00.000Z',
    'recordedAt', p_recorded_at || 'T00:00:00.000Z',
    'sourceReference', p_source_reference
  ));
$$;

-- ─── User 1: 6714518c-d9b3-4d09-bbbc-df22401816d6 (Talal Jaber / Arab) ───────

-- L1: variable-rate conventional loan, Arab Bank — has rate history (one superseded
-- period + one active) and an estimated outstanding balance, so it's eligible for the
-- Bank Rate Simulator and exercises the "estimated" provenance bucket.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, notes, provenance_json)
values ('a1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6', 'conventionalLoan',
  'Car loan', 'Arab Bank', 'arab-bank', '2022-01-01', 'Seed data for dashboard testing.',
  pg_temp.prov('userEntered', '2022-01-01', '2022-01-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  outstanding_balance, outstanding_balance_prov, installment, installment_prov, rate_type,
  term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  12000.000, pg_temp.prov('userEntered', '2022-01-01', '2022-01-01', 'manual'),
  5200.000, pg_temp.prov('estimate', '2026-07-01', '2026-07-01', null, 'seed-estimate'),
  230.500, pg_temp.prov('userEntered', '2022-01-01', '2022-01-01', 'manual'),
  'variable', 60, pg_temp.prov('userEntered', '2022-01-01', '2022-01-01', 'manual'),
  '2022-01-01', '2027-01-01', 'auto')
on conflict (obligation_id) do update set outstanding_balance = excluded.outstanding_balance;

-- Inserted without the superseded_by link first (the linked row doesn't exist yet), then
-- set via UPDATE below — this mirrors BR-RATE-001's real append-only correction pattern:
-- insert the new period, then update only the old period's superseded_by column.
insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
  '6714518c-d9b3-4d09-bbbc-df22401816d6', 0.065000, '2022-01-01',
  pg_temp.prov('userEntered', '2022-01-01', '2022-01-01', 'manual'))
on conflict (id) do nothing;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001',
  '6714518c-d9b3-4d09-bbbc-df22401816d6', 0.082500, '2024-06-01',
  pg_temp.prov('userEntered', '2024-06-01', '2024-06-01', 'manual'))
on conflict (id) do nothing;

update public.rate_periods set superseded_by = 'b1000000-0000-4000-8000-000000000002'
where id = 'b1000000-0000-4000-8000-000000000001';

-- L2: fixed-rate conventional loan, Housing Bank — official-sourced (mirrors an
-- open-banking-style feed), for the "official" provenance bucket and for exercising the
-- Bank Rate Simulator's fixedRate exclusion reason.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a1000000-0000-4000-8000-000000000002', '6714518c-d9b3-4d09-bbbc-df22401816d6', 'conventionalLoan',
  'Home loan', 'Housing Bank', 'housing-bank', '2020-03-01',
  pg_temp.prov('official', '2020-03-01', '2020-03-01', 'openbanking:housing-bank'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  outstanding_balance, outstanding_balance_prov, installment, installment_prov, rate_type,
  term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a1000000-0000-4000-8000-000000000002', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  85000.000, pg_temp.prov('official', '2020-03-01', '2020-03-01', 'openbanking:housing-bank'),
  71340.250, pg_temp.prov('official', '2026-07-01', '2026-07-01', 'openbanking:housing-bank'),
  520.750, pg_temp.prov('official', '2020-03-01', '2020-03-01', 'openbanking:housing-bank'),
  'fixed', 240, pg_temp.prov('official', '2020-03-01', '2020-03-01', 'openbanking:housing-bank'),
  '2020-03-01', '2040-03-01', 'housing')
on conflict (obligation_id) do update set outstanding_balance = excluded.outstanding_balance;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002',
  '6714518c-d9b3-4d09-bbbc-df22401816d6', 0.059000, '2020-03-01',
  pg_temp.prov('official', '2020-03-01', '2020-03-01', 'openbanking:housing-bank'))
on conflict (id) do nothing;

-- L3: variable-rate conventional loan, Arab Bank, with NO outstanding balance on file —
-- exercises the Bank Rate Simulator's missingBalance exclusion reason and the impact
-- preview's "unavailable" refusal path.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a1000000-0000-4000-8000-000000000003', '6714518c-d9b3-4d09-bbbc-df22401816d6', 'conventionalLoan',
  'Business loan', 'Arab Bank', 'arab-bank', '2023-05-01',
  pg_temp.prov('userEntered', '2023-05-01', '2023-05-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a1000000-0000-4000-8000-000000000003', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  30000.000, pg_temp.prov('userEntered', '2023-05-01', '2023-05-01', 'manual'),
  715.250, pg_temp.prov('userEntered', '2023-05-01', '2023-05-01', 'manual'),
  'variable', 48, pg_temp.prov('userEntered', '2023-05-01', '2023-05-01', 'manual'),
  '2023-05-01', '2027-05-01', 'other')
on conflict (obligation_id) do update set installment = excluded.installment;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003',
  '6714518c-d9b3-4d09-bbbc-df22401816d6', 0.070000, '2023-05-01',
  pg_temp.prov('userEntered', '2023-05-01', '2023-05-01', 'manual'))
on conflict (id) do nothing;

-- M1: Murabaha, Cairo Amman Bank.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a1000000-0000-4000-8000-000000000004', '6714518c-d9b3-4d09-bbbc-df22401816d6', 'murabaha',
  'Furniture Murabaha', 'Cairo Amman Bank', 'cairo-amman-bank', '2025-08-01',
  pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.murabaha_details (obligation_id, user_id, asset_cost, asset_cost_prov,
  disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov,
  installment, installment_prov, term_months, term_months_prov, start_date, profit_rate_disclosed)
values ('a1000000-0000-4000-8000-000000000004', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  3000.000, pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'),
  450.000, pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'),
  3450.000, pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'),
  143.750, pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'),
  24, pg_temp.prov('userEntered', '2025-08-01', '2025-08-01', 'manual'),
  '2025-08-01', 0.150000)
on conflict (obligation_id) do update set installment = excluded.installment;

-- C1: Credit card, Arab Bank, high utilization (82.5% > the 70% FR-INS-001 threshold) —
-- deliberately set up to trigger the HIGH_CARD_UTILIZATION insight below.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a1000000-0000-4000-8000-000000000005', '6714518c-d9b3-4d09-bbbc-df22401816d6', 'creditCard',
  'Visa Platinum', 'Arab Bank', 'arab-bank', '2021-06-01',
  pg_temp.prov('userEntered', '2021-06-01', '2021-06-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.card_details (obligation_id, user_id, credit_limit, credit_limit_prov,
  current_balance, current_balance_prov, purchase_apr, purchase_apr_prov, due_date, grace_days)
values ('a1000000-0000-4000-8000-000000000005', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  2000.000, pg_temp.prov('userEntered', '2021-06-01', '2021-06-01', 'manual'),
  1650.000, pg_temp.prov('userEntered', '2026-07-10', '2026-07-10', 'manual'),
  0.280000, pg_temp.prov('userEntered', '2021-06-01', '2021-06-01', 'manual'),
  '2026-08-05', 21)
on conflict (obligation_id) do update set current_balance = excluded.current_balance;

insert into public.insights (id, user_id, obligation_id, rule_id, severity, title_key, body_key, params_json, trigger_hash)
values ('c1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6',
  'a1000000-0000-4000-8000-000000000005', 'HIGH_CARD_UTILIZATION', 'attention',
  'insights.highUtilization.title', 'insights.highUtilization.body',
  jsonb_build_object('percent', 82.5), 'seed-high-util-c1')
on conflict (rule_id, obligation_id, trigger_hash) do nothing;

-- Payments against L1 — two plain, one with an official principal/cost allocation.
insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json)
values
  ('a1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6', '2026-04-16', 230.500,
    pg_temp.prov('userEntered', '2026-04-16', '2026-04-16', 'manual')),
  ('a1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6', '2026-05-16', 230.500,
    pg_temp.prov('userEntered', '2026-05-16', '2026-05-16', 'manual'));

insert into public.payments (obligation_id, user_id, paid_on, amount, alloc_principal, alloc_cost, alloc_source, provenance_json)
values ('a1000000-0000-4000-8000-000000000001', '6714518c-d9b3-4d09-bbbc-df22401816d6', '2026-06-16', 230.500,
  158.200, 72.300, 'estimated', pg_temp.prov('userEntered', '2026-06-16', '2026-06-16', 'manual'));

-- One refused calculation_run for L3 (missing outstandingBalance) — metadata only, not a
-- fabricated financial figure, so it's safe to seed directly.
insert into public.calculation_runs (user_id, obligation_id, formula_id, formula_version, as_of,
  inputs_json, inputs_hash, outcome_kind, missing_fields_json, assumptions_json, calculated_at)
values ('6714518c-d9b3-4d09-bbbc-df22401816d6', 'a1000000-0000-4000-8000-000000000003',
  'variableProjection', 1, '2026-07-16',
  jsonb_build_object('obligationId', 'a1000000-0000-4000-8000-000000000003', 'note', 'seed placeholder — no real engine run'),
  'seed-hash-l3-refused', 'refused',
  jsonb_build_array('loanDetails.outstandingBalance'), '[]'::jsonb, now());

insert into public.consent_records (user_id, doc_type, version, locale, acknowledged_at)
values ('6714518c-d9b3-4d09-bbbc-df22401816d6', 'terms', 'v1', 'en', now());

-- ─── User 2: 7d1fbec3-5af3-425c-a863-f5e33571f332 (Talal Jaber / Arab bank) ──

-- L4: variable-rate conventional loan, Arab Bank — plain eligible case, single active
-- rate period (no history), to contrast with L1's multi-period history.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a2000000-0000-4000-8000-000000000001', '7d1fbec3-5af3-425c-a863-f5e33571f332', 'conventionalLoan',
  'Personal loan', 'Arab Bank', 'arab-bank', '2024-01-15',
  pg_temp.prov('userEntered', '2024-01-15', '2024-01-15', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  outstanding_balance, outstanding_balance_prov, installment, installment_prov, rate_type,
  term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a2000000-0000-4000-8000-000000000001', '7d1fbec3-5af3-425c-a863-f5e33571f332',
  8000.000, pg_temp.prov('userEntered', '2024-01-15', '2024-01-15', 'manual'),
  5100.000, pg_temp.prov('userEntered', '2026-07-01', '2026-07-01', 'manual'),
  246.500, pg_temp.prov('userEntered', '2024-01-15', '2024-01-15', 'manual'),
  'variable', 36, pg_temp.prov('userEntered', '2024-01-15', '2024-01-15', 'manual'),
  '2024-01-15', '2027-01-15', 'personal')
on conflict (obligation_id) do update set outstanding_balance = excluded.outstanding_balance;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
  '7d1fbec3-5af3-425c-a863-f5e33571f332', 0.067500, '2024-01-15',
  pg_temp.prov('userEntered', '2024-01-15', '2024-01-15', 'manual'))
on conflict (id) do nothing;

-- L5: variable-rate conventional loan, Housing Bank — maturity set within the Overview's
-- 90-day upcoming-maturity horizon of 2026-07-16 (today), to exercise that stat tile.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a2000000-0000-4000-8000-000000000002', '7d1fbec3-5af3-425c-a863-f5e33571f332', 'conventionalLoan',
  'Renovation loan', 'Housing Bank', 'housing-bank', '2021-09-01',
  pg_temp.prov('userEntered', '2021-09-01', '2021-09-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  outstanding_balance, outstanding_balance_prov, installment, installment_prov, rate_type,
  term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a2000000-0000-4000-8000-000000000002', '7d1fbec3-5af3-425c-a863-f5e33571f332',
  15000.000, pg_temp.prov('userEntered', '2021-09-01', '2021-09-01', 'manual'),
  1200.500, pg_temp.prov('userEntered', '2026-07-01', '2026-07-01', 'manual'),
  650.000, pg_temp.prov('userEntered', '2021-09-01', '2021-09-01', 'manual'),
  'variable', 58, pg_temp.prov('userEntered', '2021-09-01', '2021-09-01', 'manual'),
  '2021-09-01', '2026-09-10', 'other')
on conflict (obligation_id) do update set outstanding_balance = excluded.outstanding_balance;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002',
  '7d1fbec3-5af3-425c-a863-f5e33571f332', 0.075000, '2023-11-01',
  pg_temp.prov('userEntered', '2023-11-01', '2023-11-01', 'manual'))
on conflict (id) do nothing;

-- L6: closed conventional loan, Arab Bank — exercises the "closed" exclusion reason and
-- the Client directory / Portfolio "active vs. closed" filters.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, closed_date, provenance_json)
values ('a2000000-0000-4000-8000-000000000003', '7d1fbec3-5af3-425c-a863-f5e33571f332', 'conventionalLoan',
  'Old car loan', 'Arab Bank', 'arab-bank', '2018-01-01', '2023-01-01',
  pg_temp.prov('userEntered', '2018-01-01', '2018-01-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov,
  outstanding_balance, outstanding_balance_prov, installment, installment_prov, rate_type,
  term_months, term_months_prov, start_date, maturity_date, purpose)
values ('a2000000-0000-4000-8000-000000000003', '7d1fbec3-5af3-425c-a863-f5e33571f332',
  9000.000, pg_temp.prov('userEntered', '2018-01-01', '2018-01-01', 'manual'),
  0.000, pg_temp.prov('userEntered', '2023-01-01', '2023-01-01', 'manual'),
  180.000, pg_temp.prov('userEntered', '2018-01-01', '2018-01-01', 'manual'),
  'fixed', 60, pg_temp.prov('userEntered', '2018-01-01', '2018-01-01', 'manual'),
  '2018-01-01', '2023-01-01', 'auto')
on conflict (obligation_id) do update set outstanding_balance = excluded.outstanding_balance;

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('b2000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000003',
  '7d1fbec3-5af3-425c-a863-f5e33571f332', 0.060000, '2018-01-01',
  pg_temp.prov('userEntered', '2018-01-01', '2018-01-01', 'manual'))
on conflict (id) do nothing;

-- M2: Murabaha, Arab Bank.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a2000000-0000-4000-8000-000000000004', '7d1fbec3-5af3-425c-a863-f5e33571f332', 'murabaha',
  'Appliance Murabaha', 'Arab Bank', 'arab-bank', '2025-10-01',
  pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.murabaha_details (obligation_id, user_id, asset_cost, asset_cost_prov,
  disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov,
  installment, installment_prov, term_months, term_months_prov, start_date, profit_rate_disclosed)
values ('a2000000-0000-4000-8000-000000000004', '7d1fbec3-5af3-425c-a863-f5e33571f332',
  1800.000, pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'),
  270.000, pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'),
  2070.000, pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'),
  86.250, pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'),
  24, pg_temp.prov('userEntered', '2025-10-01', '2025-10-01', 'manual'),
  '2025-10-01', 0.150000)
on conflict (obligation_id) do update set installment = excluded.installment;

-- C2: Credit card, Cairo Amman Bank, low utilization (15%) — contrast case for C1.
insert into public.obligations (id, user_id, kind, nickname, institution_name, institution_id, opened_date, provenance_json)
values ('a2000000-0000-4000-8000-000000000005', '7d1fbec3-5af3-425c-a863-f5e33571f332', 'creditCard',
  'Mastercard Gold', 'Cairo Amman Bank', 'cairo-amman-bank', '2022-02-01',
  pg_temp.prov('userEntered', '2022-02-01', '2022-02-01', 'manual'))
on conflict (id) do update set nickname = excluded.nickname, updated_at = now();

insert into public.card_details (obligation_id, user_id, credit_limit, credit_limit_prov,
  current_balance, current_balance_prov, purchase_apr, purchase_apr_prov, due_date, grace_days)
values ('a2000000-0000-4000-8000-000000000005', '7d1fbec3-5af3-425c-a863-f5e33571f332',
  3000.000, pg_temp.prov('userEntered', '2022-02-01', '2022-02-01', 'manual'),
  450.000, pg_temp.prov('userEntered', '2026-07-10', '2026-07-10', 'manual'),
  0.260000, pg_temp.prov('userEntered', '2022-02-01', '2022-02-01', 'manual'),
  '2026-08-12', 21)
on conflict (obligation_id) do update set current_balance = excluded.current_balance;

-- Payments against L4 — plain, no allocation.
insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json)
values
  ('a2000000-0000-4000-8000-000000000001', '7d1fbec3-5af3-425c-a863-f5e33571f332', '2026-05-15', 246.500,
    pg_temp.prov('userEntered', '2026-05-15', '2026-05-15', 'manual')),
  ('a2000000-0000-4000-8000-000000000001', '7d1fbec3-5af3-425c-a863-f5e33571f332', '2026-06-15', 246.500,
    pg_temp.prov('userEntered', '2026-06-15', '2026-06-15', 'manual'));

insert into public.consent_records (user_id, doc_type, version, locale, acknowledged_at)
values ('7d1fbec3-5af3-425c-a863-f5e33571f332', 'terms', 'v1', 'en', now());

commit;

-- ─── After running ──────────────────────────────────────────────────────────
-- Set (or extend) DEMO_ALLOWED_USER_IDS in apps/bank-simulator-dashboard/.env.local:
--   DEMO_ALLOWED_USER_IDS=6714518c-d9b3-4d09-bbbc-df22401816d6,7d1fbec3-5af3-425c-a863-f5e33571f332
-- then restart `pnpm run dev`. Institutions seeded: Arab Bank, Housing Bank, Cairo Amman
-- Bank — use any of those in the Bank Rate Simulator's institution picker.
