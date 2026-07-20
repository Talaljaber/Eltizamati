-- pgTAP: connection_type gates who may log payments and decide schedule
-- proposals (20260720000000_obligation_connection_type_and_payment_authority.sql).
begin;
select plan(9);

insert into auth.users (id, email) values
  ('c7000000-0000-0000-0000-000000000001', 'official-loan-user@eltizamati.test'),
  ('c7000000-0000-0000-0000-000000000002', 'personal-loan-user@eltizamati.test');

-- Official (bank-connected) loan — payments are bank-only.
insert into public.obligations (
  id, user_id, kind, connection_type, nickname, institution_name, currency, opened_date, provenance_json
) values (
  'e7000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000001',
  'conventionalLoan', 'official', 'Official loan', 'Test Bank', 'JOD', '2024-01-01', '{"source":"demo"}'
);
insert into public.loan_details (
  obligation_id, user_id, original_principal, original_principal_prov,
  installment, installment_prov, rate_type, term_months, term_months_prov,
  start_date, maturity_date, payment_frequency
) values (
  'e7000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000001',
  8000, '{"source":"demo"}', 400, '{"source":"demo"}', 'variable',
  24, '{"source":"demo"}', '2024-01-01', '2027-01-01', 'monthly'
);

-- Personal (self-tracked) loan — payments are customer-only.
insert into public.obligations (
  id, user_id, kind, connection_type, nickname, institution_name, currency, opened_date, provenance_json
) values (
  'e7000000-0000-0000-0000-000000000002',
  'c7000000-0000-0000-0000-000000000002',
  'conventionalLoan', 'personal', 'Personal loan', 'Test Bank', 'JOD', '2024-01-01', '{"source":"demo"}'
);
insert into public.loan_details (
  obligation_id, user_id, original_principal, original_principal_prov,
  installment, installment_prov, rate_type, term_months, term_months_prov,
  start_date, maturity_date, payment_frequency
) values (
  'e7000000-0000-0000-0000-000000000002',
  'c7000000-0000-0000-0000-000000000002',
  8000, '{"source":"demo"}', 400, '{"source":"demo"}', 'variable',
  24, '{"source":"demo"}', '2024-01-01', '2027-01-01', 'monthly'
);

-- 1) Customer cannot log a payment on their own official loan.
set local role authenticated;
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json)
    values ('e7000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000001',
      '2026-07-01', 400, '{"source":"userEntered","providerId":"manual"}')$$,
  '42501', null,
  'the customer cannot log a payment on an official loan'
);
reset role;

-- 2) The bank (via record_bank_payment) can log a payment on the official loan.
select lives_ok(
  $$select public.record_bank_payment('e7000000-0000-0000-0000-000000000001', 400, '2026-07-01')$$,
  'the bank can record a payment on an official loan'
);
select is(
  (select count(*)::int from public.payments where obligation_id = 'e7000000-0000-0000-0000-000000000001'),
  1,
  'exactly one payment was recorded for the official loan'
);

-- 3) record_bank_payment refuses a personal loan.
select throws_ok(
  $$select public.record_bank_payment('e7000000-0000-0000-0000-000000000002', 400, '2026-07-01')$$,
  '22023', null,
  'the bank cannot record a payment on a personal loan'
);

-- 4) The customer CAN log a payment on their own personal loan (unchanged behavior).
set local role authenticated;
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-000000000002","role":"authenticated"}';
select lives_ok(
  $$insert into public.payments (obligation_id, user_id, paid_on, amount, provenance_json)
    values ('e7000000-0000-0000-0000-000000000002', 'c7000000-0000-0000-0000-000000000002',
      '2026-07-01', 300, '{"source":"userEntered","providerId":"manual"}')$$,
  'the customer can log a payment on their own personal loan'
);

-- 5) Self-approval: a personal-loan customer submits and self-approves a proposal.
insert into public.loan_schedule_proposals (
  id, obligation_id, user_id, proposal_kind, currency, as_of,
  proposed_installment, projected_remaining_payable, final_balloon,
  rate_history_snapshot, schedule_snapshot
) values (
  'a7000000-0000-0000-0000-000000000001',
  'e7000000-0000-0000-0000-000000000002',
  'c7000000-0000-0000-0000-000000000002',
  'recommended', 'JOD', '2026-07-18', 350, 8400, 0,
  '[]', '[{"period":1,"date":"2026-08-01","payment":"350","principal":"320","cost":"30","closingBalance":"7680"}]'
);
select lives_ok(
  $$select public.self_decide_schedule_proposal('a7000000-0000-0000-0000-000000000001')$$,
  'the customer can self-approve a proposal on their own personal loan'
);
select is(
  (select installment from public.loan_details where obligation_id = 'e7000000-0000-0000-0000-000000000002'),
  350::numeric,
  'self-approval replaces the agreed installment'
);
reset role;

-- 6) Self-approval is refused for an official loan's proposal, even by its owner.
insert into public.loan_schedule_proposals (
  id, obligation_id, user_id, proposal_kind, currency, as_of,
  proposed_installment, projected_remaining_payable, final_balloon,
  rate_history_snapshot, schedule_snapshot
) values (
  'a7000000-0000-0000-0000-000000000002',
  'e7000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000001',
  'recommended', 'JOD', '2026-07-18', 350, 8400, 0,
  '[]', '[{"period":1,"date":"2026-08-01","payment":"350","principal":"320","cost":"30","closingBalance":"7680"}]'
);
set local role authenticated;
set local request.jwt.claims to '{"sub":"c7000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.self_decide_schedule_proposal('a7000000-0000-0000-0000-000000000002')$$,
  '22023', null,
  'self-approval is refused for an official loan'
);
reset role;

-- 7) The bank cannot decide a personal loan's proposal.
select throws_ok(
  $$select public.demo_decide_schedule_proposal('a7000000-0000-0000-0000-000000000001', 'approved', null)$$,
  '22023', null,
  'the bank cannot decide a proposal on a personal loan'
);

select * from finish();
rollback;
