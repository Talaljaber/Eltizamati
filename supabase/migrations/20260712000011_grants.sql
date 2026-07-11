-- Table-level GRANTs for the `authenticated` role.
-- RLS policies alone do not grant table access — Postgres checks table-level
-- privileges first, then RLS filters rows within whatever the privilege allows.
-- Without these grants every policy above is unreachable (confirmed by pgTAP:
-- 10_rls_cross_user.sql failed with "permission denied for table profiles"
-- before this migration existed).
--
-- All four operations are granted on every table, even where a table has no
-- matching RLS policy for some operation (e.g. rate_periods has no delete
-- policy — append-only). This is deliberate: with the grant present but no
-- policy, RLS's default-deny behavior filters the operation to zero affected
-- rows, which is what the pgTAP suite asserts. Omitting the grant instead
-- produces a hard permission-denied error before RLS ever evaluates — a
-- different, worse failure mode the app would have to special-case.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.obligations to authenticated;
grant select, insert, update, delete on public.loan_details to authenticated;
grant select, insert, update, delete on public.murabaha_details to authenticated;
grant select, insert, update, delete on public.card_details to authenticated;
grant select, insert, update, delete on public.rate_periods to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.calculation_runs to authenticated;
grant select, insert, update, delete on public.insights to authenticated;
grant select, insert, update, delete on public.consent_records to authenticated;
