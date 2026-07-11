-- profiles: mirrors domain UserProfile (packages/domain/src/entities/user-profile.ts).
-- One row per authenticated (personal-mode) user. Demo mode never writes here (ADR-0017).
-- database-schema.md §1.1.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locale text not null check (locale in ('en', 'ar')),
  data_mode text not null check (data_mode in ('demo', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Mirrors domain UserProfile. One row per authenticated user (personal mode only).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- database-schema.md §4: no deletion policy — account deletion is a service-role workflow
-- (Phase 4), never a client-initiated DELETE.
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid());

create policy profiles_insert on public.profiles
  for insert with check (user_id = auth.uid());

create policy profiles_update on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
