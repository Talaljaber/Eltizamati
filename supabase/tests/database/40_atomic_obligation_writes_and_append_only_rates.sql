-- pgTAP: F-07 (STOP-SHIP audit, docs/ship-situation.md) — atomic obligation+subtype
-- writes via save_conventional_loan/save_murabaha/save_card, and append-only
-- rate_periods (customer may create the initial row with a loan, but cannot
-- append, edit, delete, or mark any authoritative rate as corrected).
--
-- auth.uid() convention matches 10_rls_cross_user.sql: `set local role authenticated`
-- + `set local request.jwt.claims`. Fixtures owned by user B are inserted as
-- postgres/superuser (bypasses RLS) *before* switching role to user A, exactly
-- like 10_rls_cross_user.sql — inserting a B-owned row while already
-- impersonating A would itself be blocked by the obligations_insert RLS policy.

begin;
select plan(16);

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'user-a@eltizamati.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b@eltizamati.test');

-- Fixture: an obligation already owned by user B, for the cross-user-denial test
-- below. Inserted as postgres/superuser, before the role switch to A.
insert into public.obligations (id, user_id, kind, nickname, institution_name, currency, opened_date, provenance_json)
values ('10000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-00000000000b', 'conventionalLoan', 'B''s loan', 'Bank', 'JOD', '2024-01-15', '{}');

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- ─── save_conventional_loan: valid insert commits both rows ────────────────────────

select lives_ok(
  $$select public.save_conventional_loan(
    '10000000-0000-0000-0000-000000000001', 'personal', 'Personal Loan', 'Bank', null,
    '2024-01-15', null, null, '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}',
    now(), now(),
    20000, '{}', null, null, 307, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15', null, 'personal', null, null
  )$$,
  'save_conventional_loan: valid write commits'
);

select is(
  (select count(*)::int from public.obligations where id = '10000000-0000-0000-0000-000000000001'),
  1, 'save_conventional_loan: base row exists after a valid write'
);
select is(
  (select count(*)::int from public.loan_details where obligation_id = '10000000-0000-0000-0000-000000000001'),
  1, 'save_conventional_loan: detail row exists after a valid write (both rows committed together)'
);

-- ─── Failure injection: an invalid detail row rolls back the base row too ─────────

select throws_ok(
  $$select public.save_conventional_loan(
    '10000000-0000-0000-0000-000000000002', 'personal', 'Bad Loan', 'Bank', null,
    '2024-01-15', null, null, '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}',
    now(), now(),
    20000, '{}', null, null, 307, '{}', 'fixed', 0, '{}', '2024-01-15', '2031-01-15', null, 'personal', null, null
  )$$,
  '23514', null,
  'save_conventional_loan: an invalid detail row (term_months=0) raises and rolls back'
);

select is(
  (select count(*)::int from public.obligations where id = '10000000-0000-0000-0000-000000000002'),
  0, 'save_conventional_loan: the base row from a rolled-back call does not exist (F-07 atomicity)'
);

-- ─── Idempotent re-save (update path) ──────────────────────────────────────────────

select lives_ok(
  $$select public.save_conventional_loan(
    '10000000-0000-0000-0000-000000000001', 'personal', 'Personal Loan (renamed)', 'Bank', null,
    '2024-01-15', null, null, '{"source":"userEntered","observedAt":"2024-01-15","recordedAt":"2024-01-15"}',
    now(), now(),
    20000, '{}', 18500, '{}', 320, '{}', 'fixed', 84, '{}', '2024-01-15', '2031-01-15', null, 'personal', null, null
  )$$,
  'save_conventional_loan: re-saving the same id updates both rows instead of erroring'
);
select is(
  (select nickname from public.obligations where id = '10000000-0000-0000-0000-000000000001'),
  'Personal Loan (renamed)', 'save_conventional_loan: base-row update applied'
);
select is(
  (select installment from public.loan_details where obligation_id = '10000000-0000-0000-0000-000000000001')::numeric,
  320::numeric, 'save_conventional_loan: detail-row update applied'
);

-- ─── Cross-user denial: cannot adopt another user's obligation id ──────────────────

select throws_ok(
  $$select public.save_conventional_loan(
    '10000000-0000-0000-0000-000000000009', 'personal', 'Hijacked', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    1, '{}', null, null, 1, '{}', 'fixed', 1, '{}', '2024-01-01', '2024-02-01', null, null, null, null
  )$$,
  '42501', null,
  'save_conventional_loan: user A cannot adopt user B''s obligation id'
);

-- ─── Subtype-mismatch denial: a different kind's RPC cannot repurpose an existing id ─

select throws_ok(
  $$select public.save_murabaha(
    '10000000-0000-0000-0000-000000000001', 'personal', 'Repurposed', 'Bank', null,
    '2024-01-15', null, null, '{}', now(), now(),
    15000, '{}', 3600, '{}', 18600, '{}', 221.4286, '{}', 84, '{}', '2024-01-15', null
  )$$,
  '42501', null,
  'save_murabaha: cannot repurpose an existing conventionalLoan id into a murabaha (no subtype mismatch)'
);

-- ─── Append-only rate_periods: same-owner column-privilege enforcement ─────────────

insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.0695, '2024-01-15', '{}');

select throws_ok(
  $$update public.rate_periods set annual_rate = 0.99 where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'rate_periods: the owner cannot rewrite annual_rate on an existing period (column-privilege denies it, not just RLS)'
);
select throws_ok(
  $$update public.rate_periods set effective_from = '2025-01-01' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'rate_periods: the owner cannot rewrite effective_from on an existing period'
);
select throws_ok(
  $$update public.rate_periods set provenance_json = '{"source":"userEntered","observedAt":"x","recordedAt":"x"}' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'rate_periods: the owner cannot rewrite provenance_json on an existing period'
);

-- A borrower cannot append another period or mark an existing one superseded.
select throws_ok(
  $$insert into public.rate_periods (id, obligation_id, user_id, annual_rate, effective_from, provenance_json)
    values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 0.075, '2025-01-15', '{}')$$,
  '42501', null,
  'rate_periods: the owner cannot append a later authoritative rate'
);
select throws_ok(
  $$update public.rate_periods set superseded_by = '20000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'rate_periods: the owner cannot supersede a rate period'
);

-- Confirm the denied UPDATE did not change the stored row.
select is(
  (select superseded_by::text from public.rate_periods where id = '20000000-0000-0000-0000-000000000001'),
  null, 'rate_periods: denied customer supersession left the initial period unchanged'
);

select * from finish();
rollback;
