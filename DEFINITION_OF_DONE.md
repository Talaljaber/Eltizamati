# Definition of Done

## Feature-level (every FR/US shipped)
1. Acceptance criteria met (linked US/FR), including the screen's **loading/empty/error/limited** states from the state matrix — a feature that only handles the happy path is not done.
2. Works in **both languages** on device, RTL verified for new screens.
3. Tests per layer strategy (`docs/07-quality-operations/testing-strategy.md`) written and green; engine work has vectors + invariants.
4. Every displayed derived figure traceable: provenance badge + explanation view reachable + backing calculation run persisted.
5. `pnpm check` green; review checklist applied; docs/ids updated in the same PR.
6. No new `ASSUMPTION:` left unrecorded in the assumptions registry.

## Milestone-level (M0–M8)
1. Milestone exit demo performed on a physical Android device (not only emulator).
2. Arabic walkthrough of everything new; content issues filed or fixed.
3. Risk register re-scored; scope table deltas recorded in `mvp-scope.md` history.
4. Security verification checklist items relevant to the milestone pass.
5. (M6 only) RLS ownership-isolation tests (pgTAP) green before any multi-user data path is demoed; no real personal data stored until RES-003 (PDPL) is cleared.
6. (Backend/auth milestones) the scripted demo spine still runs in airplane mode — verify the added surface did not become a demo dependency (mvp-scope §5a).

## Demo-ready (pre-judging gate — all of `mvp-scope.md §5` plus)
1. Preview APK built ≥48h early, installed on primary + backup device; full script rehearsed ×3, once in airplane mode, once in Arabic.
2. TV-30x vectors signed off by finance teammates (`reviewedBy` filled) — every number in the demo can defend itself.
3. Demo banner, data-source honesty screen, and disclaimer copy verified in the build judges see.
4. Fallback recording captured of the complete flow.
