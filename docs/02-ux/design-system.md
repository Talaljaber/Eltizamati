# Design System Specification — "Calm Clarity"

**Personality:** steady financial companion with a calculator — not a lender, collector, or trading app (SRC-1 §24.1).
**Implementation home:** `apps/mobile/src/core/design-system/` (tokens + primitives). Components are the only way UI renders money, status, or provenance — this is how PRIN-2/4/6 become unskippable.
**Visual direction:** see [visual-direction.md](visual-direction.md) — the canonical intent for personality, color architecture, hierarchy, provenance, iconography, motion, RTL, and accessibility. This file is the token/primitive spec that implements it.
**Brand status:** the Eltizamati identity palette is approved for the MVP (D1) and wired as brand-display tokens plus accessible derivatives; original brand assets may later refine exact values. Typography is Tajawal (Arabic) + Inter (Latin) (D2), with font assets a documented blocked step until licensed files are bundled.

## 1. Design tokens (`tokens.ts`)

### Color (semantic, theme-aware light/dark)

| Token                                        | Role                       | Light (placeholder)            |
| -------------------------------------------- | -------------------------- | ------------------------------ |
| `bg / bgElevated / bgSubtle`                 | surfaces                   | near-white / white / warm gray |
| `textPrimary / textSecondary / textTertiary` | content                    | #1A2B3C-ish scale              |
| `brand / brandSoft`                          | identity, primary CTA      | deep teal family               |
| `positive / positiveSoft`                    | on-track, completed        | restrained green               |
| `caution / cautionSoft`                      | attention states           | **amber, not red**             |
| `critical / criticalSoft`                    | overdue/urgent only        | muted red, small-area use only |
| `info / infoSoft`                            | education, freshness       | slate blue                     |
| `estimate`                                   | estimate badges/underlines | violet-gray                    |
| `official`                                   | official-figure badge      | brand-tinted                   |

Rules: `critical` never paints full screens/backgrounds (PRIN-3/4 — "soft caution instead of panic"); all pairs pass WCAG AA (checked in token tests, NFR-A11Y-002); meaning always accompanied by icon/text (never color alone).

### Typography

- Latin: **Inter**; Arabic: **Tajawal** (D2). Font files are a documented blocked step — until licensed assets are bundled, `fonts.ts` resolves to the system font safely. One `Text` primitive with variants: `display, title, heading, body, bodySmall, caption, amountHero, amountLg, amountMd, amountSm` (`amountHero` is the dominant per-screen figure).
- Amount variants use tabular numerals (`fontVariant: ['tabular-nums']`) so columns align.
- Dynamic type: variants scale with OS font scale up to 1.5× (NFR-L10N-005).

### Spacing / radius / elevation

4-pt scale (`space[0..12]` = 0,4,8,12,16,20,24,32,40,48,64); radius `sm 8 / md 12 / lg 16 / full`; two elevation levels only (card, sheet). Generous default: screen gutter 20, card padding 16.

### Motion

150–250ms ease-out standard; reduced-motion → fades only (NFR-A11Y-004).

## 2. Primitives (build once, reuse everywhere — anti-pattern guard: duplicate components)

| Component                                                 | Contract highlights                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Screen`                                                  | safe area, gutter, scroll behavior, skeleton slot                                                                                                                                                                                                                                                    |
| `Card`                                                    | surface + padding + optional press                                                                                                                                                                                                                                                                   |
| `Button`                                                  | primary/secondary/ghost/destructive; loading state; min target 44pt                                                                                                                                                                                                                                  |
| `Text`                                                    | variant-driven; **direction-safe** (start/end only)                                                                                                                                                                                                                                                  |
| `Amount` ⭐                                               | **props: `money: Money`, `provenance: Provenance`, `precision?: 'official'\|'estimate'`** — renders value per BR-CALC-014 (≈ prefix + rounding for estimates, 3 dp for official), provenance badge, onPress → SCR-EXPLAIN when derived. _It is a type error to render an amount without provenance._ |
| `ProvenanceBadge`                                         | official / user-entered / estimate / bureau-as-of-date variants (TERM-026…028)                                                                                                                                                                                                                       |
| `StatusChip`                                              | input: `ObligationStatus` (domain enum) only — UI cannot invent statuses (BR-STAT-001); icon+label+color                                                                                                                                                                                             |
| `ProgressBar`                                             | value + text equivalent required prop                                                                                                                                                                                                                                                                |
| `InsightBanner`                                           | severity-capped visuals (info/attention/urgent), "why" line slot, deep-link action                                                                                                                                                                                                                   |
| `TimelineItem`                                            | rate history / events                                                                                                                                                                                                                                                                                |
| `FieldRow`                                                | label + value + optional "what is this?" (glossary term-id prop → FR-EDU-001)                                                                                                                                                                                                                        |
| `EmptyState`                                              | illustration + one sentence + single primary action                                                                                                                                                                                                                                                  |
| `Skeleton`                                                | shimmer blocks for L states                                                                                                                                                                                                                                                                          |
| `FormField` family                                        | text/amount/date/percent/select; amount field enforces decimal keyboard + Money parsing; inline validation slot                                                                                                                                                                                      |
| `SectionHeader`, `ListRow`, `Sheet` (modal), `DemoBanner` | shell pieces                                                                                                                                                                                                                                                                                         |

**Component rules**

- DS-1: no feature component may hardcode a color/space/font value — tokens only (lint: no raw hex in `features/`).
- DS-2: no feature may format money/dates itself — `Amount` / `formatDate` only (NFR-L10N-003).
- DS-3: primitives live in `core/design-system`; a second implementation of an existing primitive is a review-blocking defect (anti-pattern list).
- DS-4: all primitives ship with RNTL tests incl. `accessibilityLabel` assertions, and an RTL snapshot/story.

## 3. RTL & bidirectional rules

- All styles use logical properties (`marginStart`, `paddingEnd`, `start`, `end`, `textAlign: 'left'` forbidden — lint-enforced, NFR-L10N-002).
- Icons with inherent direction (back arrows, chevrons, timeline arrows, progress direction) flip in RTL; icons without direction (bell, gear) do not. Each icon registered with `directional: boolean` in the icon map.
- Numbers in Arabic UI: Western Arabic numerals (0-9) by default for financial figures (ASM: common in Jordanian banking apps; confirm in RES-009) — set explicitly, don't rely on locale default (Intl `nu-latn`).
- Mixed-direction lines (Arabic label + Latin-digit amount) rendered via `Amount`/`FieldRow` which apply Unicode isolation (`⁨…⁩`) to prevent bidi scrambling.
- Charts mirror their time axis in RTL (time flows right→left) — chart wrapper handles this once.

## 4. Content display rules (money, dates, status)

| Rule                 | Spec                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Official money       | 3 dp, thousands separators, currency suffix per locale: `12,450.500 JOD` / `12,450.500 د.أ`      |
| Estimated money      | `≈ 12,451 JOD` (whole JOD default; 3 dp available in SCR-EXPLAIN) + estimate badge — BR-CALC-014 |
| Large money in cards | Abbreviation allowed ≥ 100k (`≈ 1.2M JOD`) with full value in detail                             |
| Percent rates        | 2 dp with locale decimal separator + "%": `9.25%`                                                |
| Dates                | Locale-aware medium format; relative for ≤7 days ("in 3 days") with absolute in detail           |
| Progress             | % + fraction text ("38% — 7,600 of 20,000 JOD repaid")                                           |
| Freshness            | "Updated {relative time}" + provider name, via one `FreshnessLabel` component                    |

## 5. Charts

Only where they add comprehension (SRC-1 §24.2): trajectory comparison (current vs scenario), utilization ring, rate timeline. Implementation: lightweight SVG (`react-native-svg`) custom marks, not a heavy chart lib (three simple charts don't justify a dependency — anti-pattern #22). Every chart: text summary first, chart second (NFR-A11Y-005); RTL-mirrored; reduced-motion static.

## 6. Voice & tone (enforced with content rules in `content-terminology.md`)

- Verbs of control: "see, plan, ask, adjust" — never "warning: you failed to…".
- Numbers in sentences: "≈ 1,800 JOD more over the remaining term" (impact in money and time, not percentages alone).
- Every risk statement pairs with an action (question to ask, scenario to try).
- No exclamation marks in financial statements.
