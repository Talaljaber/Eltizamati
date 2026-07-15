-- demo_publish_rate_campaign: the one transaction that publishes a Bank
-- Rate Simulator campaign (docs/dashboard.md §8 + the variable-rate
-- correction). SECURITY DEFINER, service_role-only — this is the only
-- write path for the demo tables that touches `rate_periods` at all.
--
-- Allowlist revalidation ("all target users are allowlisted") is
-- deliberately NOT done here: the database has no notion of
-- DEMO_ALLOWED_USER_IDS (an application env var), so that check is the
-- caller's responsibility — the TypeScript publish service MUST confirm
-- every target obligation's owner is allowlisted before ever calling this
-- function. Everything this function CAN independently verify from
-- database state (variable-rate conventional loan, matching institution,
-- open, has an active current rate) it does verify, and rolls back the
-- entire campaign — including the campaign row itself — if any target
-- fails that revalidation.
--
-- Duplicate-publish protection is the campaign id's own primary key: the
-- caller supplies the id, and a second call with the same id fails the
-- first INSERT outright (unique violation) before any rate_periods row is
-- touched.
--
-- SECURITY DEFINER (unlike the existing save_conventional_loan/save_murabaha/
-- save_card RPCs, which are deliberately SECURITY INVOKER so RLS still
-- authorizes each statement against `authenticated`): here the only caller
-- is service_role, which already bypasses RLS by definition, so invoker vs.
-- definer semantics don't change who is authorized — only whose table
-- privileges apply inside the function body. DEFINER makes this function's
-- ability to write `obligations`/`rate_periods` independent of whatever
-- service_role's own default grants happen to be on a given Supabase
-- instance, which this repo's migrations never explicitly set (only
-- `authenticated` is granted in 20260712000011_grants.sql).



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
    insert into public.rate_periods (obligation_id, user_id, annual_rate, effective_from, provenance_json)
    values (
      v_obligation_id,
      v_obligation.user_id,
      p_new_annual_rate,
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

grant execute on function public.demo_publish_rate_campaign to service_role;

-- ─── Excluded-target recording (non-atomic; no side effects to protect) ────
-- Called separately by the TypeScript publish service after the function
-- above succeeds, so the full eligible/excluded picture is on record even
-- though only eligible targets need the transactional guarantee.

create or replace function public.demo_record_excluded_targets(
  p_campaign_id uuid,
  p_obligation_ids uuid[],
  p_user_ids uuid[],
  p_reasons text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int;
begin
  if p_obligation_ids is null then
    return;
  end if;
  for v_i in 1 .. array_length(p_obligation_ids, 1) loop
    insert into public.demo_rate_campaign_targets (
      campaign_id, obligation_id, user_id, eligibility, exclusion_reason
    ) values (
      p_campaign_id, p_obligation_ids[v_i], p_user_ids[v_i], 'excluded', p_reasons[v_i]
    )
    on conflict (campaign_id, obligation_id) do nothing;
  end loop;
end;
$$;

grant execute on function public.demo_record_excluded_targets to service_role;
