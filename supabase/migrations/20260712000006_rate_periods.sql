-- rate_periods. Mirrors domain RatePeriod. Append-only (BR-RATE-001): application code must
-- never UPDATE an existing row's annual_rate/effective_from; corrections INSERT a new row and
-- UPDATE only the superseded row's superseded_by column. database-schema.md §1.6.

create table public.rate_periods (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null,
  user_id uuid not null,
  annual_rate numeric(9, 6) not null,
  effective_from date not null,
  superseded_by uuid references public.rate_periods (id),
  provenance_json jsonb not null,
  created_at timestamptz not null default now(),

  constraint rate_periods_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade
);

comment on table public.rate_periods is
  'Append-only rate history (BR-RATE-001). Mirrors domain RatePeriod.';

-- BR-OBL-002 non-overlap for active (non-superseded) periods. A partial unique index (not a
-- table-level UNIQUE constraint) is required because the "where superseded_by is null"
-- predicate can only be expressed on an index. Full ordering/gap validation beyond this
-- single-date-collision guard is validateRatePeriods at the application layer — Postgres
-- CHECK constraints can't express "no overlap across rows" without a trigger, and the
-- invariant is deliberately enforced in exactly one place (the domain service), not
-- duplicated here (database-schema.md §1.6).
create unique index rate_periods_active_effective_from_idx
  on public.rate_periods (obligation_id, effective_from)
  where superseded_by is null;

create index rate_periods_user_id_idx on public.rate_periods (user_id);

alter table public.rate_periods enable row level security;

create policy rate_periods_select on public.rate_periods
  for select using (user_id = auth.uid());

create policy rate_periods_insert on public.rate_periods
  for insert with check (user_id = auth.uid());

-- Application code only ever updates superseded_by on an existing row (append-only
-- correction) — RLS cannot restrict which *columns* an UPDATE touches, so this policy gates
-- row ownership only; column-level append-only discipline is enforced by
-- validateRatePeriods/the repository layer, not the database (database-schema.md §1.6).
create policy rate_periods_update on public.rate_periods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No delete policy: rate history is never deleted except via account-deletion erasure
-- (service role, bypasses RLS).
