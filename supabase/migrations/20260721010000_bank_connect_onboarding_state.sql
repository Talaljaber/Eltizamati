-- connect-plan.md Phase D: user-scoped, versioned completion state for the
-- "pull obligations from your bank" onboarding step. Deliberately NOT a
-- device-local AsyncStorage flag — a device-global flag would let one user
-- completing the step suppress it for a different user signing in on the
-- same device, and would need bespoke sign-out cleanup. Server-side survives
-- reinstall and is inherently scoped to the authenticated owner via the
-- existing `profiles_update` RLS policy (user_id = auth.uid()).
--
-- Versioned (not a boolean) so a future redesign of the flow can force
-- everyone through it again by bumping the app's expected version string.

alter table public.profiles
  add column bank_connect_onboarding_version text;

comment on column public.profiles.bank_connect_onboarding_version is
  'Version string of the bank-connect onboarding flow the user last completed '
  '(or skipped past). NULL = not yet completed. Written ONLY via a column-scoped '
  'update (never the general profile save/upsert path) so an unrelated profile '
  'update can never accidentally clear it.';
