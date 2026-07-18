# Pre-Stage Reset Checklist

Run this before every demo rehearsal and before the real judged demo — the goal is a
deterministic starting state every single time, matching security-controls.md §4's
"Erase-all verified (row counts 0, prefs cleared, onboarding shown)" checklist item.

## Steps

1. **Reset demo data** (if the app is already installed and in demo mode):
   - Home tab → profile icon → Settings → "Reset demo data" → confirm "Reset".
   - Automated equivalent: `maestro/erase-reset.yaml`.
   - Verify: the loan/Murabaha/card figures match the original seed (`packages/demo-data`'s
     `buildDemoSeed` output) — no leftover manually-added obligations or logged payments.

2. **Full app reinstall** (for the actual judged demo, not just rehearsals):
   - Uninstall the app from the device entirely (clears AsyncStorage/MMKV/SecureStore — the
     in-step reset above only clears the demo repository's in-memory seed, not device storage).
   - Reinstall the preview APK.
   - Launch and confirm onboarding is shown from the very first screen (language picker) — not
     resumed mid-flow, not skipped.

3. **Network state**:
   - Confirm the device has real connectivity before the normal/Arabic runs (personal-mode
     screens need it; demo mode doesn't, but a clean baseline avoids surprises).
   - For the airplane-mode run specifically: enable airplane mode _after_ step 2's fresh
     onboarding, at the point the script calls for it — not before, or onboarding itself may show
     a misleading offline state.

4. **Notifications**: clear any pending/delivered OS notifications from a previous run so a stale
   notification tap can't navigate the app mid-demo (`useNotificationResponse` already guards
   against a _stale_ response being replayed — see
   `src/__tests__/session-boundary-security.test.tsx` — but starting clean removes the variable
   entirely).

5. **Battery/screen**: confirm the demo device is charged and screen-timeout is set long enough
   to survive the full script without locking.

## Verification (spot-check, not exhaustive)

- [ ] Demo banner visible on every screen in demo mode (honesty control — security-controls.md
      §4).
- [ ] No leftover obligations/payments from a prior manual test session.
- [ ] Onboarding shown from the language picker, not resumed.
- [ ] Both English and Arabic language options work from a fresh install.

## When this hasn't been run yet

If you're reading this before the first physical-device rehearsal: this checklist is written
against the app's current behavior (settings reset flow, onboarding gating) but has not itself
been executed on hardware. Run it once, fix anything that doesn't match reality, then treat it as
load-bearing.
