-- Additive benchmark+margin split for rate_periods (MVP — CBJ announces a
-- benchmark, each bank adds its own margin and picks its own effective
-- date). `annual_rate` stays the effective rate the finance engine reads;
-- benchmark_rate/margin are optional display/authoring metadata alongside
-- it (docs/rate-changes.md). Both nullable — legacy rows, personal-entered
-- loans, and mobile what-if periods simply leave the split unset.

alter table public.rate_periods
  add column benchmark_rate numeric(9, 6),
  add column margin numeric(9, 6);

-- Replace demo_publish_rate_campaign (20260716000001) with a version that
-- accepts the optional split and stores it alongside the effective rate.
-- The old 11-arg signature is dropped and recreated with 2 new params
-- inserted before p_effective_date — every existing caller (the dashboard's
-- publish service) is updated in the same change, so no old-signature
-- caller survives this migration.
drop function if exists public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, date, text, boolean, uuid[]
);

create or replace function public.demo_publish_rate_campaign(
  p_campaign_id uuid,
  p_campaign_name text,
  p_institution_name text,
  p_reason text,
  p_source_note text,
  p_old_annual_rate numeric(9, 6),
  p_new_annual_rate numeric(9, 6),
  p_benchmark_rate numeric(9, 6),
  p_margin numeric(9, 6),
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

  if p_installment_policy not in ('unchanged', 'recalculated', 'unknownTreatment') then
    raise exception 'demo_publish_rate_campaign: invalid installment_policy %', p_installment_policy
      using errcode = '22023';
  end if;

  insert into public.demo_rate_campaigns (
    id, campaign_name, institution_name, reason, source_note,
    old_annual_rate, new_annual_rate, effective_date, installment_policy,
    email_notification_enabled, status, published_at
  ) values (
    p_campaign_id, p_campaign_name, p_institution_name, p_reason, p_source_note,
    p_old_annual_rate, p_new_annual_rate, p_effective_date, p_installment_policy,
    p_email_notification_enabled, 'published', now()
  ) returning * into v_campaign;

  insert into public.demo_dashboard_activity (event_type, campaign_id, summary)
  values (
    'campaign_created',
    p_campaign_id,
    format('Campaign "%s" created for %s', p_campaign_name, p_institution_name)
  );

  foreach v_obligation_id in array p_target_obligation_ids loop
    select * into v_obligation from public.obligations where id = v_obligation_id;
    if v_obligation.id is null then
      raise exception 'demo_publish_rate_campaign: obligation % does not exist', v_obligation_id
        using errcode = '02000';
    end if;
    if v_obligation.kind <> 'conventionalLoan' then
      raise exception 'demo_publish_rate_campaign: obligation % is not a conventional loan', v_obligation_id
        using errcode = '22023';
    end if;
    if v_obligation.institution_name <> p_institution_name then
      raise exception 'demo_publish_rate_campaign: obligation % belongs to a different institution', v_obligation_id
        using errcode = '22023';
    end if;
    if v_obligation.closed_date is not null then
      raise exception 'demo_publish_rate_campaign: obligation % is closed', v_obligation_id
        using errcode = '22023';
    end if;

    select * into v_loan from public.loan_details where obligation_id = v_obligation_id;
    if v_loan.obligation_id is null or v_loan.rate_type <> 'variable' then
      raise exception 'demo_publish_rate_campaign: obligation % is not a variable-rate loan', v_obligation_id
        using errcode = '22023';
    end if;

    select * into v_active_rate from public.rate_periods
      where obligation_id = v_obligation_id and superseded_by is null
      order by effective_from desc
      limit 1;
    if v_active_rate.id is null then
      raise exception 'demo_publish_rate_campaign: obligation % has no active current rate', v_obligation_id
        using errcode = '22023';
    end if;

    -- Append-only (BR-RATE-001): INSERT a new row, never UPDATE the active
    -- row's annual_rate/effective_from/provenance. Demo provenance marks
    -- this as simulated, never official (docs/dashboard.md §8 "Demo
    -- provenance"), and records which campaign produced it.
    insert into public.rate_periods (
      obligation_id, user_id, annual_rate, benchmark_rate, margin, effective_from, provenance_json
    )
    values (
      v_obligation_id,
      v_obligation.user_id,
      p_new_annual_rate,
      p_benchmark_rate,
      p_margin,
      p_effective_date,
      jsonb_build_object(
        'source', 'demo',
        'providerId', 'bank-simulator-dashboard',
        'observedAt', now(),
        'recordedAt', now(),
        'sourceReference', p_campaign_id::text
      )
    )
    returning id into v_new_rate_period_id;

    insert into public.demo_rate_campaign_targets (
      campaign_id, obligation_id, user_id, eligibility, previous_rate_period_id, new_rate_period_id
    ) values (
      p_campaign_id, v_obligation_id, v_obligation.user_id, 'eligible', v_active_rate.id, v_new_rate_period_id
    );

    insert into public.demo_dashboard_activity (event_type, campaign_id, summary)
    values ('rate_period_appended', p_campaign_id, 'Rate period appended for an eligible loan');
  end loop;

  return v_campaign;
end;
$$;

grant execute on function public.demo_publish_rate_campaign(
  uuid, text, text, text, text, numeric, numeric, numeric, numeric, date, text, boolean, uuid[]
) to service_role;
