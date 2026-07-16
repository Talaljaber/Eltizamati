-- Fixes a real bug in demo_publish_rate_campaign (20260716000001): it inserted the new
-- rate_periods row but never set the previous active period's superseded_by, so a loan
-- was left with two "active" (superseded_by is null) rows after a publish. That's a
-- BR-RATE-001 violation on its own (only one period should ever be active), and it also
-- meant a second campaign against the same loan could collide with
-- rate_periods_active_effective_from_idx if it picked an effective_date that happened to
-- match the still-active old row — exactly the "duplicate key value violates unique
-- constraint" failure this migration exists to fix.

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

    if p_effective_date <= v_active_rate.effective_from then
      raise exception
        'demo_publish_rate_campaign: obligation % already has an active rate effective %, on or after the requested %',
        v_obligation_id, v_active_rate.effective_from, p_effective_date
        using errcode = '22023';
    end if;

    -- Append-only (BR-RATE-001): INSERT a new row, never UPDATE the active row's
    -- annual_rate/effective_from/provenance. Demo provenance marks this as simulated,
    -- never official (docs/dashboard.md §8 "Demo provenance"), and records which
    -- campaign produced it.
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

    -- THE FIX: the old active period is now superseded by the row just inserted. This is
    -- the one column update BR-RATE-001's own append-only correction pattern allows —
    -- annual_rate/effective_from/provenance on v_active_rate are never touched.
    update public.rate_periods
      set superseded_by = v_new_rate_period_id
      where id = v_active_rate.id;

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

-- ─── Cleanup: repair any loan left with more than one "active" rate period by the ────
-- buggy version of this function above. For each obligation with >1 row where
-- superseded_by is null, marks every such row EXCEPT the one with the latest
-- effective_from as superseded by that latest row — the same rule the app's own
-- currentActiveRate()/eligibility code already uses to pick "the" active period, now
-- made true at the data level too, not just by convention when reading.
with ranked as (
  select
    id,
    obligation_id,
    row_number() over (partition by obligation_id order by effective_from desc, created_at desc) as rn
  from public.rate_periods
  where superseded_by is null
),
latest as (
  select obligation_id, id as latest_id from ranked where rn = 1
)
update public.rate_periods rp
set superseded_by = latest.latest_id
from ranked, latest
where rp.id = ranked.id
  and ranked.obligation_id = latest.obligation_id
  and ranked.rn > 1;
