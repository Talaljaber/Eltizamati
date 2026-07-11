-- payments. Mirrors domain Payment. database-schema.md §1.7.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null,
  user_id uuid not null,
  paid_on date not null,
  amount numeric(14, 3) not null check (amount > 0),
  alloc_principal numeric(14, 3),
  alloc_cost numeric(14, 3),
  alloc_source text check (alloc_source in ('official', 'estimated')),
  period_ref uuid references public.rate_periods (id),
  provenance_json jsonb not null,
  created_at timestamptz not null default now(),

  constraint payments_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade,

  -- alloc_principal/alloc_cost/alloc_source are present together or not at all.
  constraint payments_allocation_all_or_nothing_check
    check (
      (alloc_principal is null and alloc_cost is null and alloc_source is null)
      or (alloc_principal is not null and alloc_cost is not null and alloc_source is not null)
    ),

  -- INV-2, app-layer mirrors validatePaymentAllocation: principal + cost = amount within the
  -- CONV-5 per-period tolerance (0.005 JOD) when an allocation is present.
  constraint payments_allocation_sum_check
    check (
      alloc_principal is null
      or abs(alloc_principal + alloc_cost - amount) <= 0.005
    )
);

comment on table public.payments is 'Mirrors domain Payment.';

create index payments_obligation_id_paid_on_idx on public.payments (obligation_id, paid_on);
create index payments_user_id_idx on public.payments (user_id);

alter table public.payments enable row level security;

create policy payments_select on public.payments
  for select using (user_id = auth.uid());

create policy payments_insert on public.payments
  for insert with check (user_id = auth.uid());

create policy payments_update on public.payments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy payments_delete on public.payments
  for delete using (user_id = auth.uid());
