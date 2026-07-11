-- insights. Mirrors domain Insight. database-schema.md §1.9.

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  obligation_id uuid,
  -- Includes the reserved 'system.calculationRefused' id (PHASE-02-DECISION-LOG.md §13).
  rule_id text not null,
  severity text not null check (severity in ('info', 'attention', 'urgent', 'positive')),
  -- i18n keys, never inlined copy.
  title_key text not null,
  body_key text not null,
  params_json jsonb,
  -- Dedup component (FR-INS-004): (rule_id, obligation_id, trigger_hash).
  trigger_hash text not null,
  -- Validated against the route allow-list at read time, not stored validated.
  deep_link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),

  -- database-schema.md §1.11: MATCH SIMPLE skips this check when obligation_id is null
  -- (obligation-agnostic insights), same reasoning as calculation_runs.
  constraint insights_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade
);

comment on table public.insights is 'Mirrors domain Insight.';

create unique index insights_dedup_idx on public.insights (rule_id, obligation_id, trigger_hash);
create index insights_user_id_idx on public.insights (user_id);

alter table public.insights enable row level security;

create policy insights_select on public.insights
  for select using (user_id = auth.uid());

-- Raised by application services (rule engine), not composed client-side.
create policy insights_insert on public.insights
  for insert with check (user_id = auth.uid());

-- Application code only ever updates read_at — RLS gates row ownership, not which columns an
-- UPDATE touches (same pattern as rate_periods).
create policy insights_update on public.insights
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy insights_delete on public.insights
  for delete using (user_id = auth.uid());
