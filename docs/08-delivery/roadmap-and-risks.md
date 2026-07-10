# Post-Hackathon Roadmap & Risk Register

## 1. Roadmap (phases gate on validations, not dates)

### P1 — Real accounts (gate: hackathon done + RES-003 legal read + decision to continue)
Supabase deployment (schema+RLS already designed: docs/05) · email auth + sessions (FR-AUTH-001) · server-side consent records + re-consent (FR-AUTH-002) · cloud persistence with read-cache + mutation queue (offline-sync.md P1 design) · account deletion workflow + audit events (FR-AUTH-003) · biometric app-lock (FR-AUTH-004) · SQLCipher decision (ADR-0006 revisit) · Ijara + Diminishing Musharakah read-only types + generic facility (FR-OBL-009/010) · RES-004 engine validation against real schedules (removes "unvalidated" caveats).

### P2 — Real data (gate: RES-002 sandbox access in writing)
CRIF sandbox provider via Edge Functions (consent-gated) · import conflict UX (BR-PROV-001 flows with real collisions) · statement entities · Open Banking pilot per CBJ/JoPACC availability.

### P3 — Engagement & scale (gate: retention evidence)
Push notifications (FR-NTF-002; reuses insight deep links) · privacy-reviewed analytics (SRC-1 §30.1 taxonomy) · card payoff engine GA if not done · saved scenarios · export/reporting · Arabic content expansion.

### Explicitly deferred until regulated-model decisions: advisers/household/white-label, any payment initiation.

## 2. Risk register

**Scales:** Likelihood/Impact H/M/L. Owner defaults to Talal; V = validation teammate involvement.

| ID | Risk | L | I | Mitigation | Trigger/monitor |
|----|------|---|---|-----------|-----------------|
| RISK-001 | A displayed financial figure is materially wrong / refuted by a bank | M | **H** | Vectors + invariants + estimate framing + confidence + refusal rules (BR-CALC-016); finance sign-off gates M3; RES-004 before any production claim | Any vector dispute; user report |
| RISK-002 | Scope creep dilutes the demo (SRC-1 breadth temptation) | H | H | mvp-scope change control (§6); stretch queue ordered; milestone cut lines | Any "quick add" conversation |
| RISK-003 | Mobile-newness stalls (build issues, native modules, signing) | M | H | Expo managed workflow; dev build early (M0); mobile primer; EAS handles signing; APK built 48h early | M0 slippage >2 days |
| RISK-004 | AI-generated code entropy (duplicate logic, layer bypass) | M | M | AI_AGENT_RULES + boundary lint + review checklist + small-PR rule | dependency-cruiser failures; review friction |
| RISK-005 | Demo-day failure (device, network, state) | L | H | Airplane-mode design; 2 devices; reset-demo; recording fallback; rehearsal ×3 | Rehearsal failures |
| RISK-006 | ASM-002 falsified (balloon pattern not real in Jordan) | L | H | Early teammate validation; fallback story = card payoff (S1 promoted) | RES-006/007 findings |
| RISK-007 | Arabic quality embarrasses at demo (machine-translation feel) | M | M | Arabic-first authoring; RES-009 native review gate before rehearsal | Reviewer feedback |
| RISK-008 | Islamic modeling error offends/misleads (worse than absence) | L | H | Murabaha-only, display-only math (BR-CALC-020); RES-008 validation; no simulation | Teammate review |
| RISK-009 | Solo-dev time shock (everything takes 1.5×) | H | M | Milestones independently demoable — the demo exists from M1 onward, only its depth grows; stretch strictly after M6 | Milestone velocity |
| RISK-010 | Hackathon rules conflict with pre-built KB/repo (RES-010) | L | H | Verify rules ASAP; KB is docs not code; be transparent with organizers | RES-010 answer |
| RISK-011 | Judges can't feel the problem (financial literacy gap in room) | M | M | Demo script leads with human story; one-sentence problem; visuals of "4 more years" | Pitch rehearsal feedback |
| RISK-012 | P1 sync complexity underestimated later | M | M | Sync design frozen now (offline-sync.md); derived-data-never-syncs rule keeps surface small | P1 planning |
| RISK-013 | Key dependency (Expo/lib) breaking change mid-build | L | M | Lockfile discipline; no upgrades after M2 without need; Expo SDK pinned | CI failures on install |
| RISK-014 | Legal/regulatory surprise (PDPL, CBJ information-service boundaries) | L | H (prod) | Nothing claims advice; consent-first; RES-003 before production; hackathon build is demo-data-safe | Legal review outcome |

Review cadence: risks re-scored at each milestone exit; new risks get IDs, none deleted.
