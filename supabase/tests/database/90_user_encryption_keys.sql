-- pgTAP: user_encryption_keys access matrix (20260723000000_user_encryption_keys.sql).
-- The wrapped-DEK table backs client-only field encryption. Its guarantees:
--   * a user may SELECT only their own wrapped key (never another user's);
--   * NO client (any authenticated user) may INSERT/UPDATE/DELETE — rows are written only by the
--     user-encryption-key Edge Function via the service-role client (which bypasses RLS).
-- These mirror the cross-user + append-only assertions in 10_rls_cross_user.sql.

begin;
select plan(6);

-- ─── Fixtures (inserted as postgres/superuser, which bypasses RLS) ────────────────────────
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'user-a@eltizamati.test'),
  ('b0000000-0000-0000-0000-00000000000b', 'user-b@eltizamati.test');

insert into public.user_encryption_keys (user_id, wrapped_dek, dek_version) values
  ('a0000000-0000-0000-0000-00000000000a', 'wrapped-key-for-a', 1);

-- ─── User B: cannot see user A's wrapped key ─────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(
  (select count(*) from public.user_encryption_keys)::int, 0,
  'user_encryption_keys: user B sees zero of user A''s rows'
);

-- INSERT denied even for own user_id: no insert policy exists (Edge Function / service role only).
select throws_ok(
  $$insert into public.user_encryption_keys (user_id, wrapped_dek) values ('b0000000-0000-0000-0000-00000000000b', 'forged')$$,
  '42501', null, 'user_encryption_keys: authenticated cannot insert (no insert policy — service role only)'
);

-- ─── User A: can read their own row, but cannot write it ─────────────────────────────────
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*) from public.user_encryption_keys where user_id = 'a0000000-0000-0000-0000-00000000000a')::int, 1,
  'user_encryption_keys: user A can read their own wrapped key'
);

-- INSERT denied even for the owner (no insert policy at all).
select throws_ok(
  $$insert into public.user_encryption_keys (user_id, wrapped_dek) values ('a0000000-0000-0000-0000-00000000000a', 'self-write')$$,
  '42501', null, 'user_encryption_keys: even the owner cannot insert (no insert policy exists)'
);

-- UPDATE filtered to zero rows (no update policy — USING defaults to deny).
with u as (
  update public.user_encryption_keys set wrapped_dek = 'rotated'
  where user_id = 'a0000000-0000-0000-0000-00000000000a' returning 1
)
select is((select count(*)::int from u), 0,
  'user_encryption_keys: even the owner cannot update (no update policy exists)');

-- DELETE filtered to zero rows (no delete policy).
with d as (
  delete from public.user_encryption_keys
  where user_id = 'a0000000-0000-0000-0000-00000000000a' returning 1
)
select is((select count(*)::int from d), 0,
  'user_encryption_keys: even the owner cannot delete (no delete policy exists)');

select * from finish();
rollback;
