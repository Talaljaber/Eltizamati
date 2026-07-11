-- consent_records. Mirrors domain ConsentRecord. Server-backed in personal mode (ADR-0016's
-- consent gate); demo mode acknowledgment is a local key-value flag and never writes here.
-- database-schema.md §1.10.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_type text not null,
  version text not null,
  locale text not null check (locale in ('en', 'ar')),
  acknowledged_at timestamptz not null
);

comment on table public.consent_records is 'Mirrors domain ConsentRecord.';

create index consent_records_user_id_doc_type_idx on public.consent_records (user_id, doc_type);

alter table public.consent_records enable row level security;

create policy consent_records_select on public.consent_records
  for select using (user_id = auth.uid());

-- Append a new acknowledgment row instead of editing an existing one — no update policy.
create policy consent_records_insert on public.consent_records
  for insert with check (user_id = auth.uid());

-- No delete policy: consent history is never client-deleted (never, per database-schema.md §4).
