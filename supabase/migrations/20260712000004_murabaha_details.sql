-- murabaha_details (kind = murabaha). Mirrors domain MurabahaDetails. database-schema.md §1.4.

create table public.murabaha_details (
  obligation_id uuid primary key,
  user_id uuid not null,

  asset_cost numeric(14, 3) not null,
  asset_cost_prov jsonb not null,
  disclosed_profit numeric(14, 3) not null,
  disclosed_profit_prov jsonb not null,
  total_sale_price numeric(14, 3) not null,
  total_sale_price_prov jsonb not null,
  installment numeric(14, 3) not null,
  installment_prov jsonb not null,
  term_months integer not null check (term_months > 0),
  term_months_prov jsonb not null,
  start_date date not null,
  -- Display-only (BR-CALC-020) — no provenance column (non-material, per domain-model.md).
  profit_rate_disclosed numeric(9, 6),

  constraint murabaha_details_obligation_owner_fkey
    foreign key (obligation_id, user_id) references public.obligations (id, user_id) on delete cascade,

  -- BR-OBL-003: assetCost + disclosedProfit = totalSalePrice within the CONV-5 per-period
  -- tolerance (0.005 JOD). This constant MUST stay numerically identical to
  -- conv5PerPeriodTolerance() in packages/domain/src/constants.ts — a change to one is a
  -- change to both, in the same PR. The DB stores exactly what was entered and never
  -- auto-corrects; a violation is rejected outright (validateMurabahaFinancing mirrors this
  -- at the application layer so users see a friendly error before the DB ever sees the row).
  constraint murabaha_details_price_consistency_check
    check (abs(asset_cost + disclosed_profit - total_sale_price) <= 0.005)
);

comment on table public.murabaha_details is
  'kind=murabaha detail row. Mirrors domain MurabahaDetails. No rate periods (BR-CALC-020: no repricing).';

create index murabaha_details_user_id_idx on public.murabaha_details (user_id);

alter table public.murabaha_details enable row level security;

create policy murabaha_details_select on public.murabaha_details
  for select using (user_id = auth.uid());

create policy murabaha_details_insert on public.murabaha_details
  for insert with check (user_id = auth.uid());

create policy murabaha_details_update on public.murabaha_details
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy murabaha_details_delete on public.murabaha_details
  for delete using (user_id = auth.uid());
