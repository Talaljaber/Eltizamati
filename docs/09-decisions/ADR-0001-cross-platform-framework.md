# ADR-0001 — Cross-Platform Framework & Language: Expo (React Native) + TypeScript

- **Status:** Accepted
- **Date:** 2026-07-10
- **Confidence:** Medium-High — raised to High once M0 exit demo (bilingual RTL shell on device) lands without friction
- **Reversal cost:** High (framework choices are foundational). Mitigated: `domain`/`finance-engine` are pure TS with no React imports — they survive any UI-framework change; docs/UX specs are framework-neutral.

## Context & forces
One codebase, Android+iOS, AR/EN/RTL from foundation (§35.1–3). The discriminating forces: **solo developer with strong web/TypeScript background and zero mobile experience**, heavy AI-agent implementation, hackathon deadline, decimal-safe money, long-term maintainability.

## Alternatives considered

### React Native + Expo (TypeScript) — chosen
- **Wins:** Talal's existing mental models (React, npm, TS debugging) transfer directly — time-to-productivity is the scarcest resource. The human review gate works: **Talal can competently review AI-generated TS/React; he cannot yet competently review Dart** — for an AI-heavy build, reviewer fluency is the ultimate defense against entropy (PRIN-10), and it outweighs framework-intrinsic tooling differences. Largest AI training corpus → fewest agent hallucinations. Expo managed workflow + EAS erases the scariest beginner surfaces (native projects, signing, builds). One language across app, shared packages, and future Supabase Edge Functions — zod schemas shared client/server (docs/05). Mature ecosystem: Expo Router, expo-sqlite, SecureStore, i18next.
- **Loses:** RTL is good but less elegant than Flutter's (`I18nManager` flip requires app reload — ADR-0010 designs around it). No native decimal type (decimal.js wrapped in `Money` — ADR-0007; equivalent discipline needed in Dart anyway). JS-thread perf model needs care for big schedules (chunking, NFR-PERF-002 — well within reach for this app class).
- **Failure modes & guards:** ecosystem churn → Expo SDK pinned, lockfile discipline (RISK-013); "web thinking" defects → mobile primer + review checklist.

### Flutter (Dart)
- **Wins:** best-in-class RTL/i18n (live `Directionality` switch, no reload), consistent rendering, strong analyzer, golden tests, excellent perf.
- **Loses the decision on:** new language + new framework simultaneously for a solo dev on a deadline; reviewer-fluency gap for AI output; zero skill transfer from web; ecosystem knowledge restart (state mgmt, testing idioms). Flutter is the better *framework in isolation* and the runner-up; it is not the better choice *for this team*.

### Kotlin Multiplatform + Compose Multiplatform
- Modern and promising, but iOS story younger, smallest AI corpus of the three, steepest learning curve from web — three compounding risks. Rejected.

### Capacitor/Ionic (web-view)
- Maximum skill transfer, but web-view UX ceiling (font rendering, scroll feel, RTL quirks in-web-view) undercuts a trust-critical fintech demo where "feels native and calm" is the brand. Rejected.

## Decision
**Expo (React Native, current stable SDK, New Architecture default) + TypeScript strict.** Expo Router for navigation (ADR-0005), EAS for builds.

## Consequences
- Must ship RTL discipline via lint + primitives from day one (NFR-L10N-002) since the framework won't force it.
- Must enforce Money VO discipline via lint (NFR-MNT-003) since the language won't.
- Dev build (not Expo Go) needed once MMKV lands — planned at M0 (mobile primer §11).
- CON-09: golden tests traded for RNTL + Maestro (ADR-0011).

## Validation required
M0 exit demo on a physical Android device including Arabic RTL flip; if RTL or perf shows structural (not effort-level) problems there, reopen against Flutter **before** M1 — that is the cheap reversal window.
