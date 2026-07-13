# Phase 7: Core Variable-Rate Loan Journey

**Status:** Built, Partially Completed (Pending Finance Sign-off)
**Date:** 2026-07-13

## Objectives Achieved

1. **Loan Detail Screen (`SCR-OBL-DETAIL-LOAN`)**: Fully built. Added unknown-as-"unknown" handling, provenance badges, the two-number comparison hero, payment history list, and links to history/schedule/simulator.
2. **Rate Impact (`SCR-RATE-IMPACT`)**: Built. Before/after projection, total cost, `projectedResidualAtMaturity` with cause language, and confidence/estimate framing.
3. **Explain Sheet (`SCR-EXPLAIN`)**: Built and parameterized by calculation-run ID. Deep-linked from rate impact, schedule, and scenario simulator.
4. **Schedule (`SCR-OBL-SCHEDULE`)**: Built. Shows the amortization schedule estimate with ExplainSheet access.
5. **Simulator (`SCR-SIM-LOAN`)**: Built. Debounced extra payment input, side-by-side outcome comparison, and performance recording. Perf measurement: ~90ms.
6. **Insight Center (`SCR-INS-CENTER`)**: Built. Grouped lists, mark-as-read integration with `InsightRepository`, "Why did I get this" expansion, and deep links to obligations.
7. **Quality Gates**: `pnpm run check` is completely green (format, lint, typecheck, depcruise, test:packages, test:app). No TypeScript or formatting errors remain.

## Partially Implemented / Pending Exceptions

As documented in `PHASE-7-PARTIAL-IMPLEMENTATION.md`:

1. **TV-30x Finance Sign-off**: The test vectors (TV-30x, TV-104, TV-203, TV-601) are still pending expected values from the finance team. The repository does not contain final signed values.
2. **Rate History Cumulative Annotation**: The cumulative extra-interest annotation in `SCR-RATE-HIST` is deliberately not implemented in this phase.
3. **Manual Airplane-Mode Walkthrough**: The physical recording of the AR+EN airplane-mode walkthrough has not been captured yet, as we are waiting on the final vector values to do the formal demo recording.

## Next Steps

- Proceed to Phase 8 or other tasks while keeping Phase 7 technically open strictly for the TV-30x vector update.
- Once finance provides the exact numbers, update `demo-seed-vectors.ts` and capture the physical airplane-mode walkthrough.
