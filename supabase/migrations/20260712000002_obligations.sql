-- obligations: base table (ADR-0008 class-table inheritance). Mirrors domain ObligationBase
-- (packages/domain/src/entities/obligation.ts). database-schema.md §1.2.

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in (
      'conventionalLoan', 'murabaha', 'ijara', 'diminishingMusharakah', 'creditCard', 'genericFacility'
    )
  ),
  nickname text not null,
  institution_name text not null,
  institution_id text,
  currency text not null default 'JOD' check (currency = 'JOD'),
  opened_date date not null,
  closed_date date,
  notes text,
  provenance_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- database-schema.md §1.11: composite unique key every child table's ownership-enforcing
  -- foreign key references, so a child row's user_id is provably its parent's owner.
  constraint obligations_id_user_id_key unique (id, user_id)
);

comment on table public.obligations is
  'Base obligation record (ADR-0008). id is client-generated uuid v7 in application code; '
  'the DEFAULT is a safety net for direct SQL, never relied upon by the app.';

create index obligations_user_id_idx on public.obligations (user_id);
create index obligations_user_id_kind_idx on public.obligations (user_id, kind);

create trigger obligations_set_updated_at
  before update on public.obligations
  for each row execute function public.set_updated_at();

alter table public.obligations enable row level security;

create policy obligations_select on public.obligations
  for select using (user_id = auth.uid());

create policy obligations_insert on public.obligations
  for insert with check (user_id = auth.uid());

create policy obligations_update on public.obligations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy obligations_delete on public.obligations
  for delete using (user_id = auth.uid());
