# Phase 8.5 — Workstream 5: Validation Matrix & Exit Review Record

**Date:** 2026-07-13
**Scope:** Independent validation of the five Workstream 4 representative screens (Home, Obligations
list, Obligation detail, Add-obligation form, Settings) against the Phase 8.5 validation matrix and
exit criteria.
**Environment constraint:** this pass was performed by static code inspection, targeted/automated
tests, and full repository checks — there was no running simulator, physical device, or visual
rendering available in this environment. Checks below are marked **[code-verified]** where confirmed
by inspection/tests, or **[needs device/human verification]** where they require actual rendering or
native-fluency judgment. This record does not itself close Phase 8.5 — see Outstanding gates, below.

**Live owner review during this pass:** the owner ran the app on a live device/simulator concurrently
with this workstream and flagged two real visual defects on the obligation-detail and insights screens
(§3.5). Both were fixed immediately as unambiguous corrections (not deferred as findings), since they
were small, well-scoped, and did not touch financial logic or provenance. This is informal evidence
toward the device-rendering gaps marked 🔲 below, but is not a substitute for the formal Arabic-reading
review still required before exit (§5).

---

## 1. Repository-wide checks (prerequisite to the matrix)

Run sequentially against the current `phase6-finance-engine` head (`b384775`, merged to `main` as PR
#15 at `05c060f`):

| Check                    | Result                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm run typecheck`     | ✅ Pass (`tsc --build` + mobile `tsc --noEmit`, zero errors)                                                             |
| `pnpm run lint`          | ✅ Zero errors in `apps/` and `packages/` (repo-wide pass since `b384775` added `.claude/`/`.agents/` to eslint ignores) |
| `pnpm run test:app`      | ✅ 49 suites / 263 tests pass                                                                                            |
| `pnpm run test:packages` | ✅ domain + finance-engine + demo-data, all pass                                                                         |
| `pnpm run depcruise`     | ✅ 481 modules / 1,516 dependencies, zero violations                                                                     |
| `pnpm run format:check`  | ✅ All matched files clean                                                                                               |

All green. This confirms the baseline the matrix below is executed against.

---

## 2. Validation matrix, per representative screen

Legend: ✅ code-verified pass · ⚠ code-verified pass with a noted limitation · ⛔ finding requiring
owner decision · 🔲 needs device/human verification (not performable in this environment)

### 2.1 Home (financial overview)

| Dimension                      | Result                                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| English                        | ✅ All 8 referenced i18n keys resolve in `en.json`                                                                                                                                                          |
| Arabic                         | ✅ All 8 keys resolve in `ar.json`; owner's `index.test.tsx` renders the screen under a live Arabic `t()` mock and asserts on real Arabic strings (`تقديري`, `رسمي`) — the strongest evidence in the matrix |
| RTL                            | ✅ No hardcoded `left`/`right`/`marginLeft`/`marginRight`; layout uses `Text`'s logical `align` and flex row/gap only                                                                                       |
| LTR                            | ✅ Default rendering path, covered by existing suite                                                                                                                                                        |
| Light theme tokens             | ✅ All colors via `useTheme()`; `tokens.test.ts` verifies ≥4.5:1 contrast for every text/interactive role used here                                                                                         |
| Dark-compatible tokens         | ✅ Same theme object, values defined and contrast-tested; 🔲 no device to confirm rendered appearance                                                                                                       |
| Default text size              | ✅ No fixed-height clipping on the amount rows                                                                                                                                                              |
| Enlarged text (Dynamic Type)   | ⚠ `amountHero`/`amountMd` grow vertically with system font scale (no `numberOfLines`); 🔲 not device-verified                                                                                               |
| Loading                        | ✅ `SkeletonCard` x2                                                                                                                                                                                        |
| Empty (no insights)            | ✅ `Card surface="flat"` + `home.noInsights`                                                                                                                                                                |
| Error (aggregates query error) | ✅ falls through to `home.totalPending` fallback text, no crash, no fabricated value                                                                                                                        |
| Refused calculation            | ✅ engine-refused outcome → `total`/`calculationRunId` undefined → same safe fallback; `nextDue` still renders independently since it has its own provenance                                                |
| Limited data (no obligations)  | ✅ aggregates hook handles empty obligation array; summary shows fallback text                                                                                                                              |
| Official data                  | ✅ `nextDue` amount renders `official` precision when its own provenance says so (owner's `Amount.tsx` fix makes this provenance-authoritative)                                                             |
| User-entered data              | N/A — Home shows only engine aggregates and next-due, not raw user-entered fields                                                                                                                           |
| Estimated data                 | ✅ Total **always** renders as an estimate (`≈` + label) regardless of input quality, per the owner's `b81ab80` fix — correctly reflects that it is an engine-calculated output                             |
| Offline demo mode              | ✅ `DemoBanner` still rendered; no network calls added                                                                                                                                                      |

**Test evidence:** `app/(tabs)/__tests__/index.test.tsx` (7 tests) directly exercises Arabic strings, ≈-prefix presence, accessibility-label provenance wording, the "material money only through `Amount`" invariant, refused-calculation fallback, and loading safety.

### 2.2 Obligations list

| Dimension                           | Result                                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| English / Arabic                    | ✅ All 3 keys resolve in both locales; owner's test renders a real demo obligation and asserts on the rendered `Amount` + `provenance.demo` accessibility label                                                                               |
| RTL / LTR                           | ✅ No physical left/right; `ListRow` is direction-aware by construction                                                                                                                                                                       |
| Light / dark tokens                 | ✅ Icon box uses `theme.bgSubtle`; no hardcoded hex                                                                                                                                                                                           |
| Default / enlarged text             | ⚠ Institution name uses `numberOfLines={1}` (pre-existing, not introduced this pass) — long Arabic institution names will truncate in the list; full name remains visible on the detail screen. Logged below as a minor, non-blocking finding |
| Loading                             | ✅ `SkeletonCard` x3                                                                                                                                                                                                                          |
| Empty                               | ✅ `EmptyState` with title/subtitle                                                                                                                                                                                                           |
| Error                               | N/A — list query has no distinct error branch beyond loading; falls through gracefully (pre-existing)                                                                                                                                         |
| Refused / limited data              | ✅ Rows with no resolvable balance (`extractOfficialBalance` returns `undefined` for some `genericFacility`/`ijara` cases) simply omit the `Amount` — no fabricated figure                                                                    |
| Official / user-entered / estimated | ✅ Each row's `Amount` now derives display from real per-obligation provenance (`extractOfficialBalance`), provenance-authoritative per the `Amount.tsx` fix                                                                                  |
| Offline demo mode                   | ✅ `DemoBanner` unchanged                                                                                                                                                                                                                     |

**Test evidence:** `app/(tabs)/__tests__/obligations.test.tsx`.

### 2.3 Obligation detail (murabaha/card-detail gap found — see §3)

| Dimension                                                       | Result                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| English / Arabic                                                | ✅ All 29 referenced keys resolve in both locales                                                                                                                                                                                                                                                                                          |
| RTL / LTR                                                       | ✅ `NavRow`'s chevron direction is now resolved **inside** the component (owner's fix moved it off module-scope, so it re-evaluates per render instead of being frozen at import time); owner's `workstream-4-patterns.test.tsx` explicitly renders `NavRow` under forced `I18nManager.isRTL = true` and asserts the back-pointing chevron |
| Light / dark tokens                                             | ✅ No hardcoded hex in the touched file                                                                                                                                                                                                                                                                                                    |
| Default / enlarged text                                         | ✅ No `numberOfLines` on any touched element; `primaryActions` buttons grow vertically at large scale rather than clip                                                                                                                                                                                                                     |
| Loading                                                         | ✅ `SkeletonCard`                                                                                                                                                                                                                                                                                                                          |
| Empty / not-found                                               | ✅ `EmptyState` (notFoundTitle/Subtitle)                                                                                                                                                                                                                                                                                                   |
| Error                                                           | ✅ `viewModel.status === 'error'` branch, no crash                                                                                                                                                                                                                                                                                         |
| Refused calculation                                             | ✅ `LoanDetailHero` explicitly falls back to `common.unknown` per-field when a `Sourced` value or provenance is absent, rather than guessing                                                                                                                                                                                               |
| Limited data                                                    | ✅ Murabaha `progress` optional → `common.unknown` fallback; card `statementBalance`/APRs optional → `common.unknown` fallback                                                                                                                                                                                                             |
| Official / user-entered / estimated (hero + payment history)    | ✅ `LoanDetailHero` and payment-history rows render through `Amount` with real provenance                                                                                                                                                                                                                                                  |
| Official / user-entered / estimated (murabaha/card body fields) | ⛔ **Finding — see §3.1**: `MurabahaDetailSection`/`CardDetailSection` render money via `FieldRow` + `.value.toStorageString()`, discarding the `Sourced<Money>.provenance` the domain model actually carries. Provenance is not shown for these fields.                                                                                   |
| Destructive-action separation                                   | ✅ Owner's `ObligationManageActions` extraction + test confirms archive/delete render in an isolated group, with edit/log-payment confirmed absent from that group                                                                                                                                                                         |
| Offline demo mode                                               | ✅ `DemoBanner` unchanged                                                                                                                                                                                                                                                                                                                  |

**Test evidence:** `app/obligation/[id]/__tests__/workstream-4-patterns.test.tsx` (RTL chevron, destructive-action isolation) plus the pre-existing `card-simulator.test.tsx` and `MurabahaDetailSection.test.tsx`.

### 2.4 Add-obligation form

| Dimension                  | Result                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| English / Arabic           | ✅ All 8 keys resolve in both locales                                                                                                                                            |
| RTL / LTR                  | ✅ Kind-picker rows use `ListRow` (direction-aware); no physical left/right                                                                                                      |
| Light / dark tokens        | ✅ No hardcoded hex                                                                                                                                                              |
| Default / enlarged text    | ✅ No `numberOfLines`; `TextField` labels wrap normally                                                                                                                          |
| Forms — validation         | ✅ Unchanged from Workstream 4: per-kind validators (`validateLoanForm`/`validateMurabahaForm`/`validateCardForm`) run before submit; error surfaces via `Text color="critical"` |
| Loading (save in progress) | ✅ `Button loading={saving}`                                                                                                                                                     |
| Error (save failed)        | ✅ `obligationForm.errors.saveFailed` shown, form state preserved (no data loss)                                                                                                 |
| Offline demo mode          | N/A — form writes to the active repository (demo or personal), no network assumption                                                                                             |

**Test evidence:** none dedicated to this screen. **Gap** — logged in §3.2.

### 2.5 Settings

| Dimension                     | Result                                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| English / Arabic              | ✅ All 33 referenced keys resolve in both locales                                                                                                                                  |
| RTL / LTR                     | ✅ No hardcoded left/right                                                                                                                                                         |
| Light / dark tokens           | ✅ No hardcoded hex                                                                                                                                                                |
| Default / enlarged text       | ✅ No `numberOfLines`; each section is a simple vertical stack                                                                                                                     |
| Loading / limited data        | ✅ Reminders section conditionally rendered only when `profile !== undefined`; account section only in personal mode; reset-demo only when `canResetDemo` — no fabricated defaults |
| Error (reminder save failed)  | ✅ `settings.reminders.saveFailed` shown                                                                                                                                           |
| Destructive-action separation | ✅ Reset-demo and delete-account now render in the same bottom "Manage" pattern as obligation detail, spatially separated from sign-out/preferences                                |
| Offline demo mode             | N/A — no `DemoBanner` on this screen (pre-existing, unchanged)                                                                                                                     |

**Test evidence:** `app/settings/__tests__/index.test.tsx` (pre-existing, still passes after the reorder — confirms no positional assumptions broke).

---

## 3. Findings logged with ownership (exit criterion 7)

### 3.1 Murabaha/Card detail fields bypass `Amount` and drop provenance — **owner decision needed**

`MurabahaDetailSection` and `CardDetailSection` (both **outside** this workstream's touched-file list —
they were assessed as structurally compliant in the Workstream 4 audit and deliberately left alone)
render `totalSalePrice`, `assetCost`, `disclosedProfit`, `installment`, `creditLimit`, `currentBalance`,
`statementBalance`, `purchaseApr`, `cashAdvanceApr`, and fee amounts via `FieldRow` +
`<Sourced<Money>>.value.toStorageString()`. The domain model carries real per-field `Sourced<Money>`
provenance for every one of these (confirmed in `packages/domain/src/entities/obligation.ts`), but it
is discarded before rendering — these fields carry no provenance icon/label, unlike the hero and
payment-history rows on the same screen.

**Impact:** exit criterion 5 ("official, user-entered, and estimated values distinguishable... in both
languages") is not fully met for the murabaha/card branches of the obligation-detail representative
screen — only the top-level obligation `ProvenanceBadge` is visible, not each field's actual source
(which can differ per field).

**Not fixed in this pass** — it requires editing two components outside Workstream 4's declared scope,
and Workstream 5 is validate-and-gate, not implement. **Recommendation:** small follow-up (swap
`FieldRow` value strings for `Amount` where a `Sourced<Money>` is available) — owner: implementation
team, next available slot; not required to block Phase 8.5 exit if the owner accepts it as a scoped
carry-over, but must be explicitly accepted or scheduled, not silently dropped.

### 3.2 No screen-level tests for the Add-obligation form — **owner decision needed**

Unlike the other four representative screens (which now all have dedicated RNTL tests, three from
Workstream 4/5 and one pre-existing), `obligation/add.tsx` has zero test coverage of its own — the
kind-picker row conversion and form-field wiring are typecheck-verified and manually-reasoned only.
**Owner:** implementation team. Not a correctness defect found, but a coverage gap worth closing before
treating this screen as fully proven.

### 3.3 Long Arabic institution names truncate in the obligations list row — **informational, non-blocking**

Pre-existing `numberOfLines={1}` on the list row's institution name (not introduced this pass). Full
name remains available on the detail screen. Not a regression; noted for completeness per the
validation matrix's "realistic values, not placeholder text" requirement.

### 3.4 Dark-theme and Dynamic-Type rendering not device-verified — **environment limitation, not a defect**

This pass had no simulator or physical device. Contrast values for both themes are verified
independently by `tokens.test.ts` (computed WCAG contrast, not asserted-and-trusted), and no
`numberOfLines`/fixed-height clipping risk was found in the touched screens — but actual rendered
appearance in dark mode and at maximum Dynamic Type scale has not been visually confirmed. **Owner:**
whoever performs the next on-device pass (Phase 9 device validation, or an earlier ad hoc check) should
confirm this before treating it as fully closed.

### 3.5 Live-review findings — **found and fixed during this pass**

The owner's concurrent live-device review surfaced two real interaction-hierarchy violations, both
corrected immediately (small, unambiguous, no financial/provenance impact):

1. **Obligation-detail header action was a full content-area `Button`** (`variant="secondary"`, label
   "Insights Center") crammed into the native `Stack.Screen headerRight` slot — oversized for header
   chrome and visually generic. Replaced with a compact icon-only `Pressable` (Ionicons
   `bulb-outline`, tinted with the `understanding` semantic token — the brand's gold explanation
   motif), matching the icon-action pattern already used in the tab header (`(tabs)/_layout.tsx`).
2. **Insights Center action pile**: each insight rendered two full, equal-weight `secondary` Buttons
   ("View obligation" and "Why did I get this?") side by side — the "grid of equally weighted
   buttons" anti-pattern the visual direction explicitly calls out. Retiered: "View obligation" (a
   real navigation action) became `variant="ghost"` to reduce visual weight inside an already-bounded
   card; "Why did I get this?" (an explanation affordance) became a quiet gold (`understanding`) text
   link, consistent with the explain-link pattern already used elsewhere (`LoanDetailHero`,
   `scenario.tsx`) and with the visual direction's explicit language for this exact case ("marked by
   the gold understanding motif").

Both changes are typecheck-clean, lint-clean, and pass the full 49-suite/263-test mobile suite
unmodified (no test asserted on the old button shape). `insights.tsx` is not one of the five
Workstream 4 representative screens, but is reached directly from two of them (Home, obligation
detail) and shares their `InsightBanner` primitive, so this correction was made under the same
authority as the rest of this pass rather than deferred.

---

## 4. Accessibility summary

- **Contrast:** ✅ verified computationally for every text/interactive semantic role in both themes (`tokens.test.ts`), not just the roles touched this pass.
- **Touch targets:** ✅ all pressable rows use `ListRow`/`Button`, both enforcing `minTouchTarget = 44`; decorative icons inside pressable rows are not independently pressable so don't need their own 44pt.
- **Color-not-alone:** ✅ provenance and severity are icon + text on every touched primitive (Workstream 3) and every touched screen's usage of them (this pass) — confirmed no screen re-introduces color-only meaning.
- **Reduced motion:** ✅ no new `Animated`/`LayoutAnimation` usage in any touched screen — nothing new to gate.
- **Screen-reader labels:** ✅ `Amount`, `ProvenanceBadge`, `NavRow` (via `ListRow`'s `accessibilityLabel`) all carry labels; owner's tests assert on `getByLabelText` in Arabic, not just English.

---

## 5. Outstanding gates (cannot be closed by this pass)

Per the phase file's exit criteria and Decision D5:

1. **Arabic-reading reviewer sign-off — TBD, still unresolved.** This pass verified Arabic _string
   presence, resolution, and RTL layout mechanics_ by code and automated test, which is necessary but
   not sufficient — it is not a substitute for a native Arabic speaker judging whether the copy reads
   naturally and the screens feel "designed, not translated," as the phase requires.
2. **Owner (Talal) sign-off** on the recorded exit review — not something this pass can grant itself.
3. **Findings 3.1 and 3.2** need an explicit owner decision (fix now / schedule / accept as carried-over) rather than being silently closed.

---

## 6. Go/no-go recommendation

**Conditional go.** Every criterion this pass is capable of checking — the full validation matrix
across AR/EN, RTL/LTR, light/dark tokens, text-size resilience, all required states, provenance
distinctness (with one logged exception), and accessibility — passes, backed by a green repository-wide
check and targeted automated tests including real-Arabic-string assertions. Nothing found here should
block Phase 9 architecturally.

Do **not** mark Phase 8.5 complete yet. Two gates remain, both requiring a human, not further
engineering: the Arabic-reading reviewer's sign-off, and the owner's recorded exit-review approval —
which should explicitly accept or schedule findings §3.1 and §3.2 rather than let them lapse silently.
