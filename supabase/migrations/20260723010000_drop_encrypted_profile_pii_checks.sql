-- Field encryption (20260723000000_user_encryption_keys.sql + apps/mobile field-cipher) stores
-- profiles.full_name / phone_number / primary_bank as opaque AES-GCM ciphertext ("enc:v1:...").
-- The original column CHECK constraints validated the PLAINTEXT and now reject every encrypted
-- value written by the app:
--   * profiles_phone_number_e164   — ciphertext never matches the E.164 regex (observed: SQLSTATE 23514)
--   * profiles_full_name_length    — ciphertext exceeds the 2..100 char bound for all but the shortest names
--   * profiles_primary_bank_length — same length problem
--
-- A CHECK constraint cannot see through encryption, so format/length validation moves entirely
-- to the client, which validates the plaintext BEFORE encrypting it (the sign-up and profile
-- forms already enforce E.164 phone format and the 2..100 length bounds). These constraints are
-- dropped rather than left in place to reject otherwise-valid encrypted input.
--
-- Scope: only these three columns are client-encrypted. institution_name and email stay
-- plaintext (encryption plan), so no obligations/email constraints are affected. add_client_
-- profile_fields (20260715025425) is where these three constraints were introduced.

alter table public.profiles
  drop constraint if exists profiles_phone_number_e164,
  drop constraint if exists profiles_full_name_length,
  drop constraint if exists profiles_primary_bank_length;
