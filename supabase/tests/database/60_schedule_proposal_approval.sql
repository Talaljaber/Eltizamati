-- pgTAP: customer proposal -> bank decision -> agreed schedule workflow.
begin;
select plan(10);

insert into auth.users (id, email) values
  ('c6000000-0000-0000-0000-000000000001', 'schedule-user@eltizamati.test');
insert into public.obligations (
  id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json
) values (
  'e6000000-0000-0000-0000-000000000001',
  'c6000000-0000-0000-0000-000000000001',
  'conventionalLoan', 'Schedule loan', 'Test Bank', 'JOD', '2024-01-01', '{"source":"demo"}'
);
insert into public.loan_details (
  obligation_id, user_id, original_principal, original_principal_prov,
  installment, installment_prov, rate_type, term_months, term_months_prov,
  start_date, maturity_date, payment_frequency
) values (
  'e6000000-0000-0000-0000-000000000001',
  'c6000000-0000-0000-0000-000000000001',
  8000, '{"source":"demo"}', 400, '{"source":"demo"}', 'variable',
  24, '{"source":"demo"}', '2024-01-01', '2027-01-01', 'monthly'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"c6000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok($$
  insert into public.loan_schedule_proposals (
    id, obligation_id, user_id, proposal_kind, currency, as_of,
    proposed_installment, projected_remaining_payable, final_balloon,
    rate_history_snapshot, schedule_snapshot
  ) values (
    'a6000000-0000-0000-0000-000000000001',
    'e6000000-0000-0000-0000-000000000001',
    'c6000000-0000-0000-0000-000000000001',
    'recommended', 'JOD', '2026-07-18', 450, 9000, 100,
    '[]', '[{"period":1,"date":"2026-08-01","payment":"450","principal":"400","cost":"50","closingBalance":"7600","finalBalloonAmount":"100"}]'
  )
$$, 'the customer can submit a pending proposal for their loan');

select throws_ok(
  $$select public.demo_decide_schedule_proposal('a6000000-0000-0000-0000-000000000001', 'approved', null)$$,
  '42501', null,
  'the authenticated customer cannot approve their own proposal'
);
reset role;

select lives_ok(
  $$select public.demo_decide_schedule_proposal('a6000000-0000-0000-0000-000000000001', 'rejected', 'Terms not supported')$$,
  'the bank can reject a pending proposal'
);
select is(
  (select installment from public.loan_details where obligation_id = 'e6000000-0000-0000-0000-000000000001'),
  400::numeric,
  'rejection leaves the agreed installment unchanged'
);
select is(
  (select rule_id from public.insights where trigger_hash = 'a6000000-0000-0000-0000-000000000001:rejected'),
  'SCHEDULE_PROPOSAL_REJECTED',
  'rejection creates an in-app decision insight'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"c6000000-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.loan_schedule_proposals (
  id, obligation_id, user_id, proposal_kind, currency, as_of,
  proposed_installment, projected_remaining_payable, final_balloon,
  rate_history_snapshot, schedule_snapshot
) values (
  'a6000000-0000-0000-0000-000000000002',
  'e6000000-0000-0000-0000-000000000001',
  'c6000000-0000-0000-0000-000000000001',
  'custom', 'JOD', '2026-07-18', 475, 9100, 125,
  '[]', '[{"period":1,"date":"2026-08-01","payment":"475","principal":"425","cost":"50","closingBalance":"7575","finalBalloonAmount":"125"}]'
);
reset role;

select lives_ok(
  $$select public.demo_decide_schedule_proposal('a6000000-0000-0000-0000-000000000002', 'approved', null)$$,
  'the bank can approve a pending proposal'
);
select is(
  (select status from public.loan_schedule_proposals where id = 'a6000000-0000-0000-0000-000000000002'),
  'approved',
  'the exact proposal is marked as the agreed schedule'
);
select is(
  (select installment from public.loan_details where obligation_id = 'e6000000-0000-0000-0000-000000000001'),
  475::numeric,
  'approval replaces the agreed installment'
);
select is(
  (select contractual_balloon from public.loan_details where obligation_id = 'e6000000-0000-0000-0000-000000000001'),
  125::numeric,
  'approval preserves the proposal final balloon explicitly'
);
select is(
  (select rule_id from public.insights where trigger_hash = 'a6000000-0000-0000-0000-000000000002:approved'),
  'SCHEDULE_PROPOSAL_APPROVED',
  'approval creates an in-app decision insight'
);

select * from finish();
rollback;
