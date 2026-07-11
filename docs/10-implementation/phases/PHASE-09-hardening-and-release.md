# Phase 9 — Hardening, Devices, Security, and Release

## Status

Planned

## Objective

The MVP is demo-ready per mvp-scope §5: E2E-tested, validated on a physical Android device in both languages, security-checked, observably crash-reported, built as a preview APK on two devices, and rehearsed — with a filed final documentation set.

## Why This Phase Exists

Every prior phase validated its own slice on dev tooling; nothing has ever been validated on a physical device, in full Arabic, under real airplane-mode conditions, or as a release-profile build (the project has *never* had device evidence — CURRENT_STATE §7). Release readiness is its own discipline with its own gates.

## Preconditions

Phase 8 complete (with cuts recorded). Physical Android device(s) available + Android tooling installed (a user-environment prerequisite — flag in STATUS.md if missing). Node LTS confirmed. EAS account access.

## In Scope

1. **E2E (Maestro):** demo spine (onboard → dashboard → loan → rate impact → scenario) in EN **and** AR; add-obligation; log-payment; erase/reset flows.
2. **Full integration passes:** auth flows re-verified; RLS/pgTAP suite green against the deployed schema; migration apply-from-scratch check; repository contract suites green.
3. **Physical-device validation (Android-first):** full demo script on device; airplane-mode run; process-death/relaunch behavior; font-scale 1.5×; performance budgets (cold start ≤2.5s mid-range, scenario ≤300ms, dashboard jank-free — record numbers).
4. **Arabic walkthrough:** every screen, native-quality review (RES-009 input if available); RTL rendering sweep; content issues fixed or filed.
5. **Accessibility pass:** labels/roles on interactive elements, touch targets ≥44pt, contrast, text alternatives.
6. **Network-failure personal mode:** systematic offline/error/retry verification per personal-mode screen (honest states, no hangs, no fake data).
7. **Security & privacy pass:** security-controls checklist end-to-end; deep-link allow-list tests; no PII/financial values in logs (log-policy tests); gitleaks + `pnpm audit` blocking level; release-build config diff (no debug menus/dev toggles); consent surfaces verified in the judged build.
8. **Sentry:** wired for preview/production only, `sendDefaultPii:false`, scrubber, release-only (ADR-0015) — first wired here by design.
9. **EAS:** dev/preview/production profiles; `eas build -p android --profile preview` → APK ≥48h before judging; install on primary + backup device; tag `demo-v1` on the exact commit (with user approval); attach APK to a GitHub release (user approval).
10. **Rehearsal:** demo script ×3 (once airplane-mode, once Arabic); fallback recording of the complete flow; pre-stage reset checklist.
11. **Final documentation:** README final; STATUS.md closed out; risk register re-scored; all completion reports present.

## Out of Scope

New features of any kind · store submission (post-hackathon) · anything on the cut list that was cut (stays cut).

## Architecture Decisions Applied

ADR-0011 (Maestro/E2E) · ADR-0015 (Sentry-only observability) · ci-cd-environments.md (release process) · DEFINITION_OF_DONE.md (milestone + demo-ready gates) · mvp-scope §5/§5a.

## Required Implementation Work

- **Testing:** Maestro flows; any missing state/log-policy/route-guard tests found by the sweeps.
- **Security:** checklist execution + fixes; build-profile hardening.
- **Mobile/ops:** Sentry config; EAS profiles; app icons/splash — replace placeholder assets if brand assets exist (else record as accepted).
- **Documentation:** runbooks (demo checklist, reset procedure), final reports.

## Expected Files and Packages

`maestro/*.yaml` (or `.maestro/`) · `apps/mobile` Sentry config + `eas.json` · `.github/workflows` release additions (manual `workflow_dispatch` EAS trigger) · docs runbooks. (Suggested paths.)

## Public Interfaces Produced

The judged artifact: tagged commit + preview APK + rehearsal-verified demo runbook.

## Testing Requirements

Everything in In Scope 1–2 + regression: full `pnpm check`, engine coverage gate, pgTAP, contract suites — all green on the release commit.

## Verification Commands

```
pnpm run check
supabase test db
maestro test maestro/          # (exact invocation as established)
eas build -p android --profile preview
```

## Manual Validation

This phase largely *is* manual validation — every item in In Scope 3–7 and 10 with recorded evidence (video/screenshots/measurements). **No claim without evidence** (global gate 12).

## Exit Criteria

1. Maestro spine green in EN + AR.
2. Demo script performed on a physical Android device: normal, airplane-mode, and Arabic runs — evidence recorded.
3. Performance budget numbers recorded and within targets (or deviations accepted in writing).
4. Security checklist complete; gitleaks/audit green; release-config diff clean.
5. Sentry receiving events from a preview build (test event evidence).
6. Preview APK installed on two devices ≥48h before judging; `demo-v1` tagged (user-approved); fallback recording captured.
7. All nine completion reports exist; STATUS.md shows Phase 9 Complete; risk register re-scored.

## Exit Demo

The actual dress rehearsal: full 5-minute script on the demo device in airplane mode, in Arabic, from a pre-stage reset — witnessed/recorded.

## Required Documentation Updates

README · STATUS.md (final) · roadmap-and-risks re-score · demo runbook · completion report.

## Known Risks

- Device/tooling availability is a user-environment dependency discovered *late* if not flagged early — STATUS.md should track it from Phase 1 onward.
- First-ever device run may surface layout/perf issues from any phase — budget real fix time; that's why this phase exists.

## Cuttable Work

None of the validation gates. Backup-device redundancy and the GitHub-release attachment are the only soft items.

## Handoff to Next Phase

Post-hackathon: [roadmap-and-risks.md](../../08-delivery/roadmap-and-risks.md) (P1 = local-first enhancement + real-data readiness) and [FUTURE_LOCAL_FIRST_ROADMAP.md](../../08-delivery/FUTURE_LOCAL_FIRST_ROADMAP.md).

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-9-COMPLETION.md` — device evidence index, rehearsal log, performance numbers, security checklist results, build artifacts (tag, APK hash), final risk re-score.
