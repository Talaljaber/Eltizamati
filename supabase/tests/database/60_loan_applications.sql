-- pgTAP: loan_applications RLS + demo_decide_loan_application (docs mirror
-- 50_demo_dashboard.sql's style for demo_publish_rate_campaign). Two users
-- (A, B) verify ownership scoping; a single pending application exercises
-- both decision branches of the RPC.

begin;
select plan(17);

insert into auth.users (id, email) values
  ('d0000000-0000-0000-0000-00000000000a', 'loan-app-user-a@eltizamati.test'),
  ('d0000000-0000-0000-0000-00000000000b', 'loan-app-user-b@eltizamati.test');

insert into public.loan_applications
  (id, user_id, institution_name, purpose, requested_amount, requested_term_months, applicant_note)
values
  ('90000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-00000000000a',
   'Arab Bank', 'personal', 1200, 12, 'Fixture application');

-- ─── RLS: owner can read their own application, another user cannot ───────

set local role authenticated;
set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*)::int from public.loan_applications where id = '90000000-0000-0000-0000-000000000001'),
  1, 'RLS: the owning user can see their own application'
);

set local request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(
  (select count(*)::int from public.loan_applications where id = '90000000-0000-0000-0000-000000000001'),
  0, 'RLS: a different user cannot see another user''s application'
);

select throws_ok(
  $$insert into public.loan_applications (user_id, institution_name, purpose, requested_amount, requested_term_months)
    values ('d0000000-0000-0000-0000-00000000000a', 'Arab Bank', 'personal', 500, 6)$$,
  '42501', null,
  'RLS: a user cannot insert an application on another user''s behalf'
);

reset role;

-- ─── demo_decide_loan_application: reject requires a reason ───────────────

select throws_ok(
  $$select public.demo_decide_loan_application(
    '90000000-0000-0000-0000-000000000001', 'reject', null, null, null, null
  )$$,
  '22023', null,
  'demo_decide_loan_application: rejecting without a reason is refused'
);

select is(
  (select status from public.loan_applications where id = '90000000-0000-0000-0000-000000000001'),
  'pending', 'the application is still pending after the refused reject attempt'
);

-- ─── demo_decide_loan_application: approve computes a correct installment ─
-- 1200 principal, 0% rate, 12 months -> exactly 100/month, easy to assert precisely.

select lives_ok(
  $$select public.demo_decide_loan_application(
    '90000000-0000-0000-0000-000000000001', 'approve', 1200, 12, 0, null
  )$$,
  'demo_decide_loan_application: a valid approval succeeds'
);

select is(
  (select status from public.loan_applications where id = '90000000-0000-0000-0000-000000000001'),
  'approved', 'the application is marked approved'
);

select isnt(
  (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000001'),
  null, 'the application records the id of the obligation it created'
);

select is(
  (
    select installment from public.loan_details
    where obligation_id = (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000001')
  ),
  100.000::numeric(14,3), 'the resulting loan''s installment is the correctly computed level payment (zero-rate case)'
);

select is(
  (
    select outstanding_balance from public.loan_details
    where obligation_id = (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000001')
  ),
  1200.000::numeric(14,3), 'the resulting loan''s day-one outstanding balance equals the approved principal'
);

select is(
  (
    select provenance_json ->> 'source' from public.obligations
    where id = (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000001')
  ),
  'demo', 'the resulting obligation carries demo provenance, never official'
);

select is(
  (
    select count(*)::int from public.rate_periods
    where obligation_id = (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000001')
  ),
  1, 'exactly one rate period was created for the new obligation'
);

select is(
  (select count(*)::int from public.demo_dashboard_activity where event_type = 'loan_application_approved'),
  1, 'an activity event was recorded for the approval'
);

-- ─── demo_decide_loan_application: an already-decided application is refused ─

select throws_ok(
  $$select public.demo_decide_loan_application(
    '90000000-0000-0000-0000-000000000001', 'reject', null, null, null, 'too late'
  )$$,
  '22023', null,
  'demo_decide_loan_application: a second decision on an already-decided application is refused'
);

-- ─── A separate application, rejected ──────────────────────────────────────

insert into public.loan_applications
  (id, user_id, institution_name, purpose, requested_amount, requested_term_months)
values
  ('90000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-00000000000a',
   'Housing Bank for Trade and Finance', 'housing', 50000, 120);

select lives_ok(
  $$select public.demo_decide_loan_application(
    '90000000-0000-0000-0000-000000000002', 'reject', null, null, null, 'Insufficient supporting information'
  )$$,
  'demo_decide_loan_application: a valid rejection succeeds'
);

select is(
  (select decision_reason from public.loan_applications where id = '90000000-0000-0000-0000-000000000002'),
  'Insufficient supporting information', 'the rejection reason is stored on the application'
);

select is(
  (select resulting_obligation_id from public.loan_applications where id = '90000000-0000-0000-0000-000000000002'),
  null, 'a rejected application never gets a resulting obligation'
);

select * from finish();
rollback;
