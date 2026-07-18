# Demo Runbook

Companion to [PHASE-09-hardening-and-release.md](../phases/PHASE-09-hardening-and-release.md).
This is the script for the actual judged demo and its rehearsals (Exit Demo: full 5-minute
script, on-device, airplane mode, in Arabic, from a pre-stage reset — witnessed/recorded).

> **Status:** written ahead of any physical-device rehearsal. Timings, exact taps, and the
> "what if it breaks" column are best-effort until at least one full on-device run has happened —
> update this file after every rehearsal, don't treat it as final until then.

## Pre-stage reset (do this before every rehearsal and before the real demo)

See [reset-checklist.md](./reset-checklist.md) — run it in full before starting the script below.

## Script (target: 5 minutes)

| #   | Step                                                        | Screen                | What to say                                                                                                    | Fallback if it breaks                                                                                              |
| --- | ----------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Launch, pick language, accept intro                         | Onboarding            | "This is Eltizamati — clarity on what you owe, in Arabic or English."                                          | Restart app; if still broken, switch to the fallback recording.                                                    |
| 2   | Choose demo mode, accept consent                            | Onboarding            | "Demo mode uses realistic seeded data — no real accounts involved."                                            | —                                                                                                                  |
| 3   | Dashboard: total owed, next payment                         | Home                  | "One number: what you owe right now, and what's estimate vs. official."                                        | If a figure is missing, point at the provenance badge instead — that's the honesty feature.                        |
| 4   | Obligations tab → open the loan                             | Obligations           | "Every obligation, one glance — loans, Murabaha, cards."                                                       | —                                                                                                                  |
| 5   | Rate History → Rate Impact                                  | Loan detail           | "The bank changed the rate; here's exactly what that costs going forward, not just the new number."            | —                                                                                                                  |
| 6   | Simulator: add extra monthly payment                        | Loan detail           | "What if I paid 50 more a month? Instant payoff-date and cost delta, before you touch the real world."         | If the simulator is slow, narrate over it — it should still resolve.                                               |
| 7   | Log a payment                                               | Loan detail           | "Logging a real payment takes two fields."                                                                     | —                                                                                                                  |
| 8   | (Arabic run only) Switch language, repeat steps 3–5         | Settings → any screen | Same narration, in Arabic.                                                                                     | Confirm RTL layout mirrors correctly before the real demo — this is exactly what Phase 8.5's Arabic review is for. |
| 9   | (Airplane-mode run only) Toggle airplane mode before step 3 | OS                    | "Personal-mode data needs a connection by design — here's the honest offline state, not a fake cached number." | This run is specifically to prove the honest-offline behavior; a crash here is a real bug, not narration cover.    |

## Rehearsal log

Run each of these at least once before judging, recording pass/fail and any deviation:

- [ ] Normal run (no airplane mode, English)
- [ ] Airplane-mode run
- [ ] Arabic run
- [ ] Fallback recording captured (full script, screen-recorded, in case live demo fails)

| Date      | Run type | Device | Result | Notes                                                                            |
| --------- | -------- | ------ | ------ | -------------------------------------------------------------------------------- |
| _pending_ | —        | —      | —      | Not yet rehearsed on physical hardware — see PHASE-9-COMPLETION.md's open items. |

## Related Maestro flows

`maestro/demo-spine-en.yaml` and `maestro/demo-spine-ar.yaml` automate steps 1–6 above (written,
not yet run on-device — see their own header comments). They're a scripted starting point for
rehearsal, not a replacement for a human running the actual script end to end.
