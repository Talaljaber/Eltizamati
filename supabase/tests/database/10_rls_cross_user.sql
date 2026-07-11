-- pgTAP: cross-user RLS denial matrix (database-schema.md §4).
-- Two test users (A, B); user A owns one row in every user-owned table; every assertion
-- verifies user B's session cannot see, create-as, modify, or delete user A's rows.
--
-- auth.uid() convention (Supabase local stack): reads request.jwt.claims->>'sub' under the
-- `authenticated` role. Switching identity = `set local role authenticated;` +
-- `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';` inside the same
-- transaction pgTAP already wraps this file in.

begin;
select plan(43);

-- ─── Fixtures (inserted as postgres/superuser, which bypasses RLS) ────────────────────────

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'user-a@eltizamati.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b@eltizamati.test');

-- One obligation per detail kind for user A, so every detail table has a fixture row.
insert into public.obligations
  (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'conventionalLoan', 'Loan', 'Bank', 'JOD', '2024-01-15', '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'murabaha', 'Murabaha', 'Bank', 'JOD', '2024-01-15', '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}'),
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'creditCard', 'Card', 'Bank', 'JOD', '2024-01-15', '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}');

insert into public.loan_details
  (obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 20000, '{}', 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15');

insert into public.murabaha_details
  (obligation_id, user_id, asset_cost, asset_cost_prov, disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov, installment, installment_prov, term_months, term_months_prov, start_date)
values
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 15000, '{}', 3600, '{}', 18600, '{}', 221.4286, '{}', 84, '{}', '2024-01-15');

insert into public.card_details
  (obligation_id, user_id, credit_limit, credit_limit_prov, current_balance, current_balance_prov)
values
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 3000, '{}', 2350, '{}');

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.075, '2024-01-15', '{}');

insert into public.payments (id, obligation_id, user_id, paid_on, amount, provenance_json)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-02-15', 307, '{}');

insert into public.calculation_runs (id, user_id, obligation_id, formula_id, formula_version, as_of, inputs_json, inputs_hash, outcome_kind, confidence, result_json, assumptions_json, calculated_at)
values ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'amortization', 1, '2026-07-01', '{}', 'deadbeef', 'result', 'high', '{}', '[]', now());

insert into public.insights (id, user_id, obligation_id, rule_id, severity, title_key, body_key, trigger_hash, created_at)
values ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'test.rule', 'info', 'insight.title', 'insight.body', 'hash-1', now());

insert into public.consent_records (id, user_id, doc_type, version, locale, acknowledged_at)
values ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'privacy-policy', 'v1', 'en', now());

insert into public.profiles (user_id, locale, data_mode)
values ('a0000000-0000-0000-0000-00000000000a', 'en', 'personal');

-- ─── Switch identity to user B ─────────────────────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}';

-- ─── SELECT denial (10 tables) ──────────────────────────────────────────────────────────────

select is((select count(*) from public.profiles)::int, 0, 'profiles: user B sees zero of user A''s rows');
select is((select count(*) from public.obligations)::int, 0, 'obligations: user B sees zero of user A''s rows');
select is((select count(*) from public.loan_details)::int, 0, 'loan_details: user B sees zero of user A''s rows');
select is((select count(*) from public.murabaha_details)::int, 0, 'murabaha_details: user B sees zero of user A''s rows');
select is((select count(*) from public.card_details)::int, 0, 'card_details: user B sees zero of user A''s rows');
select is((select count(*) from public.rate_periods)::int, 0, 'rate_periods: user B sees zero of user A''s rows');
select is((select count(*) from public.payments)::int, 0, 'payments: user B sees zero of user A''s rows');
select is((select count(*) from public.calculation_runs)::int, 0, 'calculation_runs: user B sees zero of user A''s rows');
select is((select count(*) from public.insights)::int, 0, 'insights: user B sees zero of user A''s rows');
select is((select count(*) from public.consent_records)::int, 0, 'consent_records: user B sees zero of user A''s rows');

-- ─── INSERT denial: user B cannot create a row claiming to be user A's (WITH CHECK) ────────

select throws_ok(
  $$insert into public.profiles (user_id, locale, data_mode) values ('a0000000-0000-0000-0000-00000000000a', 'en', 'personal')$$,
  '42501', null, 'profiles: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.obligations (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json) values ('19999999-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'genericFacility', 'x', 'x', 'JOD', '2024-01-01', '{}')$$,
  '42501', null, 'obligations: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.loan_details (obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 1, '{}', 1, '{}', 'fixed', 1, '{}', '2024-01-01', '2024-02-01')$$,
  '42501', null, 'loan_details: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.murabaha_details (obligation_id, user_id, asset_cost, asset_cost_prov, disclosed_profit, disclosed_profit_prov, total_sale_price, total_sale_price_prov, installment, installment_prov, term_months, term_months_prov, start_date) values ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 1, '{}', 0, '{}', 1, '{}', 1, '{}', 1, '{}', '2024-01-01')$$,
  '42501', null, 'murabaha_details: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.card_details (obligation_id, user_id, credit_limit, credit_limit_prov, current_balance, current_balance_prov) values ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 100, '{}', 0, '{}')$$,
  '42501', null, 'card_details: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.05, '2025-01-01', '{}')$$,
  '42501', null, 'rate_periods: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json) values ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-03-15', 100, '{}')$$,
  '42501', null, 'payments: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.calculation_runs (user_id, obligation_id, formula_id, formula_version, as_of, inputs_json, inputs_hash, outcome_kind, confidence, result_json, assumptions_json, calculated_at) values ('a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'amortization', 1, '2026-07-01', '{}', 'abc', 'result', 'high', '{}', '[]', now())$$,
  '42501', null, 'calculation_runs: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.insights (user_id, obligation_id, rule_id, severity, title_key, body_key, trigger_hash, created_at) values ('a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'r', 'info', 't', 'b', 'h2', now())$$,
  '42501', null, 'insights: user B cannot insert a row owned by user A'
);
select throws_ok(
  $$insert into public.consent_records (user_id, doc_type, version, locale, acknowledged_at) values ('a0000000-0000-0000-0000-00000000000a', 'privacy-policy', 'v2', 'en', now())$$,
  '42501', null, 'consent_records: user B cannot insert a row owned by user A'
);

-- ─── UPDATE denial: filtered to zero rows by USING, not an exception ───────────────────────

select is((with u as (update public.profiles set locale = 'ar' where user_id = 'a0000000-0000-0000-0000-00000000000a' returning 1) select count(*)::int from u), 0, 'profiles: user B updates zero of user A''s rows');
select is((with u as (update public.obligations set nickname = 'hijacked' where id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'obligations: user B updates zero of user A''s rows');
select is((with u as (update public.loan_details set installment = 999 where obligation_id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'loan_details: user B updates zero of user A''s rows');
select is((with u as (update public.murabaha_details set installment = 999 where obligation_id = '10000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from u), 0, 'murabaha_details: user B updates zero of user A''s rows');
select is((with u as (update public.card_details set current_balance = 0 where obligation_id = '10000000-0000-0000-0000-000000000003' returning 1) select count(*)::int from u), 0, 'card_details: user B updates zero of user A''s rows');
select is((with u as (update public.rate_periods set annual_rate = 0.99 where id = '20000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'rate_periods: user B updates zero of user A''s rows');
select is((with u as (update public.payments set amount = 1 where id = '30000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'payments: user B updates zero of user A''s rows');
select is((with u as (update public.insights set read_at = now() where id = '50000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'insights: user B updates zero of user A''s rows');

-- ─── DELETE denial: tables with a delete policy — filtered to zero rows for the wrong user ──

select is((with d as (delete from public.insights where id = '50000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'insights: user B deletes zero of user A''s rows');
select is((with d as (delete from public.calculation_runs where id = '40000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'calculation_runs: user B deletes zero of user A''s rows');
select is((with d as (delete from public.payments where id = '30000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'payments: user B deletes zero of user A''s rows');
select is((with d as (delete from public.card_details where obligation_id = '10000000-0000-0000-0000-000000000003' returning 1) select count(*)::int from d), 0, 'card_details: user B deletes zero of user A''s rows');
select is((with d as (delete from public.murabaha_details where obligation_id = '10000000-0000-0000-0000-000000000002' returning 1) select count(*)::int from d), 0, 'murabaha_details: user B deletes zero of user A''s rows');
select is((with d as (delete from public.loan_details where obligation_id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'loan_details: user B deletes zero of user A''s rows');
select is((with d as (delete from public.obligations where id = '10000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'obligations: user B deletes zero of user A''s rows');

-- ─── Tables with NO delete policy at all: denied even to the owner ─────────────────────────
-- Switch back to user A to prove this isn't just cross-user filtering — nobody can delete.

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((with d as (delete from public.rate_periods where id = '20000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'rate_periods: even the owner cannot delete (no delete policy exists — append-only)');
select is((with d as (delete from public.consent_records where id = '60000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from d), 0, 'consent_records: even the owner cannot delete (no delete policy exists — history is permanent)');
select is((with d as (delete from public.profiles where user_id = 'a0000000-0000-0000-0000-00000000000a' returning 1) select count(*)::int from d), 0, 'profiles: even the owner cannot delete (deletion is a service-role account-deletion workflow only)');

-- ─── Tables with NO update policy at all: denied even to the owner ─────────────────────────

select is((with u as (update public.calculation_runs set formula_version = 99 where id = '40000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'calculation_runs: even the owner cannot update (no update policy exists — immutable once written)');
select is((with u as (update public.consent_records set version = 'v99' where id = '60000000-0000-0000-0000-000000000001' returning 1) select count(*)::int from u), 0, 'consent_records: even the owner cannot update (no update policy exists — append new row instead)');

-- ─── Sanity: user A CAN see/update their own rows (the matrix isn''t just "always deny") ────

select is((select count(*) from public.obligations where id = '10000000-0000-0000-0000-000000000001')::int, 1, 'obligations: user A can see their own row');
select is((select count(*) from public.profiles where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 1, 'profiles: user A can see their own row');
select is((select count(*) from public.calculation_runs where id = '40000000-0000-0000-0000-000000000001')::int, 1, 'calculation_runs: user A can see their own row');

select * from finish();
rollback;
