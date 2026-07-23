-- Read-only verification of the field-encryption rollout. Run in Supabase Studio → SQL Editor
-- against the project you deployed to. Every row should read PASS. Anything that can't be
-- checked from SQL (the actual encrypt/decrypt round-trip, which needs the client-held DEK and
-- the Edge Function's KEK) is covered by the mobile unit tests + the app read-back, not here.
--
-- Note on legacy data: rows written BEFORE the cipher shipped (or by the service-role dashboard)
-- are plaintext and count as "not yet encrypted". They are not a failure of the mechanism — they
-- re-encrypt the next time the owning user saves. The PII checks below report counts so you can
-- see the split rather than a bare pass/fail on historical rows.

with checks as (

  -- ── Structure ──────────────────────────────────────────────────────────────
  select 1 as ord, 'table exists' as check,
    case when to_regclass('public.user_encryption_keys') is not null then 'PASS' else 'FAIL' end as result,
    coalesce(to_regclass('public.user_encryption_keys')::text, 'missing') as detail

  union all
  select 2, 'RLS enabled on user_encryption_keys',
    case when relrowsecurity then 'PASS' else 'FAIL' end,
    'relrowsecurity=' || relrowsecurity
  from pg_class where oid = 'public.user_encryption_keys'::regclass

  -- ── Access rules: exactly one SELECT policy, no write policies ──────────────
  union all
  select 3, 'only a SELECT policy exists (no client insert/update/delete)',
    case when count(*) filter (where cmd = 'SELECT') = 1
          and count(*) filter (where cmd <> 'SELECT') = 0
      then 'PASS' else 'FAIL' end,
    'policies: ' || coalesce(string_agg(cmd || ':' || policyname, ', '), 'none')
  from pg_policies where schemaname = 'public' and tablename = 'user_encryption_keys'

  union all
  select 4, 'SELECT policy is scoped to the owner (user_id = auth.uid())',
    case when bool_or(qual ilike '%auth.uid()%') then 'PASS' else 'FAIL' end,
    coalesce(max(qual), 'no qual')
  from pg_policies
  where schemaname = 'public' and tablename = 'user_encryption_keys' and cmd = 'SELECT'

  -- ── Wrapped DEK is well-formed (nonce 12 + dek 32 + GCM tag 16 = 60 bytes) ──
  union all
  select 5, 'every wrapped_dek decodes to 60 bytes',
    case when count(*) filter (where octet_length(decode(wrapped_dek, 'base64')) <> 60) = 0
      then 'PASS' else 'FAIL' end,
    count(*) || ' key row(s), ' ||
      count(*) filter (where octet_length(decode(wrapped_dek, 'base64')) <> 60) || ' malformed'
  from public.user_encryption_keys

  -- ── PII at rest: the 5 client-encrypted columns ────────────────────────────
  union all
  select 6, 'obligations.nickname encrypted (enc:v1:)',
    case when count(*) filter (where nickname not like 'enc:v1:%') = 0 then 'PASS'
         else 'REVIEW' end,
    count(*) filter (where nickname like 'enc:v1:%') || ' encrypted / ' ||
      count(*) filter (where nickname not like 'enc:v1:%') || ' plaintext (legacy)'
  from public.obligations

  union all
  select 7, 'obligations.notes encrypted (enc:v1:) where present',
    case when count(*) filter (where notes is not null and notes not like 'enc:v1:%') = 0 then 'PASS'
         else 'REVIEW' end,
    count(*) filter (where notes like 'enc:v1:%') || ' encrypted / ' ||
      count(*) filter (where notes is not null and notes not like 'enc:v1:%') || ' plaintext (legacy)'
  from public.obligations

  union all
  select 8, 'profiles.full_name / phone_number / primary_bank encrypted where present',
    case when count(*) filter (where
           (full_name    is not null and full_name    not like 'enc:v1:%') or
           (phone_number is not null and phone_number not like 'enc:v1:%') or
           (primary_bank is not null and primary_bank not like 'enc:v1:%')) = 0
      then 'PASS' else 'REVIEW' end,
    count(*) filter (where full_name    like 'enc:v1:%') || '/' ||
    count(*) filter (where phone_number like 'enc:v1:%') || '/' ||
    count(*) filter (where primary_bank like 'enc:v1:%') || ' encrypted (name/phone/bank)'
  from public.profiles

  -- ── Deliberately-plaintext columns must NOT be encrypted ───────────────────
  union all
  select 9, 'obligations.institution_name stays PLAINTEXT (needed server-side)',
    case when count(*) filter (where institution_name like 'enc:v1:%') = 0 then 'PASS' else 'FAIL' end,
    count(*) filter (where institution_name like 'enc:v1:%') || ' unexpectedly encrypted'
  from public.obligations

  union all
  select 10, 'profiles.email stays PLAINTEXT (denormalized auth.users copy)',
    case when count(*) filter (where email like 'enc:v1:%') = 0 then 'PASS' else 'FAIL' end,
    count(*) filter (where email like 'enc:v1:%') || ' unexpectedly encrypted'
  from public.profiles

  -- ── Coverage: any user who wrote PII should have a wrapped key row ──────────
  union all
  select 11, 'every user with encrypted PII has a wrapped DEK row',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*) || ' user(s) have enc:v1: PII but no user_encryption_keys row'
  from (
    select user_id from public.obligations where nickname like 'enc:v1:%'
    union
    select user_id from public.profiles
      where full_name like 'enc:v1:%' or phone_number like 'enc:v1:%' or primary_bank like 'enc:v1:%'
  ) writers
  where not exists (
    select 1 from public.user_encryption_keys k where k.user_id = writers.user_id
  )
)
select check, result, detail from checks order by ord;
