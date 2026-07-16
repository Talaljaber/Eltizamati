-- Adds a denormalized `email` column to public.profiles, backfilled from and kept in sync
-- with auth.users.email — auth.users stays authoritative; this column exists purely so
-- server-side, service-role code (e.g. the bank simulator dashboard) can read a user's
-- email straight from an allowlist-filtered `profiles` query instead of calling the Admin
-- API per user. Client apps can still read it (existing profiles RLS/grants already cover
-- SELECT), but cannot write it directly — see the column-level revoke below, mirroring the
-- rate_periods append-only pattern (20260715090000).

alter table public.profiles add column email text;

comment on column public.profiles.email is
  'Denormalized copy of auth.users.email. Not authoritative — kept in sync by '
  'sync_profile_email_on_insert()/auth_users_sync_profile_email. Never written by clients '
  '(see the column-level revoke below); a stale value here never blocks auth, it only means '
  'a display/lookup convenience column hasn''t caught up yet.';

update public.profiles p
set email = u.email
from auth.users u
where p.user_id = u.id
  and p.email is distinct from u.email;

-- Populates email on new profile rows — the client creates a profiles row shortly after
-- signup without knowing/sending an email column, so this fills it in server-side at
-- insert time. SECURITY DEFINER is required: authenticated cannot select from auth.users.
create or replace function public.sync_profile_email_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    select email into new.email from auth.users where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger profiles_sync_email_on_insert
  before insert on public.profiles
  for each row execute function public.sync_profile_email_on_insert();

-- Keeps profiles.email current if a user later changes their auth email.
create or replace function public.sync_profile_email_on_auth_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;

create trigger auth_users_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email_on_auth_update();

-- Same append-only-style defense as rate_periods (20260715090000): the table-level grant
-- (20260712000011_grants.sql) gives `authenticated` UPDATE on every column of profiles;
-- this narrows it so a client can update any other profile field but never this one —
-- only the trigger functions above (SECURITY DEFINER) ever write it.
revoke update (email) on public.profiles from authenticated;
