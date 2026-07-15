-- Learn Intelligence reference catalogue. Apply remotely only after data-review approval.
-- Public reference data is read through a future reviewed server boundary; no client writes.

create table public.financial_institutions (
  id text primary key,
  name_en text not null,
  name_ar text,
  institution_type text not null check (institution_type in ('jordanian-bank', 'foreign-bank-branch', 'financing-company')),
  banking_model text not null check (banking_model in ('conventional', 'islamic', 'mixed')),
  website text not null,
  regulator_source_id text not null,
  review_status text not null check (review_status in ('verified', 'partially-verified', 'no-public-product-data-found', 'pending-review')),
  last_reviewed_at date not null,
  created_at timestamptz not null default now()
);

create table public.financing_product_sources (
  id text primary key,
  publisher_name text not null,
  publisher_type text not null check (publisher_type in ('regulator', 'bank', 'government', 'industry-body')),
  title text not null,
  source_url text not null,
  language text not null check (language in ('ar', 'en')),
  retrieved_at timestamptz not null,
  published_at date,
  effective_from date,
  effective_until date,
  content_hash text,
  review_status text not null check (review_status in ('verified', 'pending', 'stale', 'superseded', 'unavailable')),
  reviewed_by text,
  notes text
);

create table public.financing_products (
  id text primary key,
  institution_id text not null references public.financial_institutions(id),
  name_en text not null,
  name_ar text,
  category text not null check (category in ('personal', 'vehicle', 'housing', 'education', 'credit-card', 'other')),
  structure text not null check (structure in ('conventional-loan', 'murabaha', 'ijara', 'diminishing-musharakah', 'credit-card', 'other')),
  currency text not null default 'JOD',
  minimum_amount numeric(18,3), maximum_amount numeric(18,3),
  minimum_term_months integer, maximum_term_months integer,
  pricing_kind text not null check (pricing_kind in ('fixed-interest', 'variable-interest', 'profit-rate', 'advertised-from', 'not-published')),
  minimum_annual_rate numeric(12,9), maximum_annual_rate numeric(12,9), effective_rate_published numeric(12,9),
  benchmark_name text, margin text,
  salary_transfer text not null check (salary_transfer in ('required', 'not-required', 'optional', 'not-published')),
  early_settlement_text text,
  completeness text not null check (completeness in ('complete-published-fields', 'partial', 'minimal')),
  status text not null check (status in ('active', 'possibly-stale', 'withdrawn', 'pending-review')),
  last_verified_at timestamptz not null,
  requires_direct_confirmation boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.financing_product_source_links (
  product_id text not null references public.financing_products(id) on delete cascade,
  source_id text not null references public.financing_product_sources(id),
  primary key (product_id, source_id)
);

alter table public.financial_institutions enable row level security;
alter table public.financing_product_sources enable row level security;
alter table public.financing_products enable row level security;
alter table public.financing_product_source_links enable row level security;

-- Intentional: no anon/authenticated policies and no grants. Reference-data publication
-- is an owner-controlled deployment concern, not a mobile-user write surface.
