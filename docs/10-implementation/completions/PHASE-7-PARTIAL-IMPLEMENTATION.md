# Phase 7 Exceptions & Partial Implementation

This document explicitly tracks the parts of **Phase 7 — Core Variable-Rate Loan Journey** that are deliberately incomplete or pending external dependencies as of this phase's functional closure.

## 1. Pending TV-30x Finance Sign-off (External Blocker)

- **Requirement**: Every material figure displayed to a judge must trace back to a signed vector (`reviewedBy` filled).
- **Current State**: The UI is wired and the calculation engine works perfectly. However, the exact reference numbers for TV-301 through TV-305 (and related analytical vectors TV-104, TV-203, TV-601) are marked as `reviewedBy: null` and `source: 'finance-team'`. 
- **Action Required**: We must not invent these numbers. When the finance team provides the signed expected values, we will update the test vectors and confirm the engine matches them.

## 2. Rate History Cumulative Annotation (Omitted)

- **Requirement**: `SCR-RATE-HIST` was originally scoped to include a cumulative extra-interest annotation.
- **Current State**: Deliberately not implemented in this phase. The UI correctly renders the append-only rate timeline periods, but does not sum or annotate the cumulative extra-interest across periods.
- **Action Required**: Addressed in a future iteration or explicitly dropped from MVP scope if deemed unnecessary.

## 3. AR/EN Airplane Mode Walkthrough (Pending)

- **Requirement**: A recorded 5-minute manual demo spine walkthrough in Arabic and English, strictly in airplane mode.
- **Current State**: While the `useActiveUser` caching bug was fixed (ensuring airplane mode works), the final physical recording cannot be meaningfully captured until the finance sign-off provides the exact numbers the judges will see.
- **Action Required**: Capture the recording once TV-30x is populated.
