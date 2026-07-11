-- pgTAP: account-deletion cascade (database-schema.md §6). Simulates the service-role
-- deletion workflow (Phase 4 implements the actual Edge Function; this test verifies the
-- schema-level cascade behavior the workflow depends on) and asserts the exact verification
-- method §6 specifies: re-querying every table for the deleted user_id returns zero rows.

begin;
select plan(11);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'user-a@eltizamati.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b@eltizamati.test');

insert into public.obligations
  (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'conventionalLoan', 'Loan', 'Bank', 'JOD', '2024-01-15', '{}'),
  ('10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 'conventionalLoan', 'Untouched Loan', 'Bank', 'JOD', '2024-01-15', '{}');

insert into public.loan_details
  (obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov, rate_type, term_months, term_months_prov, start_date, maturity_date)
values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 20000, '{}', 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15'),
  ('10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 20000, '{}', 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15');

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.075, '2024-01-15', '{}'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 0.075, '2024-01-15', '{}');

insert into public.payments (id, obligation_id, user_id, paid_on, amount, provenance_json)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '2024-02-15', 307, '{}'),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', '2024-02-15', 307, '{}');

insert into public.calculation_runs (id, user_id, obligation_id, formula_id, formula_version, as_of, inputs_json, inputs_hash, outcome_kind, confidence, result_json, assumptions_json, calculated_at)
values
  ('40000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'amortization', 1, '2026-07-01', '{}', 'abc', 'result', 'high', '{}', '[]', now()),
  ('40000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000009', 'amortization', 1, '2026-07-01', '{}', 'abc', 'result', 'high', '{}', '[]', now());

insert into public.insights (id, user_id, obligation_id, rule_id, severity, title_key, body_key, trigger_hash, created_at)
values
  ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'test.rule', 'info', 't', 'b', 'hash-1', now()),
  ('50000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000009', 'test.rule', 'info', 't', 'b', 'hash-9', now());

insert into public.consent_records (id, user_id, doc_type, version, locale, acknowledged_at)
values
  ('60000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'privacy-policy', 'v1', 'en', now()),
  ('60000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 'privacy-policy', 'v1', 'en', now());

insert into public.profiles (user_id, locale, data_mode) values
  ('a0000000-0000-0000-0000-00000000000a', 'en', 'personal'),
  ('b0000000-0000-0000-0000-00000000000b', 'en', 'personal');

-- ─── Simulate the account-deletion workflow's deletion order (database-schema.md §6) ───────
-- Deleting `obligations` cascades to loan_details/rate_periods/payments/calculation_runs/
-- insights via each child's composite FK's ON DELETE CASCADE (§1.11); consent_records and
-- profiles have no obligation_id at all, so they're deleted explicitly.

delete from public.obligations where user_id = 'a0000000-0000-0000-0000-00000000000a';
delete from public.consent_records where user_id = 'a0000000-0000-0000-0000-00000000000a';
delete from public.profiles where user_id = 'a0000000-0000-0000-0000-00000000000a';

-- ─── Verification (§6): re-query every table for the deleted user_id, assert zero rows ─────

select is((select count(*) from public.obligations where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'obligations: zero rows remain for the deleted user');
select is((select count(*) from public.loan_details where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'loan_details: cascaded to zero rows');
select is((select count(*) from public.rate_periods where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'rate_periods: cascaded to zero rows');
select is((select count(*) from public.payments where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'payments: cascaded to zero rows');
select is((select count(*) from public.calculation_runs where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'calculation_runs: cascaded to zero rows');
select is((select count(*) from public.insights where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'insights: cascaded to zero rows');
select is((select count(*) from public.consent_records where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'consent_records: zero rows remain for the deleted user');
select is((select count(*) from public.profiles where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 0, 'profiles: zero rows remain for the deleted user');

-- ─── The other user's rows are completely untouched (deletion is scoped, not a wipe) ────────

select is((select count(*) from public.obligations where user_id = 'b0000000-0000-0000-0000-00000000000b')::int, 1, 'obligations: user B''s row is untouched by user A''s deletion');
select is((select count(*) from public.loan_details where user_id = 'b0000000-0000-0000-0000-00000000000b')::int, 1, 'loan_details: user B''s row is untouched by user A''s deletion');
select is((select count(*) from public.calculation_runs where user_id = 'b0000000-0000-0000-0000-00000000000b')::int, 1, 'calculation_runs: user B''s row is untouched by user A''s deletion');

select * from finish();
rollback;
