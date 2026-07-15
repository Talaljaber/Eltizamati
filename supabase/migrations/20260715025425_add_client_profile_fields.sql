alter table public.profiles
  add column full_name text,
  add column phone_number text,
  add column primary_bank text,
  add constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) between 2 and 100
  ),
  add constraint profiles_phone_number_e164 check (
    phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$'
  ),
  add constraint profiles_primary_bank_length check (
    primary_bank is null or char_length(primary_bank) between 2 and 100
  );

comment on column public.profiles.full_name is
  'Client-provided full name; required by the app for new registrations.';
comment on column public.profiles.phone_number is
  'Client-provided E.164 contact number; not an authentication factor.';
comment on column public.profiles.primary_bank is
  'Client-provided primary bank name; does not imply a live bank connection.';
