-- pgTAP: 20260721000000_require_connection_type_in_obligation_writes.sql.
-- 40_atomic_obligation_writes_and_append_only_rates.sql already proves the
-- save_* RPCs' atomicity/ownership/kind-conflict behavior — this file proves
-- specifically that `connection_type` is now forwarded (not silently
-- defaulted to 'official'), that an invalid value is rejected, that the old
-- (pre-connection_type) call shape no longer resolves to any overload, and
-- that ownership/kind guards still hold on the new signature.
begin;
select plan(11);

insert into auth.users (id, email) values
  ('d8000000-0000-0000-0000-00000000000a', 'rpc-forward-user-a@eltizamati.test'),
  ('d8000000-0000-0000-0000-00000000000b', 'rpc-forward-user-b@eltizamati.test');

-- Fixture: an obligation already owned by user B, for the cross-user-denial
-- test below. Inserted as postgres/superuser (bypasses RLS) *before*
-- switching role to A, exactly like 40_atomic_obligation_writes_and_append_only_rates.sql —
-- inserting a B-owned row while already impersonating A would itself be
-- blocked by the obligations_insert RLS policy (user_id must equal auth.uid()).
insert into public.obligations (id, user_id, kind, connection_type, nickname, institution_name, currency, opened_date, provenance_json)
values ('18000000-0000-0000-0000-000000000009', 'd8000000-0000-0000-0000-00000000000b', 'conventionalLoan', 'official', 'B''s loan', 'Bank', 'JOD', '2024-01-15', '{}');

set local role authenticated;
set local request.jwt.claims to '{"sub":"d8000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- ─── personal -> personal, for all three schema-backed kinds ──────────────────

select lives_ok(
  $$select public.save_conventional_loan(
    '18000000-0000-0000-0000-000000000001', 'personal', 'Personal Loan', 'Bank', null,
    '2024-01-15', null, null, '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}',
    now(), now(),
    20000, '{}', null, null, 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15', null, 'personal', null, null
  )$$,
  'save_conventional_loan: forwards connection_type=personal'
);
select is(
  (select connection_type from public.obligations where id = '18000000-0000-0000-0000-000000000001'),
  'personal', 'save_conventional_loan: connection_type persisted as personal, not defaulted to official'
);

select lives_ok(
  $$select public.save_murabaha(
    '18000000-0000-0000-0000-000000000002', 'personal', 'Personal Murabaha', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    15000, '{}', 3600, '{}', 18600, '{}', 310, '{}', 60, '{}', '2024-01-15', null
  )$$,
  'save_murabaha: forwards connection_type=personal'
);
select is(
  (select connection_type from public.obligations where id = '18000000-0000-0000-0000-000000000002'),
  'personal', 'save_murabaha: connection_type persisted as personal'
);

select lives_ok(
  $$select public.save_card(
    '18000000-0000-0000-0000-000000000003', 'personal', 'Personal Card', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    3000, '{}', 900, '{}', null, null, null, null, null, null, null, null, null, null, null
  )$$,
  'save_card: forwards connection_type=personal'
);
select is(
  (select connection_type from public.obligations where id = '18000000-0000-0000-0000-000000000003'),
  'personal', 'save_card: connection_type persisted as personal'
);

-- ─── official -> official (bank-pulled path) ───────────────────────────────────

select lives_ok(
  $$select public.save_card(
    '18000000-0000-0000-0000-000000000004', 'official', 'Bank-pulled Card', 'Bank', null,
    '2024-01-15', null, null, '{"source":"demo"}', now(), now(),
    4000, '{}', 1200, '{}', null, null, null, null, null, null, null, null, null, null, null
  )$$,
  'save_card: forwards connection_type=official'
);
select is(
  (select connection_type from public.obligations where id = '18000000-0000-0000-0000-000000000004'),
  'official', 'save_card: connection_type persisted as official, not silently coerced to personal'
);

-- ─── an invalid value is rejected, not silently substituted ───────────────────

select throws_ok(
  $$select public.save_card(
    '18000000-0000-0000-0000-000000000005', 'not-a-real-value', 'Bad Card', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    1000, '{}', 100, '{}', null, null, null, null, null, null, null, null, null, null, null
  )$$,
  '22023', null,
  'save_card: an invalid connection_type is rejected, not silently substituted'
);

-- ─── the old (pre-connection_type) call shape no longer resolves ──────────────

select throws_ok(
  $$select public.save_conventional_loan(
    '18000000-0000-0000-0000-000000000006', 'Old-shape Loan', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    20000, '{}', null, null, 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15', null, 'personal', null, null
  )$$,
  '42883', null,
  'save_conventional_loan: the pre-connection_type 25-argument overload no longer exists'
);

-- ─── ownership guard still holds on the new signature ──────────────────────────

select throws_ok(
  $$select public.save_conventional_loan(
    '18000000-0000-0000-0000-000000000009', 'personal', 'Hijacked', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    1, '{}', null, null, 1, '{}', 'fixed', 1, '{}', '2024-01-01', '2024-02-01', null, null, null, null
  )$$,
  '42501', null,
  'save_conventional_loan: user A still cannot adopt user B''s obligation id on the new signature'
);

reset role;
select * from finish();
rollback;
