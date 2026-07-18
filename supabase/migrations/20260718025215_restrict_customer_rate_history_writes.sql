-- The customer app may establish the initial contractual rate while creating
-- its own loan, but only the bank dashboard's service-role RPC may append a
-- later authoritative repricing. UI restrictions alone are not sufficient:
-- old or malicious mobile clients must be rejected by Postgres as well.

create or replace function public.enforce_rate_period_authority()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- The campaign RPC is SECURITY DEFINER, so trigger execution has postgres
  -- privileges. Direct dashboard service-role inserts are also permitted.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception 'rate period writes require an authenticated owner' using errcode = '42501';
  end if;

  -- Serialize competing initial-rate inserts for the same loan before
  -- checking history. hashtextextended is stable for the transaction and
  -- avoids a table-wide lock.
  perform pg_advisory_xact_lock(hashtextextended(new.obligation_id::text, 0));

  if exists (
    select 1 from public.rate_periods where obligation_id = new.obligation_id
  ) then
    raise exception 'only the initial rate period may be written by a customer' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_rate_period_authority() from public;

drop trigger if exists rate_periods_authority_guard on public.rate_periods;
create trigger rate_periods_authority_guard
before insert on public.rate_periods
for each row execute function public.enforce_rate_period_authority();

-- An authenticated customer must never supersede an authoritative rate.
revoke update on public.rate_periods from authenticated;

-- Earlier dashboard migrations treated a chronological repricing like a
-- correction and marked the previous historical period superseded. The
-- finance engine excludes superseded rows, so that made the new rate apply
-- retroactively from loan inception. Repair only rows whose relationship is
-- proven to have been created by a dashboard campaign; genuine correction
-- chains outside campaign targets remain untouched.
update public.rate_periods previous
set superseded_by = null
from public.demo_rate_campaign_targets target
where previous.id = target.previous_rate_period_id
  and previous.superseded_by = target.new_rate_period_id;

-- SECURITY DEFINER functions are executable by PUBLIC by default. Lock this
-- RPC to the dashboard's server-only service role explicitly.
revoke all on function public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, date, text, boolean, uuid[]
) from public, anon, authenticated;
grant execute on function public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, date, text, boolean, uuid[]
) to service_role;

-- The approved publication behavior is always unchanged installment. Keep the
-- parameter for generated-client compatibility, but reject other policies in
-- the database as defense in depth.
create or replace function public.demo_publish_rate_campaign(
  p_campaign_id uuid,
  p_campaign_name text,
  p_institution_name text,
  p_reason text,
  p_source_note text,
  p_old_annual_rate numeric(9, 6),
  p_new_annual_rate numeric(9, 6),
  p_effective_date date,
  p_installment_policy text,
  p_email_notification_enabled boolean,
  p_target_obligation_ids uuid[]
) returns public.demo_rate_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.demo_rate_campaigns;
  v_obligation_id uuid;
  v_obligation public.obligations;
  v_loan public.loan_details;
  v_active_rate public.rate_periods;
  v_new_rate_period_id uuid;
begin
  if p_target_obligation_ids is null or array_length(p_target_obligation_ids, 1) is null then
    raise exception 'demo_publish_rate_campaign requires at least one target obligation' using errcode = '22023';
  end if;
  if p_installment_policy <> 'unchanged' then
    raise exception 'demo_publish_rate_campaign only supports unchanged installment policy' using errcode = '22023';
  end if;

  insert into public.demo_rate_campaigns (
    id, campaign_name, institution_name, reason, source_note,
    old_annual_rate, new_annual_rate, effective_date, installment_policy,
    email_notification_enabled, status, published_at
  ) values (
    p_campaign_id, p_campaign_name, p_institution_name, p_reason, p_source_note,
    p_old_annual_rate, p_new_annual_rate, p_effective_date, 'unchanged',
    p_email_notification_enabled, 'published', now()
  ) returning * into v_campaign;

  insert into public.demo_dashboard_activity (event_type, campaign_id, summary)
  values ('campaign_created', p_campaign_id, format('Campaign "%s" created for %s', p_campaign_name, p_institution_name));

  foreach v_obligation_id in array p_target_obligation_ids loop
    select * into v_obligation from public.obligations where id = v_obligation_id;
    if v_obligation.id is null then raise exception 'demo_publish_rate_campaign: obligation % does not exist', v_obligation_id using errcode = '02000'; end if;
    if v_obligation.kind <> 'conventionalLoan' then raise exception 'demo_publish_rate_campaign: obligation % is not a conventional loan', v_obligation_id using errcode = '22023'; end if;
    if v_obligation.institution_name <> p_institution_name then raise exception 'demo_publish_rate_campaign: obligation % belongs to a different institution', v_obligation_id using errcode = '22023'; end if;
    if v_obligation.closed_date is not null then raise exception 'demo_publish_rate_campaign: obligation % is closed', v_obligation_id using errcode = '22023'; end if;
    select * into v_loan from public.loan_details where obligation_id = v_obligation_id;
    if v_loan.obligation_id is null or v_loan.rate_type <> 'variable' then raise exception 'demo_publish_rate_campaign: obligation % is not a variable-rate loan', v_obligation_id using errcode = '22023'; end if;
    select * into v_active_rate from public.rate_periods where obligation_id = v_obligation_id and superseded_by is null order by effective_from desc limit 1;
    if v_active_rate.id is null then raise exception 'demo_publish_rate_campaign: obligation % has no active current rate', v_obligation_id using errcode = '22023'; end if;
    if p_effective_date <= v_active_rate.effective_from then raise exception 'demo_publish_rate_campaign: obligation % already has an active rate effective %, on or after the requested %', v_obligation_id, v_active_rate.effective_from, p_effective_date using errcode = '22023'; end if;

    insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json)
    values (v_obligation_id, v_obligation.user_id, p_new_annual_rate, p_effective_date,
      jsonb_build_object('source', 'demo', 'providerId', 'bank-simulator-dashboard', 'observedAt', now(), 'recordedAt', now(), 'sourceReference', p_campaign_id::text))
    returning id into v_new_rate_period_id;
    insert into public.demo_rate_campaign_targets (campaign_id, obligation_id, user_id, eligibility, previous_rate_period_id, new_rate_period_id)
    values (p_campaign_id, v_obligation_id, v_obligation.user_id, 'eligible', v_active_rate.id, v_new_rate_period_id);
    insert into public.demo_dashboard_activity (event_type, campaign_id, summary)
    values ('rate_period_appended', p_campaign_id, 'Rate period appended for an eligible loan');
  end loop;
  return v_campaign;
end;
$$;

revoke all on function public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, date, text, boolean, uuid[]
) from public, anon, authenticated;
grant execute on function public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, date, text, boolean, uuid[]
) to service_role;
