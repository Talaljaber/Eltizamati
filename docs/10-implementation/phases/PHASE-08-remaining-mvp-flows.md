# Phase 8 — Remaining MVP Obligation and Support Flows

## Status

Planned

## Objective

The MVP surface is complete around the demo spine: Murabaha and card details, manual data entry (obligation/payment/rate), settings/data-status/legal/Learn, remaining insight rules — plus the explicitly cuttable depth items (card simulator, notifications, duplicate detection, mock-connect) in cut order.

## Why This Phase Exists

Breadth and honesty surfaces (contract-correct Islamic handling, honest provider status, education) plus the judge-interaction flows ("enter my own loan live") — everything the demo *stages on* but the spine doesn't strictly need. Gathered into one phase with explicit internal cut lines so time pressure trims depth, never the spine.

## Preconditions

Phase 7 complete. For personal-mode write flows: Phase 4 complete. Cut decisions (if any) recorded in STATUS.md before work starts.

## In Scope (core — not cuttable)

1. **SCR-OBL-DETAIL-MURABAHA:** contract-correct terminology (BR-TERM-001 — no "interest"/"فائدة" anywhere on Murabaha surfaces, grep-tested), fixed total sale price, paid/remaining, `murabahaProgress.v1` figures, INV-7 exactness, no rate/repricing UI (BR-CALC-020).
2. **SCR-OBL-DETAIL-CARD:** limit/balance/available/utilization, statement fields, minimum-payment display, rates/fees where known (FR-OBL-005); utilization insight rule (>70%) live.
3. **Manual entry:** SCR-OBL-ADD-TYPE + SCR-OBL-ADD-FORM (loan/Murabaha/card; zod validation; consistency notice BR-CALC-017), edit/archive/delete (FR-OBL-007/008), SCR-PAY-ADD, SCR-RATE-ADD (BR-OBL-002 overlap validation) — writes via application services → active-mode repositories with `userEntered` provenance (works in both modes; personal mode is the primary target).
4. **SCR-SET complete:** language, acknowledgments view (FR-SET-002), reset demo, erase (mode-appropriate per ADR-0017), account section (Phase-4 hooks), about/version.
5. **SCR-DATA-STATUS:** provider list with honest labels ("CRIF — not connected, planned"), record counts, last-updated (ManualEntryProvider read adapter per provider-abstraction §3a).
6. **SCR-LEGAL-DOC**, **SCR-LEARN + SCR-LEARN-TOPIC:** first 10 education entries, tap-a-term glossary integration (FR-EDU-001..004), bilingual.
7. **User-defined threshold insight + reminder-day setting** (FR-INS-001 user rule, FR-SET-006) — *setting + insight only; notification delivery is cut #3 item below.*
8. Remaining state-matrix coverage for all the above; form-field design-system family just-in-time.

## In Scope (cuttable, in cut order — record any cut in STATUS.md + completion report)

- **Cut #1 — Mock-connect flow** (SCR-CONSENT-PROVIDER + SCR-CONNECT-MOCK, US-017, FR-AUTH-005/FR-ONB-004): consent-gated retrieve→classify against the labeled mock through ImportService; permanent "Mock" badging (C-07).
- **Cut #2 — Card payoff simulator** (SCR-SIM-CARD, `cardPayoff.v1` + TV-6xx if deferred from Phase 6, US-013, FR-SIM-004): min-only/fixed/custom comparison, neverPaysOff warning, refusal on missing APR/balance.
- **Cut #3 — Local notifications** (FR-NTF-001): payment-due scheduling, permission UX, quiet hours, content-minimized (NFR-PRIV-005).
- **Cut #4 — Duplicate-payment detection** (FR-PAY-004): natural-key warn on log-payment.

## Out of Scope

Push notifications, phone OTP, real providers, export/saved scenarios (stretch), Ijara/Musharakah types (P1) · hardening/E2E/device passes (Phase 9) · SQLite (never).

## Architecture Decisions Applied

ADR-0009 (manual-entry path ≠ provider pipeline) · ADR-0017 (mode-appropriate writes/erasure) · BR-TERM-001 · content-terminology.md · provider-abstraction.md §3/3a · screen-inventory specs.

## Required Implementation Work

- **Mobile UI:** screens above per feature-folder shape; EN+AR; all states.
- **Application/state:** Obligation/Payment/Rate service write paths + mutations + invalidation; insight rules (utilization, user threshold); provider status adapter.
- **Security:** deep-link allow-list entries for new routes; no financial values in notification content (if cut #3 ships).
- **Testing:** below.
- **Documentation:** STATUS.md; education content files; completion report.

## Expected Files and Packages

`apps/mobile/src/features/{murabaha-detail,card-detail,add-obligation,log-payment,log-rate,settings,data-status,learn,connect-mock?,card-simulator?}/` · routes under `app/` · `content/education/*` (bilingual). (Suggested paths.)

## Public Interfaces Produced

Write-path mutations (add/edit/log) later phases' E2E exercises; education content format.

## Testing Requirements

- RNTL: forms validation paths, terminology test (grep Murabaha screens for banned terms), data-status honesty labels, settings erase flows (mode-appropriate absence checks).
- Unit: each new insight rule fires/dedups; duplicate detection (if shipped).
- Integration: manual add→appears in list→detail round-trip in both modes (personal mode with synthetic account).
- i18n coverage EN+AR incl. education content.

## Verification Commands

```
pnpm run check
pnpm run test:app
```

## Manual Validation

"Judge's loan in <2 minutes" run-through (manual add live) · Arabic pass over all new screens · if mock-connect ships: verify the Mock badge is present at every step with networking on *and* off (flow must degrade honestly).

## Exit Criteria

1. All three obligation types have complete, terminology-correct detail screens.
2. Manual entry works end-to-end in both modes (evidence per mode).
3. Settings/data-status/legal/Learn complete and bilingual; erase flows verified by absence checks.
4. Utilization + user-threshold insights fire correctly.
5. Each cuttable item: shipped with its tests **or** formally cut in STATUS.md — no half-states.
6. `pnpm check` + CI green; completion report filed.

## Exit Demo

Reviewer adds their own loan manually in under 2 minutes (both languages available), browses all three demo obligations with correct terminology, opens data-status and sees honest provider labeling.

## Known Risks

- Largest screen-count phase — the cut order is the pressure valve; the core list is sized to be achievable without the cuttable items.
- Terminology regressions on shared components (BR-TERM-001) — the grep test is mandatory, not optional.

## Cuttable Work

Cuts #1–#4 as listed (that ordering is canonical — mirrors IMPLEMENTATION_PLAN §8).

## Handoff to Next Phase

Phase 9 may rely on: the full MVP surface (minus recorded cuts), all write paths, all states implemented — hardening validates, it does not build features.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-8-COMPLETION.md` — per-item shipped/cut table with evidence, terminology-test output, both-mode write evidence.
