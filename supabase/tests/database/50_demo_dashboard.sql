-- pgTAP: Bank Simulator Dashboard demo tables + demo_publish_rate_campaign
-- (docs/dashboard.md §8, §16, §17 "Database tests").
--
-- These functions are service_role-only (no `authenticated`/`anon` grant
-- exists for the demo_* tables at all — 20260716000000). pgTAP connects as
-- a superuser-equivalent role in the local stack, which — like
-- service_role — is not subject to grant/RLS checks, so these tests call
-- the functions directly rather than switching role, mirroring how the
-- dashboard's own service-role client will call them in production.

begin;
select plan(17);

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-00000000000c', 'demo-user-c@eltizamati.test');

-- Fixture: one eligible variable-rate conventional loan at "Test Bank".
insert into public.obligations (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json)
values (
  'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c',
  'conventionalLoan', 'Demo Loan', 'Test Bank', 'JOD', '2020-01-15', '{"source":"demo","observedAt":"2020-01-15","recordedAt":"2020-01-15"}'
);
insert into public.loan_details (
  obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov,
  rate_type, term_months, term_months_prov, start_date, maturity_date, payment_frequency
) values (
  'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000c',
  20000, '{"source":"demo"}', 306.87, '{"source":"demo"}',
  'variable', 84, '{"source":"demo"}', '2020-01-15', '2027-01-15', 'monthly'
);
insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values (
  'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-00000000000c', 0.075, '2020-01-15', '{"source":"demo"}'
);

-- Fixture: a closed loan, for the "obligation is closed" revalidation case.
insert into public.obligations (id, user_id, kind, nickname, institution_name, closed_date, currency, opened_date, provenance_json)
values (
  'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000c',
  'conventionalLoan', 'Closed Loan', 'Test Bank', '2025-01-01', 'JOD', '2020-01-15', '{"source":"demo"}'
);
insert into public.loan_details (
  obligation_id, user_id, original_principal, original_principal_prov, installment, installment_prov,
  rate_type, term_months, term_months_prov, start_date, maturity_date, payment_frequency
) values (
  'e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000c',
  20000, '{"source":"demo"}', 306.87, '{"source":"demo"}',
  'variable', 84, '{"source":"demo"}', '2020-01-15', '2027-01-15', 'monthly'
);
insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values (
  'f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-00000000000c', 0.075, '2020-01-15', '{"source":"demo"}'
);

-- ─── Successful publish: appends a rate period, preserves history ─────────

select lives_ok(
  $$select public.demo_publish_rate_campaign(
    'a1000000-0000-0000-0000-000000000001', 'Q3 Rate Adjustment', 'Test Bank', 'Cost of funds increase',
    'Board memo 2026-07', 0.075, 0.0925, '2026-08-01', 'unchanged', false,
    array['e0000000-0000-0000-0000-000000000001']::uuid[]
  )$$,
  'demo_publish_rate_campaign: a valid campaign publishes without error'
);

select is(
  (select status from public.demo_rate_campaigns where id = 'a1000000-0000-0000-0000-000000000001'),
  'published', 'campaign row is marked published'
);

select is(
  (select count(*)::int from public.rate_periods where obligation_id = 'e0000000-0000-0000-0000-000000000001'),
  2, 'a new rate period is appended (2 rows now exist for this obligation)'
);

select is(
  (select annual_rate from public.rate_periods where id = 'f0000000-0000-0000-0000-000000000001'),
  0.075::numeric(9,6), 'the ORIGINAL rate period''s annual_rate is unchanged after publish'
);

select is(
  (select effective_from from public.rate_periods where id = 'f0000000-0000-0000-0000-000000000001'),
  '2020-01-15'::date, 'the ORIGINAL rate period''s effective_from is unchanged after publish'
);

select is(
  (
    select annual_rate from public.rate_periods
    where obligation_id = 'e0000000-0000-0000-0000-000000000001' and id <> 'f0000000-0000-0000-0000-000000000001'
  ),
  0.0925::numeric(9,6), 'the newly appended rate period carries the new rate'
);

select is(
  (
    select provenance_json ->> 'source' from public.rate_periods
    where obligation_id = 'e0000000-0000-0000-0000-000000000001' and id <> 'f0000000-0000-0000-0000-000000000001'
  ),
  'demo', 'the newly appended rate period is marked demo provenance, never official'
);

select is(
  (select count(*)::int from public.demo_rate_campaign_targets where campaign_id = 'a1000000-0000-0000-0000-000000000001'),
  1, 'one eligible target row was recorded'
);

select is(
  (select count(*)::int from public.demo_dashboard_activity where campaign_id = 'a1000000-0000-0000-0000-000000000001'),
  2, 'campaign_created and rate_period_appended activity events were recorded'
);

-- ─── Duplicate publish is rejected by the campaign id primary key ─────────

select throws_ok(
  $$select public.demo_publish_rate_campaign(
    'a1000000-0000-0000-0000-000000000001', 'Duplicate attempt', 'Test Bank', null, null,
    0.075, 0.0925, '2026-08-01', 'unchanged', false,
    array['e0000000-0000-0000-0000-000000000001']::uuid[]
  )$$,
  '23505', null,
  'demo_publish_rate_campaign: republishing the same campaign id is rejected (unique violation)'
);

select is(
  (select count(*)::int from public.rate_periods where obligation_id = 'e0000000-0000-0000-0000-000000000001'),
  2, 'the rejected duplicate publish did not append a second rate period'
);

-- ─── Revalidation failure rolls back the WHOLE campaign, including the row itself ─

select throws_ok(
  $$select public.demo_publish_rate_campaign(
    'a1000000-0000-0000-0000-000000000002', 'Targets a closed loan', 'Test Bank', null, null,
    0.075, 0.0925, '2026-08-01', 'unchanged', false,
    array['e0000000-0000-0000-0000-000000000002']::uuid[]
  )$$,
  '22023', null,
  'demo_publish_rate_campaign: a closed target loan aborts the whole transaction'
);

select is(
  (select count(*)::int from public.demo_rate_campaigns where id = 'a1000000-0000-0000-0000-000000000002'),
  0, 'the campaign row from a rolled-back publish does not exist'
);

select is(
  (select count(*)::int from public.rate_periods where obligation_id = 'e0000000-0000-0000-0000-000000000002'),
  1, 'the closed loan''s rate history is untouched by the rolled-back attempt'
);

-- ─── demo_email_outbox idempotency ─────────────────────────────────────────

select lives_ok(
  $$insert into public.demo_email_outbox (user_id, locale, recipient_hash, recipient_masked, template_id, status, idempotency_key)
    values ('c0000000-0000-0000-0000-00000000000c', 'en', 'hash-1', 't***@example.com', 'rate-change-en', 'queued', 'idem-key-1')$$,
  'demo_email_outbox: first insert with a given idempotency key succeeds'
);

select throws_ok(
  $$insert into public.demo_email_outbox (user_id, locale, recipient_hash, recipient_masked, template_id, status, idempotency_key)
    values ('c0000000-0000-0000-0000-00000000000c', 'en', 'hash-1', 't***@example.com', 'rate-change-en', 'queued', 'idem-key-1')$$,
  '23505', null,
  'demo_email_outbox: a second insert with the same idempotency key is rejected (no duplicate send)'
);

-- ─── RLS is enabled with no authenticated-facing policy (service-role only) ─

select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'demo_rate_campaigns'),
  0, 'demo_rate_campaigns has zero RLS policies — no authenticated/anon access path exists'
);

select * from finish();
rollback;
