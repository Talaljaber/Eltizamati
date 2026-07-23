-- user_encryption_keys: per-user wrapped Data Encryption Key (DEK) for client-side field
-- encryption of free-text PII (profiles.full_name/phone_number/primary_bank,
-- obligations.nickname/notes). Envelope encryption (see business-idea.md encryption plan):
--
--   KEK (master key)  -> Edge Function secret only, NEVER stored in Postgres
--    L wraps DEK      -> stored WRAPPED here (this table)
--       L DEK         -> unwrapped only inside the user-encryption-key Edge Function,
--                        returned to the authenticated owner over TLS, cached client-side
--
-- A DB dump or a leaked service_role key yields only a wrapped DEK — useless without the KEK,
-- which never touches this database. This is what makes the encryption "client-only": nothing
-- with mere database access (including this app's own service_role) can decrypt these fields.
--
-- Row lifecycle is entirely server-side: only the Edge Function (via its service-role client)
-- ever inserts a row, on first key request for a user. Clients may only SELECT their own row
-- (to detect "do I already have a key" — in practice they always go through the Edge Function,
-- which is the only path that can also unwrap). No client INSERT/UPDATE/DELETE, mirroring the
-- append-only/service-role-only idiom already used for profiles.email
-- (20260716010000_profiles_email.sql) and the demo_* tables (20260712000011_grants.sql).

create table public.user_encryption_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wrapped_dek text not null,
  dek_version smallint not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.user_encryption_keys is
  'One wrapped per-user DEK per row, written only by the user-encryption-key Edge Function '
  '(service role). wrapped_dek is ciphertext of a 32-byte key under the server-side KEK '
  '(an Edge Function secret, never stored here) — this table alone cannot yield plaintext.';
comment on column public.user_encryption_keys.wrapped_dek is
  'Base64 AES-GCM(KEK, DEK) — nonce||ciphertext||tag. Opaque without the KEK.';
comment on column public.user_encryption_keys.dek_version is
  'Bumped if this user''s DEK is ever rotated/rewrapped; lets ciphertext produced under an '
  'older DEK remain identifiable during a future rotation.';

alter table public.user_encryption_keys enable row level security;

-- Owner may read their own wrapped key (harmless: it's ciphertext without the KEK), but only
-- the Edge Function's service-role client may write — service_role bypasses RLS entirely, so
-- no service_role policy is needed, only the absence of client-facing insert/update/delete
-- policies below (RLS default-denies what no policy grants).
create policy user_encryption_keys_select on public.user_encryption_keys
  for select using (user_id = auth.uid());

grant usage on schema public to authenticated;
-- All four verbs granted (20260712000011_grants.sql convention): table privilege is a
-- prerequisite Postgres checks before RLS runs at all. Granting insert/update/delete here
-- despite no matching policy means a stray client write is filtered to zero rows by RLS's
-- default-deny, not a hard permission-denied error — consistent with how every other
-- service-role-only/append-only table in this schema behaves (see rate_periods, consent_records).
grant select, insert, update, delete on public.user_encryption_keys to authenticated;
