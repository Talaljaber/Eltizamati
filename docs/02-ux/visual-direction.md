# Eltizamati Visual Direction

**Status:** Approved direction for Phase 8.5 (Workstream 2). Canonical internal reference for the visual system.
**Companion docs:** [design-system.md](design-system.md) (token/primitive spec) · [Phase 8.5](../10-implementation/phases/PHASE-08.5-visual-system-and-experience-refinement.md) (phase plan). This document defines _intent_; it does not restate the phase plan or prescribe exact radii, card counts, or per-screen layouts.

Provisional/brand values follow the approved owner decisions (D1, D2, D6–D8). Where a value is provisional pending original brand assets, it is marked.

## Product personality

A calm financial lens. Eltizamati takes complicated obligations and turns them into clear, understandable information. It is precise, quiet, and trustworthy — intelligent because it organizes information well, not because it announces itself. It is **not** a lender, collector, adviser, or trading app, and the interface must never imply certainty it does not have or make estimates look official.

## Interpretation of the Eltizamati identity

The identity's arc — fragmented obligation marks → a gold point of understanding → a teal conclusion of clarity — maps to roles, not a repeated decorative graphic:

- **Navy** anchors seriousness and financial figures.
- **Teal** marks progress, interaction, and clarity.
- **Gold** marks the moment of understanding — explanations and key insights.
- **Mint** is quiet supporting information.

The motif is a sensibility applied sparingly, never a sticker on every screen. The product should look recognizably Eltizamati without needing the logo on every surface.

## Semantic color architecture

Three tiers, kept strictly separate (implemented in `apps/mobile/src/core/design-system/tokens.ts`):

1. **Brand-display palette (D1)** — the identity-board values, for large fills, brand moments, and non-text glyphs only. Provisional pending original brand assets: Navy `#0F2343`, Teal `#1FB5A9`, Mint `#7ED6C6`, Gold `#D9B45A`, Light gray `#F2F4F7`, White `#FFFFFF`. **These must never be used directly for body text or small controls.**
2. **Accessible semantic roles** — the only colors feature code consumes (background, content, action, focus, border, etc.). Text/interactive roles are contrast-verified derivatives of the palette.
3. **Status + provenance roles** — positive / attention / critical, and official / user-entered / estimated.

Default balance: light neutral surfaces, navy content, selective teal. Mint and gold appear selectively. Feature code consumes semantic roles only — never raw hexes, and never string-concatenated alpha (e.g. `color + '20'`); use the `*Soft` surface tokens.

## Accessible brand variants

The identity teal (~2.6:1 on white) and gold (~2.0:1) fail WCAG AA for text and small controls. Approved derivatives (D4):

- **Action/interactive teal** `#0F6E64` (≈6:1 on white) for buttons, links, focus; identity teal `#1FB5A9` reserved for display fills where text does not sit on top.
- **Understanding gold** `#8A6D1F` (≈4.9:1 on white) for explain text/icons; identity gold `#D9B45A` for display accents only.
- **Estimate** is a neutral slate `#55617A` (replacing the earlier off-brand violet).

Dark-theme values are defined for every role and verified independently (deep navy base, brightened teal/gold). Dark is dark-compatible tokens only — not a full dark-mode redesign.

## Typography and amount hierarchy

- **Faces (D2):** Tajawal (Arabic) + Inter (Latin). **Blocked asset step:** licensed font files are not yet bundled; the design system ships the safe font-family architecture (`fonts.ts`) that falls back to the system font until assets are approved and loaded. Do not download or invent font files.
- **Financial numerals (D8):** Western `0–9` in both languages, with bidi isolation and locale-appropriate currency/date formatting. Amount styles use tabular numerals so columns align.
- **Hierarchy:** one dominant figure per screen. The `amountHero` style outranks display/navigational chrome; supporting figures step down predictably (`amountLg → amountMd → amountSm`). Decoration and greetings never out-scale the primary number. Dynamic type is supported without truncation.

## Spacing and density

Keep the 4-pt rhythm. Aim for calm density appropriate to serious financial management — enough to support decisions, grouped by predictable spacing tiers — neither bank-form density nor oversized near-empty cards. Whitespace organizes; it does not pad.

## Surface vocabulary

A small, named set of surfaces: base, elevated, subtle, interactive, and sheet. Two restrained, tokenized elevation levels (D7) — elevated content (card) and modal/sheet — communicate real layering, defined cross-platform (iOS shadow, Android elevation). `Card` is the single shared content surface; feature code must not invent competing card styles. Corner treatment is consistent across primitive and composed surfaces.

## Interaction hierarchy

One primary action per screen. Buttons act; rows navigate; sheets explain; menus hold infrequent actions; destructive actions are visually and spatially separated. Detail screens lead with the financial story, then offer navigation — not a grid of equally weighted buttons. It should be obvious what changes data, what opens information, and what starts a calculation.

## Provenance presentation

Official, user-entered, and estimated figures are distinguishable **consistently for all three classes** and **never by color alone** — each carries an icon and a text label, integrated into the information architecture rather than appended as technical metadata. Estimates additionally carry the shape-based `≈` prefix. `Amount` remains the only way UI renders money, and every material figure carries provenance in its accessibility label. Provenance truth and financial formatting are never weakened for visual effect.

## Explanation and insight treatment

Explanations are short by default, contextual, expandable, adjacent to the figure they explain, and marked by the gold understanding motif — a real affordance, not a throwaway link, and never a wall of colored banners. Insights carry a severity, a plain-language "why", and a useful next action. Material uncertainty is shown, not smoothed over. Calm, not alarming.

## Forms

Guided, not administrative: logical grouping, helpful defaults, clear required-vs-optional, inline validation beside the field (validate on blur), contextual help, review before material submission, and a clear completion path. Use the shared form-field family; no card-around-a-single-control. Expose user-facing language, not internal terminology.

## Comparisons and charts

Comparisons prioritize the **delta** — what stays the same, what changes, and by how much in money and time — not two duplicated columns at equal weight. No color implies a recommendation; Eltizamati explains outcomes, it does not advise. Charts earn their place: text summary first, honest axes, RTL-mirrored time, accessible labels, reduced-motion static, and real empty/partial states. Keep telemetry (e.g. calculation timing) out of the user surface.

## Iconography and motion

- **Icons (D6):** one family — Ionicons from the already-installed `@expo/vector-icons`. No new icon dependency. Consistent size and visual weight; accessible labels where meaningful; icons never carry meaning without text or another channel; flip only when direction is semantic. No emoji on operational, financial, severity, provenance, or navigation surfaces.
- **Motion:** tokenized durations and easing; brief (≈120–280ms), meaningful, interruptible; exit shorter than enter. Respect reduced motion (fades only) via `useReducedMotion` + `motionDuration`.

## Arabic and RTL

Arabic and English are designed in parallel as two primary experiences sharing one system — Arabic is not a translation layer. Preserve the strong logical-property foundation (logical alignment/margins, no hard `left`/`right`). Extend brand identity to Arabic typography (Tajawal, once assets land) and to navigation chrome (DS primitives, not raw `Text`). Numerals stay Western with bidi isolation. A layout that merely mirrors but feels unbalanced in Arabic fails. No representative experience passes until independently reviewed in Arabic by an Arabic-reading reviewer.

## Accessibility

WCAG AA contrast in both themes (verified in `tokens.test.ts`), dynamic type without truncation, screen-reader labels that do not depend on emoji names, logical focus order, ≥44pt real touch targets, reduced-motion support, and no meaning by color alone (provenance, status, selection, urgency all need a second channel). Elegance never justifies low contrast.

## Consolidated anti-patterns

Emoji as icons; grids of equally weighted buttons; a card around every control; decoration out-scaling figures; string-concatenated tint surfaces; bypassing shared primitives (`Amount`, `Card`, form fields) in feature code; the delta buried under duplicated comparison columns; telemetry in the UI; color-only meaning; gold as a warning color; estimates styled as official; hand-rolled surfaces that drift from tokens; glassmorphism / neon / crypto styling.

## Readiness criteria for Workstream 4 (representative screens)

A representative screen is ready when:

1. The dominant figure leads and renders through `Amount` with provenance.
2. One primary action; tiered interaction; destructive actions separated.
3. All three provenance classes are legible without relying on color.
4. Explanation uses the gold understanding motif as a real affordance.
5. No emoji, hand-rolled surfaces, or bypassed primitives remain on the screen.
6. It passes the phase validation matrix — AR/EN, light + dark-compatible tokens, enlarged type, and loading / empty / error / refused / limited-data states.
7. It is independently reviewed in Arabic.
