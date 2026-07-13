-- Adds FR-SET-006/FR-INS-001(user) preference columns to profiles.
-- Both nullable: unset means the user hasn't configured a reminder day or
-- a user-defined threshold yet. Notification delivery itself is out of MVP
-- scope (Phase 8 cut #3) — reminder_day is stored for a later phase to
-- consume, nothing schedules from it yet.

alter table public.profiles
  add column reminder_day_of_month integer check (
    reminder_day_of_month is null or (reminder_day_of_month between 1 and 28)
  ),
  add column user_threshold_amount numeric;
