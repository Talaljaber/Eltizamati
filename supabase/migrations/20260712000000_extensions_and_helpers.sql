-- Shared setup: extensions and helper functions used by every later migration.
-- docs/05-data-api/database-schema.md (Phase 2 frozen design) — Phase 3 implements it here.

-- pgtap: enables the pgTAP test-assertion functions used by supabase/tests/database/*.sql.
-- Harmless in a production database (unused at runtime); kept in a migration (not only the
-- test setup) so `supabase db reset` — the single command that both applies migrations and
-- prepares the database `supabase test db` runs against — always has it available.
create extension if not exists pgtap with schema extensions;

-- Generic updated_at maintenance trigger, attached per-table to every table with an
-- updated_at column (profiles, obligations). Keeps "maintained on update" honest without
-- relying on application code to remember to set it on every write path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: sets updated_at = now() on every UPDATE. Attached per-table.';
