# Owner checklist — applying the Phase 4 demo migrations

Two new migrations and one new pgTAP file, generated on `feature/dashboard`,
**not applied to any hosted database**:

- `supabase/migrations/20260716000000_demo_dashboard_tables.sql`
- `supabase/migrations/20260716000001_demo_publish_rate_campaign.sql`
- `supabase/tests/database/50_demo_dashboard.sql`

## Before applying anywhere

1. **Validate locally first**, even though the target is remote. Docker
   wasn't running in the environment these were authored in, so they were
   reviewed manually, not executed:
   ```
   supabase db reset      # applies every migration from scratch, including these two
   supabase test db       # runs the full pgTAP suite, including 50_demo_dashboard.sql (17 assertions)
   ```
   If `supabase test db` doesn't show `50_demo_dashboard.sql ... ok` for all
   17 assertions, stop and fix before going further — don't apply to remote
   with an unverified migration.

2. **Regenerate types** and confirm they match what's committed:
   ```
   supabase gen types typescript --local --schema public > apps/bank-simulator-dashboard/src/server/supabase/database.types.ts
   ```
   The committed file was hand-authored to match the migrations exactly
   (documented in its own header) — this step turns it into a genuinely
   generated file and should produce a diff-clean or near-diff-clean result.

## Applying to the remote project

3. Review the two migrations' `create table`/`create function` statements
   once more against your actual schema — they assume the existing
   `obligations`, `loan_details`, `rate_periods`, `calculation_runs`,
   `auth.users` tables already exist in the shape documented in
   `docs/05-data-api/database-schema.md` (they do, per the migrations
   already on `main`, but confirm before pushing to a project you also use
   for real mobile-app data).

4. Apply via whichever path matches your existing workflow — `supabase db
   push` against the linked project, or the SQL editor with each file's
   contents pasted in migration order (`...000000` before `...000001`).

5. **Confirm `service_role`'s grants took effect** — the whole safety model
   for these tables (no `authenticated`/`anon` access at all) depends on
   `grant select, insert, update, delete on ... to service_role` actually
   running. A quick check: as `service_role`, `select * from
   public.demo_rate_campaigns limit 1;` should succeed (even with zero
   rows); as `authenticated` or `anon`, the same query should fail with a
   permission error, not just return zero rows.

## What this does NOT include

- No `DEMO_ALLOWED_USER_IDS`/`DEMO_ALLOWED_EMAILS` values — those are your
  own environment variables, not part of the schema.
- No real Gmail SMTP credentials — `SMTP_APP_PASSWORD` etc. stay in your
  own `.env.local` / hosting platform's secret store, never in a migration
  or committed file.
- No seed data for `demo_rate_campaigns`/`demo_email_outbox`/etc. — these
  tables start empty; the dashboard populates them when you publish your
  first campaign.

## Rollback

Each migration is additive only (new tables, new functions) — nothing in
`20260716000000`/`20260716000001` alters an existing table's columns,
constraints, or RLS policies. If you need to remove them: `drop function
public.demo_publish_rate_campaign; drop function
public.demo_record_excluded_targets; drop table
public.demo_rate_campaign_targets; drop table public.demo_email_outbox;
drop table public.demo_dashboard_activity; drop table
public.demo_benchmark_rates; drop table public.demo_rate_campaigns;` (in
that order, respecting foreign keys) — this does not touch `obligations`,
`rate_periods`, or any other pre-existing table.
