# Phase 4 — Authentication, Repositories, and Application Integration

## Status

Ready to begin — Phase 3 verified complete (2026-07-11). Blocked only on user approval for this phase's new dependencies (see Preconditions).

## Objective

Personal mode works end-to-end against Supabase: a user can sign up (email verify), sign in, have consent recorded server-side, read/write owned data through Supabase-backed repositories via TanStack Query, see honest offline/error states, and delete their account — all behind the shared repository interfaces and a single composition root.

## Why This Phase Exists

This is the client half of the Supabase foundation (split from Phase 3 — IMPLEMENTATION_PLAN §1): the first network/auth surface in the app, verifiable only through the running app, and the layer every personal-mode feature in Phases 7–8 calls through.

## Preconditions

Phase 3 complete (schema, RLS, pgTAP, generated types). RES-003 status checked: **until cleared, synthetic/test accounts only — no real personal data.** User approval for adding dependencies (`@supabase/supabase-js`, TanStack Query, SecureStore adapter — each with the AI_AGENT_RULES §12 justification).

## In Scope

1. **Supabase client:** configured from typed env; session persistence via the supported Expo pattern with SecureStore for sensitive session material (NFR-SEC-003); no supabase-js import outside the infrastructure layer (extend dependency-cruiser rules).
2. **Email auth flows:** sign-up + email verification, sign-in, sign-out, password reset, session restore/refresh — screens SCR-AUTH-SIGNIN / SCR-AUTH-SIGNUP / SCR-AUTH-RESET (per screen-inventory states: loading/error/offline/verification-pending), reachable from onboarding's optional account step (FR-ONB-006) and settings. Demo mode remains fully accessible without auth — "Continue in demo mode" is always present.
3. **Consent (server-backed):** versioned, timestamped consent records written under RLS on sign-up/first sign-in (app-level disclaimer re-acknowledgment per FR-ONB-003/FR-AUTH-002); re-consent on version bump.
4. **Supabase repositories:** implement every Phase-2 repository interface over generated types with row↔domain mappers (provenance columns round-trip); no raw rows past the infrastructure boundary.
5. **TanStack Query foundation:** QueryClient at the composition root; centralized query keys (`api/keys.ts` pattern); mutations invalidate affected keys; AppError mapping (`connectivity`, `auth`, `storage` codes) → typed error states.
6. **Composition root** (`apps/mobile/src/services/composition-root.ts`): selects demo vs Supabase repository family by `dataMode`; the only place mode is switched on.
7. **Offline/error UX:** shared error/retry/offline components wired through query states; personal mode shows explicit "connection required" surfaces — no fake offline capability, no mutation queueing.
8. **Account deletion:** full workflow (re-auth → server-side erasure per the Phase-2/3 contract → audit event → local cache/preferences cleared → signed out), verified by absence checks.
9. **Biometric app-lock** (FR-AUTH-004) — **cuttable (cut #5)**.

## Out of Scope

Demo repositories/seed (Phase 5 — but the interfaces they share are fixed here if not already) · any obligation/loan feature screens (Phases 7–8) · mock-connect flow (Phase 8) · Edge Functions beyond deletion needs · offline cache/queue (future roadmap) · real personal data before RES-003.

## Architecture Decisions Applied

ADR-0017 (mode behavior, offline contract) · ADR-0004 (TanStack Query + Zustand) · ADR-0014 (Result/AppError) · ADR-0009 (no business branching on mode) · api-and-providers.md §1 · NFR-SEC-003 · T-03/T-04 mitigations.

## Required Implementation Work

- **Application services/state:** composition root; query/mutation hooks foundation; AppError mapping.
- **Data/backend:** repositories + mappers; deletion workflow (client + any required SQL function/Edge Function).
- **Mobile UI:** three auth screens + onboarding account step + settings account section (sign-out, delete account) — all states, EN+AR.
- **Security:** SecureStore session storage; dependency-cruiser rule: only infrastructure imports supabase-js; no tokens in logs.
- **Testing:** see below.
- **Documentation:** system-architecture composition-root section confirmed real; STATUS.md; completion report.

## Expected Files and Packages

`apps/mobile/src/core/supabase/` (client, session storage) · `apps/mobile/src/services/composition-root.ts` · `apps/mobile/src/services/repositories/supabase/*.ts` + mappers · `apps/mobile/src/features/auth/` (screens, api hooks, `__tests__`) · `apps/mobile/app/auth/*` routes · extended `.dependency-cruiser.cjs`. (Suggested paths; follow system-architecture §7 feature shape.)

## Public Interfaces Produced

Working repository implementations (personal mode) · auth/session service · query-key registry · error-mapping utilities · the composition root contract — everything Phases 7–8 consume for personal-mode data.

## Testing Requirements

- **Integration:** repository round-trips (write→read→domain equality incl. provenance) against local Supabase; cross-user denial re-verified through the client path (complements pgTAP).
- **Auth integration:** sign-up/verify/sign-in/reset/session-restore against local Supabase (documented manual steps where email delivery is involved).
- **Contract suite:** repository-interface contract tests that Phase 5's demo repositories must also pass (write it here, parameterized).
- **Component:** auth screens' loading/error/offline states (RNTL); EN+AR keys present.
- **Erasure:** account-deletion absence test (all tables count 0 for the deleted user).

## Verification Commands

```
supabase start
pnpm run check
pnpm run test:app
# integration suite command as established (documented in the completion report)
```

## Manual Validation

Full auth loop on Metro/dev build against local Supabase (evidence: recorded steps/screens) · airplane-mode check: personal mode shows the offline surface, demo entry still works · Arabic pass over the new screens.

## Exit Criteria

1. A synthetic user completes sign-up→verify→sign-in→data write→sign-out→sign-in→data read.
2. All repositories implement the Phase-2 interfaces; contract suite green.
3. Cross-user isolation verified through the app path.
4. Account deletion leaves zero rows (absence evidence) + audit event.
5. Consent record exists server-side for the test user, versioned.
6. Offline/error states render (evidence) — no silent failures, no queued financial writes.
7. supabase-js confined to infrastructure (depcruise green with the new rule).
8. `pnpm check` + CI green; EN+AR for all new strings; completion report filed.

## Exit Demo

Reviewer watches: create account → consent → add a row (via a temporary dev-only harness or service test if Phase-7 screens don't exist yet — labeled as such) → see it in Supabase Studio under RLS → delete account → row gone. Then: airplane mode → personal mode honestly unavailable, demo path unaffected.

## Required Documentation Updates

`api-and-providers.md` (implemented status) · `security-controls.md` (verification column evidence) · STATUS.md · completion report.

## Known Risks

- Highest-integration-risk phase (first network/auth surface). Contained by Phase 3's verified foundation and by demo mode's independence.
- Email verification in local dev needs the Supabase local inbox (mailpit) — document the workflow.
- Session/SecureStore adapter choices vary by Supabase SDK version — record the exact supported pattern used.

## Cuttable Work

Biometric app-lock (cut #5). Nothing else — auth/repos/deletion are load-bearing for personal mode.

## Handoff to Next Phase

Phases 7–8 may rely on: auth/session, personal-mode repositories via TanStack Query hooks, error/offline components, composition root. Phase 5 must make its demo repositories pass the contract suite produced here.

## Completion Report Requirement

`docs/10-implementation/completions/PHASE-4-COMPLETION.md` — flows exercised (with evidence), contract-suite results, isolation/erasure evidence, dependency justifications, RES-003 status at close.
