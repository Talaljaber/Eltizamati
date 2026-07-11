# Phase 7 — Core Variable-Rate Loan Journey (The Demo Story)

## Status

Planned

## Objective

The complete primary demo story works end-to-end on demo data in airplane mode, in Arabic and English: open the loan → rate history → rate-change impact (added cost, residual/balloon warning) → tap-through explanation with provenance/assumptions → extra-payment scenario that visibly restores the trajectory → bank-questions checklist.

## Why This Phase Exists

This is the money shot — the one memorable flow the MVP exists to prove (mvp-scope §1). It converges Track A-independent work: Phase 5's populated demo experience + Phase 6's engine.

## Preconditions

Phases 5 and 6 complete. TV-30x finance sign-off **in progress** (gates this phase's exit — every number judges see must trace to a signed vector).

## In Scope

1. **SCR-OBL-DETAIL-LOAN (full):** all fields with unknown-as-"unknown" handling (FR-OBL-003, BR-CALC-016), provenance badges throughout, **"two numbers" comparison hero** (official balance vs projected true cost — SRC-4 promotion), payment history section (SCR-PAY-LIST read view), links to rate history/schedule/simulator.
2. **SCR-RATE-HIST:** rate timeline (append-only periods), cumulative extra-interest annotation.
3. **SCR-RATE-IMPACT ⭐:** before/after projection, added total cost, `projectedResidualAtMaturity` with cause language (BR-CALC-012/013 — contractual balloon vs detected residual distinct), confidence/estimate framing (BR-CALC-014).
4. **SCR-EXPLAIN ⭐ (reusable sheet):** parameterized by calculation-run id — inputs snapshot, sources/provenance, formula id+version, assumptions, confidence; deep-linked from every material figure (`Amount` onPress wiring).
5. **SCR-OBL-SCHEDULE:** amortization schedule view (estimate-labeled).
6. **SCR-SIM-LOAN ⭐:** extra monthly / one-time inputs → side-by-side outcome (residual gone, months earlier, ≈ saved), boundary language per content rules, <300ms perf target (NFR-PERF-002; measure and record).
7. **SCR-BANK-QUESTIONS:** static checklist generated from the scenario context.
8. **Insight rules live:** RATE_INCREASED / INSTALLMENT_UNCHANGED_AFTER_INCREASE / RESIDUAL_RISK firing on the seeded loan (pre-seeded read-states per seed spec) + **SCR-INS-CENTER** (grouped list, read state, "why did I get this?", deep links, "all calm" empty state).
9. **Design-system additions just-in-time:** `TimelineItem`, `FieldRow`, `InsightBanner`, `ProgressBar`, `Sheet`, `SectionHeader` (tests per DS-4).
10. Works identically for personal-mode data through the same hooks (no mode branching) — verified at least with a synthetic account if Phase 4 is done; demo mode is the acceptance path.

## Out of Scope

Murabaha/card rich detail (Phase 8) · manual entry / log payment / log rate UI (Phase 8 — the _engine and services_ for them exist; this phase reads seeded history) · card simulator · notifications · mock-connect · export.

## Architecture Decisions Applied

ADR-0007/0009/0017 · screen-inventory.md (SCR specs + state matrix) · content-terminology.md (boundary/tone rules) · BR-CALC-012/013/014/016/017 · data-provenance.md.

## Required Implementation Work

- **Mobile UI:** the seven screens/sheets above, feature-folder shape, EN+AR, logical styles, all matrix states (incl. refusal/limited views when engine refuses).
- **Application/state:** query hooks for projections/scenarios/explanations over CalculationService; insight evaluation on relevant events; scenario debounce/perf.
- **Testing:** below.
- **Documentation:** STATUS.md; screen-state confirmations; completion report.

## Expected Files and Packages

`apps/mobile/src/features/{loan-detail,rate-history,rate-impact,explain,schedule,scenario,insights}/` · `apps/mobile/app/obligation/[id]/*` routes + insights route (header icon entry) · new primitives. (Suggested paths.)

## Public Interfaces Produced

The explain-sheet pattern + detail-screen composition Phases 8 reuses; insight-center infrastructure.

## Testing Requirements

- RNTL per screen: states incl. refusal/limited; `Amount` provenance rendering asserted (US-009).
- Scenario flow integration test: seeded loan → +50 JOD → residual cleared (mirrors TV-304).
- Insight rules: fires/dedups/why-line per rule.
- i18n coverage EN+AR; terminology check (no "interest" on Murabaha surfaces — grep BR-TERM-001 even though Murabaha detail is Phase 8, shared components must be namespace-driven).
- Perf: scenario compute <300ms on dev hardware recorded (device-grade validation lands Phase 9).

## Verification Commands

```
pnpm run check
pnpm run test:app
```

## Manual Validation

**Airplane-mode demo-spine walkthrough (mandatory, AR + EN):** dashboard → loan → timeline → impact → explanation → scenario → bank questions; evidence recorded. Every displayed derived figure cross-checked against its signed vector id.

## Exit Criteria

1. Demo spine runs end-to-end in airplane mode, AR+EN, on the seeded loan.
2. **TV-30x signed** (`reviewedBy` filled) and passing — every judge-visible number traces to a vector.
3. Every material figure: provenance badge + explain-sheet reachable + persisted run behind it (DoD feature-level #4).
4. Scenario visibly resolves the residual; perf number recorded.
5. Insight center shows the three seeded insights with correct read-states.
6. All states per matrix; `pnpm check` + CI green; completion report filed.

## Exit Demo

The 5-minute demo script beats 1–3 (hackathon-plan §4), performed in Arabic, in airplane mode.

## Required Documentation Updates

STATUS.md · calculation-test-vectors.md (signed statuses) · completion report.

## Known Risks

- TV-30x sign-off is an external dependency — if stalled, the phase can be feature-complete but **must not close**; escalate via STATUS.md.
- Chart/visual ambitions: design-system §5 bans chart libraries — timeline/progress must compose from primitives.

## Cuttable Work

None — this phase _is_ the product story. (Two-numbers hero could degrade to a single-figure header under extreme pressure; record if so.)

## Handoff to Next Phase

Phase 8 may rely on: detail-screen composition pattern, explain sheet, insight infrastructure, all primitives built so far.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-7-COMPLETION.md` — walkthrough evidence (AR+EN, airplane), vector sign-off record, perf measurement, figure→vector trace table.
