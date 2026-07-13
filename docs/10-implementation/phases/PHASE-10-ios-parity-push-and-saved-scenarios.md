# Phase 10 — iOS Device Parity, Remote Push Notifications, and Saved Scenarios

## Status

Planned

## Objective

Extend the Phase 9 release gate to physical iOS, add real server-triggered push notifications (payment-due and rate-change alerts) on top of Phase 8's local-notification foundation, and let users save/reload simulator scenarios (loan and card) instead of losing them on navigation.

## Why This Phase Exists

Phase 9 is explicitly Android-first (device validation, performance budgets, and the judged APK all target Android) — a deliberate scope cut, not a technical limitation, driven by iOS's distribution cost (a standalone build installable outside Expo Go requires an Apple Developer Program membership; Android APKs sideload for free). Once that membership exists, iOS deserves the same validation rigor Android already has. Separately, Phase 8 explicitly put real push notifications and saved scenarios out of scope (only _local_, on-device payment-due scheduling was in Phase 8, itself cuttable) — this phase is where both graduate from "not planned" to planned, once the MVP demo spine no longer needs protecting from scope creep.

## Preconditions

Phase 9 complete (Android release gate passed). Apple Developer Program membership active (required for iOS EAS builds/TestFlight — a paid, user-side prerequisite; flag in STATUS.md if missing, same treatment as Phase 9's Android-device dependency). A Firebase project (FCM) and Apple Push (APNs) key/cert configured for remote push. Phase 8's local-notification implementation exists (FR-NTF-001) if it wasn't cut — if it _was_ cut, this phase must build local scheduling first since remote push depends on the same permission/UX groundwork.

## In Scope

1. **iOS build profile in EAS** (`eas.json` `ios` targets alongside existing `android`): dev/preview/production, matching Phase 9's Android profile structure.
2. **Physical iOS device validation**, mirroring Phase 9 §3 exactly: full demo script, airplane-mode run, process-death/relaunch, Dynamic Type at 1.5×, performance budgets (cold start, scenario latency, dashboard jank) — recorded numbers, not assumed parity with Android.
3. **iOS-specific Arabic/RTL sweep** — iOS RTL layout mirroring has known platform-specific quirks (safe-area insets, `SafeAreaView` edge behavior) distinct from Android; re-run Phase 9 §4 on iOS rather than assuming the Android pass covers it.
4. **iOS security/privacy pass** — App Transport Security config, Keychain-backed SecureStore behavior (vs. Android Keystore) re-verified; same checklist as Phase 9 §7, iOS-specific items added.
5. **Remote push notifications** (promotes FR-NTF-001 from local-only to server-triggered): `expo-notifications` push-token registration flow, a Supabase Edge Function (or scheduled job) that evaluates due payments/rate-change events server-side and dispatches via Expo's push service (which fans out to APNs/FCM), permission UX shared with Phase 8's local implementation, quiet hours, content-minimized payloads (NFR-PRIV-005 — no financial values in notification body, consistent with Phase 8's constraint).
6. **Saved scenarios** (promotes the Phase 8 "export/saved scenarios (stretch)" item): new `saved_scenarios` table + RLS policy + repository (loan and card simulator inputs/outputs), SCR-SIM-LOAN/SCR-SIM-CARD extended with a "Save this scenario" action and a list/reload view, demo-mode equivalent (in-memory) for parity with every other repository family.
7. **TestFlight distribution** (iOS equivalent of Phase 9's APK-on-two-devices gate): internal testing group, build uploaded ≥48h before any judged/demo use of iOS builds.

## Out of Scope

Store submission (App Store or Play Store) — still out of scope, same as Phase 9. Any new obligation types, screens, or MVP flows beyond what Phases 7–8 already built — this phase is platform parity + two specific additive features, not new product surface. Web push (browser notifications) — not addressed here.

## Architecture Decisions Applied

Same ADRs as Phase 9 (ADR-0011 Maestro/E2E, ADR-0015 Sentry-only observability — extend, don't replace, for push delivery failures) plus provider-abstraction.md's repository pattern for `saved_scenarios` (must follow the existing demo/Supabase dual-repository shape, not a one-off).

## Required Implementation Work

- **Mobile:** iOS EAS profile; push-token registration + permission UX; saved-scenario save/load UI on the two simulator screens.
- **Backend:** `saved_scenarios` table + migration + RLS + pgTAP coverage; push-dispatch Edge Function or scheduled job; APNs/FCM credentials wired into EAS.
- **Testing:** Maestro spine re-run on iOS; new repository contract suite for saved scenarios (reusing the Phase 4 pattern); push-dispatch logic unit-tested; RNTL for the save/load UI.
- **Documentation:** STATUS.md; completion report; runbook addendum for iOS-specific release steps.

## Expected Files and Packages

`eas.json` (ios profiles) · `supabase/functions/dispatch-push/` (or equivalent scheduled function) · `apps/mobile/src/services/repositories/{demo,supabase}/*saved-scenario*` · `apps/mobile/src/services/repositories/saved-scenario.contract.ts` · `apps/mobile/src/features/{loan-simulator,card-simulator}/` extended with save/load · new Supabase migration for `saved_scenarios`. (Suggested paths.)

## Public Interfaces Produced

Push-dispatch pattern reusable for any future server-triggered notification type; saved-scenario repository pattern reusable if other "save a computed result" features are added later.

## Testing Requirements

- Maestro demo spine green on physical iOS device, EN + AR.
- Saved-scenario repository contract suite green against both demo and Supabase families (same shape as Phase 4's six contracts).
- Push-dispatch logic: unit tests for due-date/rate-change trigger conditions; manual verification of an actual delivered push on a physical device (both platforms).
- RNTL: save/load UI states (empty, populated, error).

## Verification Commands

```
pnpm run check
supabase test db
maestro test maestro/          # re-run on iOS target
eas build -p ios --profile preview
```

## Manual Validation

Physical iOS device: full demo script (normal, airplane-mode, Arabic) with evidence recorded, mirroring Phase 9's Android evidence bar. At least one real push notification delivered end-to-end (server trigger → device) on both iOS and Android, with a screenshot/recording.

## Exit Criteria

1. Maestro spine green on iOS, EN + AR.
2. iOS demo script performed on a physical device: normal, airplane-mode, and Arabic runs — evidence recorded, same bar as Phase 9 §Exit Criteria 2.
3. iOS performance budget numbers recorded (may differ from Android targets; record actuals either way).
4. Remote push: at least one real delivered notification on each platform, evidenced; quiet-hours and no-financial-content-in-payload verified.
5. Saved scenarios: save → reload → values match, verified for both loan and card simulators, both demo and personal (Supabase) modes.
6. iOS security/privacy checklist complete (Keychain, ATS, release-config diff).
7. TestFlight build live ≥48h before any judged iOS demo use (if this phase's output is used for judging — optional if Phase 9's Android build remains primary).
8. Completion report filed; STATUS.md updated.

## Required Documentation Updates

STATUS.md · roadmap-and-risks (remove iOS/push/saved-scenarios from deferred items) · completion report.

## Known Risks

- Apple Developer Program membership is a paid, user-side dependency with its own turnaround (account verification can take days) — flag immediately if not already active, same treatment as Phase 9's Android-device risk.
- Remote push requires ongoing infrastructure (a scheduled job or Edge Function must keep running) — unlike the rest of this MVP's mostly-static demo posture; needs an explicit owner post-hackathon if this ships.
- iOS RTL/safe-area quirks are a known source of platform-specific bugs not caught by the Android-only Phase 9 pass — budget real fix time, not just verification time.

## Cuttable Work

Remote push and saved scenarios are independent of each other and of iOS parity — any one can be dropped without blocking the other two. iOS parity itself cannot be meaningfully partial (either the device pass happened with evidence or it didn't).

## Handoff to Next Phase

None planned — this is currently the last phase in the sequence. Any further work (store submission, additional platforms, new obligation types) would need its own phase defined against the post-hackathon roadmap.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-10-COMPLETION.md` — iOS device evidence index, push-delivery evidence (both platforms), saved-scenario verification, final risk re-score.

## Carried over from Phase 7 (owner decision, 2026-07-13)

Phase 7's implementation (screens, formulas, provenance wiring) is done and verified; these were its
only unmet exit criteria, and the owner deferred them here rather than block Phase 8/9 on them.
Independent of this phase's own iOS/push/saved-scenarios scope above — pick up whichever answers have
arrived by the time this phase starts:

1. **TV-104 / TV-601 finance sign-off** — exact reference numbers requested from the finance contact:
   - TV-104 (amortization): 20,000 JOD principal, 7.5% annual rate, 84-month term, starting 2026-01-01
     — need the exact `computedInstallment` and `totalCost`.
   - TV-601 (card payoff): 2,350 JOD balance, 24% APR, minimum payment 3% (10 JOD floor) vs. fixed 100
     JOD/month — need exact `months`/`totalCharges` for both paths.
   - Once received: fill in `packages/finance-engine/vectors/tv-1xx-amortization.json` (TV-104) and
     `tv-6xx-card-payoff.json` (TV-601) with the signed values and `reviewedBy`, and confirm the engine's
     existing output matches within the vector's stated tolerance.
2. ~~Rate-history cumulative extra-interest annotation~~ — **done, 2026-07-13.** Owner decided against a
   JOD-total baseline comparison; instead `SCR-RATE-HIST` now shows the %-change in the rate itself vs.
   the previous period (increase/decrease), and `SCR-OBL-SCHEDULE` shows the %-change in the interest
   portion of each installment vs. the previous period. Both are UI-layer percentage displays over
   already-official/already-computed figures — no new finance-engine formula or vector needed.
3. **AR/EN airplane-mode walkthrough recording** — a formal recorded 5-minute demo-spine walkthrough
   (dashboard → loan → rate history → rate impact → explain sheet → scenario → bank questions), once
   airplane-mode/personal-mode Android device access is available for this phase's own device pass —
   can be captured in the same device session as Phase 10's iOS/Android manual validation.
