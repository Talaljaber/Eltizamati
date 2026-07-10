# Mobile Primer for a Web Developer

**Audience:** Talal (strong web background, first mobile project) and any AI agent about to make a web-shaped assumption. Each row: the mobile reality → what we do about it in *this* codebase. This is operating guidance, not a tutorial (SRC-2 §mobile_beginner_requirement).

## 1. App lifecycle ≠ page lifecycle
- **Reality:** the OS kills your app whenever it wants (memory pressure, backgrounding). There is no `beforeunload`; death is silent. On Android, the process can die and the user still "returns" to your app expecting their place.
- **Here:** all durable state lives in SQLite/MMKV at write time (never "save on exit"); Zustand holds only recreatable UI state; forms of consequence (add obligation) keep drafts in MMKV. Test: swipe-kill the app on every core screen (edge matrix "process death").

## 2. Navigation is a stack, not a history
- **Reality:** mobile nav is push/pop per tab with hardware back on Android; users expect tab state preserved when switching tabs. Deep links can cold-start the app into a nested screen with no stack behind it.
- **Here:** Expo Router file routes define the stack; NAV-1..7 rules in `information-architecture.md`; deep links validated + entities re-fetched by id (NFR-SEC-005); every pushed screen must behave when it's the *first* screen after cold start.

## 3. There is no viewport — there are notches, insets, and keyboards
- **Reality:** safe areas (notch, home indicator), on-screen keyboards that cover inputs, and no CSS media queries as you know them.
- **Here:** the `Screen` primitive owns safe-area handling; forms use keyboard-avoiding behavior from the `Sheet`/form primitives; never hand-roll insets in features.

## 4. Storage tiers (there's no localStorage)
- **Reality:** three tiers — secure enclave (Keychain/Keystore: small secrets), fast KV, and a real database. Files are sandboxed per app.
- **Here:** SecureStore = tokens only (P1); MMKV = preferences; SQLite/Drizzle = all domain data (ADR-0006). Never store domain data in KV "temporarily".

## 5. Background execution is a privilege, not a thread
- **Reality:** both OSes aggressively restrict background work; timers don't run when backgrounded; "just poll every minute" doesn't exist.
- **Here:** MVP does nothing in background. Local reminders (stretch) use *scheduled OS notifications* (the OS fires them, not our code). P1 sync runs on foreground triggers (offline-sync.md).

## 6. Permissions are runtime UX moments
- **Reality:** each sensitive capability (notifications) prompts the user once; denial is sticky and must be handled forever after.
- **Here:** only notification permission exists in scope (stretch); request it in context (when user enables reminders), never at launch; denial → feature-level explanation, no nagging.

## 7. Builds, signing, releases (the truly new part)
- **Reality:** apps ship as signed artifacts — Android APK (direct install, hackathon) / AAB (Play Store); iOS requires Apple Developer account, provisioning, TestFlight for testers. Signing keys are unforgeable identity: lose them, lose the app's update path.
- **Here:** EAS Build (cloud) manages keystores/profiles: `eas build --platform android --profile preview` → installable APK for judges. `eas.json` defines `development` (dev client), `preview` (demo APK), `production`. iOS build deferred but config kept valid (NFR-MNT-001). OTA JS updates via EAS Update possible later — never for security fixes to native config.
- **Demo insurance:** build the demo APK ≥ 48h before judging; install on two devices.

## 8. Environments & config
- **Reality:** no `.env` at runtime; config is baked at build time. Anything in the JS bundle is extractable — public ≠ secret (NFR-SEC-001).
- **Here:** `app.config.ts` + EAS profile env vars → typed `core/config`; only public values (Sentry DSN, P1 Supabase URL + anon key — anon key is public *by design*, safety comes from RLS). Real secrets live only in Supabase Edge Functions (P1).

## 9. Performance model
- **Reality:** JS runs on one thread (Hermes); long synchronous work janks the UI; lists must be virtualized; re-renders are the usual culprit.
- **Here:** engine calls for big schedules run chunked/async with loading states (NFR-PERF-002); `FlashList`/`FlatList` for schedules; React DevTools profiling before "optimizing".

## 10. Platform differences that will bite
- Android back button (NAV-6) · RTL flip needs app reload after language switch (ADR-0010) — plan the settings UX for it · text rendering/fonts differ per platform (test Arabic on real Android early) · date pickers are platform components · dev on physical Android device via Expo Go / dev build from day one (emulators hide font+perf truths).

## 11. Debugging & device loop
- `npx expo start` → Expo Go for instant iteration; dev builds when native modules are added (MMKV requires a dev build — Expo Go won't load it; plan the switch at M0).
- Flipper/React DevTools for inspection; Sentry for release-crash truth; `adb logcat` is your server log.

## 12. Web habits to unlearn (checklist for code review)
- ❌ `window`, `document`, `localStorage`, CSS strings ❌ px-perfect absolute layouts (use flex) ❌ `setInterval` for anything durable ❌ blocking the JS thread with big loops (chunk it) ❌ assuming fast/any network (MVP: none) ❌ `left/right` styles (RTL — logical properties only) ❌ storing money as `number` (decimal.js via `Money` — everywhere).
