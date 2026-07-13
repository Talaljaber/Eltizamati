# Phase 8.5 — Eltizamati Visual System & Experience Refinement

**Status:** In progress — Workstreams 1–4 implemented and merged; Workstream 4 awaiting independent validation; Workstream 5 not started
**Depends on:** Phase 8 core scope complete
**Blocks:** Phase 9 hardening and broad visual refinement

---

## Purpose

Establish Eltizamati's visual language as a coherent system — tokens, primitives, and composition patterns — and prove it on a representative set of screens, so the product reads as a credible, premium Arabic-native financial companion rather than a generic template with branding applied.

This phase changes how the product **looks, reads, and feels**. It does not change what the product **does**.

Phase 8.5 covers three things, and only three things:

1. **Design definition** — an internal design direction and semantic token system derived from the Eltizamati identity.
2. **Shared visual-system refinement** — improvements to shared tokens, primitives, and composition patterns.
3. **Controlled implementation on representative experiences only** — five screens that collectively test the system.

It is **not** a full-app redesign. Expansion across the remaining flows is a follow-on effort, gated on this phase's exit review.

---

## Scope

**In scope**

- Semantic design tokens (color, type, spacing, surface, motion) derived from the Eltizamati identity, for the light theme, with dark-compatible token definitions (see Dark theme, below)
- Typography system for Arabic and Latin, including numeric/tabular treatment
- Refinement of shared primitives and composition patterns (surfaces, rows, actions, forms, explanation moments, provenance presentation)
- Application of the system to five representative experiences (see Workstream 4)
- Arabic/RTL design quality across the above
- An internal design-direction document recording the decisions made

**Out of scope**

- Financial logic, formulas, expected values, or calculation behavior
- Provenance semantics (official / user-entered / estimated distinctions may be restyled, never weakened or removed)
- Repository, service, or navigation architecture
- New features, screens, or product scope
- Marketing assets, app-store presence, onboarding illustration programs
- A full dark-mode redesign (unless separately approved as product scope)
- Visual expansion beyond the representative set (that work belongs after this phase's exit gate)

---

## Brand foundation

> The approved visual direction is recorded in [docs/02-ux/visual-direction.md](../../02-ux/visual-direction.md) (Workstream 2 deliverable); its token/primitive spec lives in [docs/02-ux/design-system.md](../../02-ux/design-system.md).

The Eltizamati identity board is the brand source of truth. Its concept — fragmented obligation marks, a gold point of understanding, a teal conclusion of clarity — should inform the system quietly: gold marks moments of explanation and insight; teal marks progress and primary interaction; navy carries seriousness and financial figures. The motif is a sensibility, not a repeated graphic.

### Palette — provisional until brand assets are confirmed (Decision D1)

The values below are read from the identity board and are **provisional**. They must not be treated as canonical until exact approved brand assets or swatches are confirmed by the owner.

| Role       | Provisional hex | Constraint                                                                                                                                                                                                        |
| ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep navy  | `#0F2343`       | Primary text, key figures, dark surfaces                                                                                                                                                                          |
| Teal       | `#1FB5A9`       | Interaction and progress. Fails WCAG AA on white (~2.6:1) — requires a darkened accessible variant for text and small interactive elements; the brand hex is reserved for large fills and glyphs in ≥3:1 contexts |
| Mint       | `#7ED6C6`       | Quiet supporting surfaces and selected states only                                                                                                                                                                |
| Gold       | `#D9B45A`       | Explanation/insight accent. Fails WCAG AA on white (~2.0:1) — never body text on light surfaces; requires an accessible variant or pairing with navy                                                              |
| Light gray | `#F2F4F7`       | Base and subtle surfaces                                                                                                                                                                                          |
| White      | `#FFFFFF`       | —                                                                                                                                                                                                                 |

The token system must define three distinct tiers, kept separate by name and purpose:

1. **Brand-display tokens** — the identity hexes as approved, used only where contrast requirements permit (large fills, brand moments, illustration).
2. **Accessible text and interactive variants** — contrast-verified derivatives of teal and gold for text, actions, and small elements.
3. **Semantic warning and critical colors** — accessible amber and red for warning/critical states. Gold is not a warning color.

All colors enter feature code only through semantic tokens (background, content, action, official/estimated, positive/attention/critical, border, focus). The default visual balance is light neutral surfaces with navy content and selective teal; navy-dominant screens are the exception, not the norm.

**Typography:** Tajawal or Cairo per the identity (Decision D2), with a Latin companion, verified for licensing and bundling before adoption. Tabular numerals for all financial figures.

---

## Design principles

These principles bind the phase. Within them, designers and engineers exercise judgment; the plan deliberately does not fix radii, card counts, or per-screen compositions.

1. **Hierarchy before containers.** Express structure through type scale, weight, spacing, and surface contrast first; add a container only where it marks a real relationship or interaction boundary.
2. **One story per screen.** Each screen answers one primary question with one dominant figure or conclusion and one primary action; everything else steps down or defers.
3. **Figures are the content.** Amounts, dates, and deltas form the visual rhythm — tabular, consistently formatted, scaled by importance. Official, user-entered, and estimated values stay visibly distinct without badge clutter.
4. **Explanation is a first-class moment.** Short, contextual, expandable, adjacent to the figure it explains, marked by the gold motif — never a wall of banners. Uncertainty is shown, not smoothed over.
5. **Progressive disclosure.** Outcome first; assumptions, sources, schedules, and calculation detail underneath. Never hide material uncertainty to simplify.
6. **Calm density.** Enough information to support decisions, organized by predictable spacing rhythm — neither bank-form density nor oversized near-empty cards.
7. **Predictable interaction grammar.** One primary action per screen; buttons act, rows navigate, sheets explain, destructive actions stand apart.
8. **A small vocabulary of surfaces, icons, and motion.** One icon family; elevation reflects real layering; motion is brief (≈150–300ms), meaningful, interruptible, and respects reduced-motion. No emoji, gradients-as-decoration, glow, or celebration effects on financial screens.
9. **Comparisons reveal the delta.** Scenario views emphasize what changes and by how much; green never implies a recommendation. Eltizamati explains outcomes; it does not advise.
10. **Charts earn their place** — text summary first, honest axes, RTL-aware, accessible, with real empty/partial states.

**Consolidated anti-patterns** (the "AI-generated template" failure mode, stated once): everything boxed in equal cards, grids of equally weighted buttons, decorative charts, badge/callout proliferation, glassmorphism/neon/crypto styling, equal emphasis everywhere, styling used to compensate for weak hierarchy.

---

## Arabic and RTL

Arabic and English are designed **in parallel** as two primary product experiences sharing one design system. Neither language is an adaptation of the other.

The system must be validated with real Arabic content: long labels, mixed Arabic/Latin strings, number and currency placement, date formats, directional icons, chart direction, form behavior, and truncation. Financial numerals must remain stable and legible in both languages. A layout that merely mirrors but feels unbalanced in Arabic fails this phase.

**Gate:** no representative experience passes until it has been independently reviewed in Arabic by an Arabic-reading reviewer (Decision D5 — reviewer TBD, required before the exit review).

---

## Accessibility

Non-negotiable within the styling work: WCAG AA contrast in every theme, dynamic type without breakage, screen-reader labels and logical focus order, ≥44pt touch targets, reduced-motion support, and no meaning carried by color alone (provenance, urgency, positive/negative, selection all need a second channel). Elegance never justifies low contrast.

---

## Dark theme

Phase 8.5 **defines dark-compatible semantic tokens** — every semantic token must have a verified dark-theme value based on deep navy rather than pure black, with contrast checked independently of the light theme.

Phase 8.5 does **not** require a full dark-mode redesign or dark-mode application across screens unless that is separately approved as product scope (Decision D3 — resolved: tokens only). Where the app currently supports dark rendering, touched screens must not regress.

---

## Workstreams

Sequenced; each feeds the next. Effort estimates and assignment are the implementation team's to propose.

1. **Audit.** Survey current screens for the systemic causes of genericness — token gaps, primitive duplication, weak numeric hierarchy, card/button overuse, inconsistent provenance presentation, RTL weaknesses. Output: a short diagnosis separating token, primitive, composition, and content problems. Major causes only.
2. **Define.** Write the internal design direction: token map, type and amount hierarchy, surface and interaction vocabulary, iconography, motion, Arabic/RTL rules, provenance treatment. Concise enough to be read, flexible enough to serve loans, Murabaha, credit cards, manual entry, settings, education, and insights without forcing identical structure. Murabaha retains contract-correct terminology throughout.
3. **Foundations.** Implement tokens and refine shared primitives and patterns. Prefer shared changes over screen overrides; do not build mega-configurable components or restructure stable architecture for visual ends. Preserve the tested behavior of Amount, provenance, status, and explanation components.
4. **Representative screens.** Apply the system to: a financial overview, an obligations list, one detailed product view, one manual-entry flow, and one settings/support surface. The goal is proving the system across summary, density, explanation, forms, and secondary surfaces in both languages — not pixel-perfecting five screens.
5. **Review and gate.** Run the validation matrix, hold the exit review (below), and record a go/no-go recommendation for expanding the system across remaining flows in Phase 9 and beyond.

Expansion beyond the representative set is **explicitly deferred** until the exit gate passes.

### Implementation status (2026-07-13)

| Workstream                 | State                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| 1 — Audit                  | Implemented and merged                                                                      |
| 2 — Define                 | Implemented and merged                                                                      |
| 3 — Foundations            | Implemented and merged; Tajawal/Inter asset bundling remains blocked pending licensed files |
| 4 — Representative screens | Implemented and merged in PR #13; awaiting independent validation                           |
| 5 — Review and gate        | **Not started**; the validation matrix and recorded exit review remain outstanding          |

The Arabic-reading reviewer remains TBD. Phase 9 remains blocked until Workstream 5 is performed and
the full Phase 8.5 exit gate passes. This status does not mark Phase 8.5 complete.

---

## Delivery and change control

- No remote changes without owner approval.
- Implementation is delivered through small, reviewable commits.
- Merge happens only after the exit review passes.

---

## Validation matrix

Each representative screen is checked in: Arabic and English · RTL and LTR · light theme (and dark rendering where currently supported) · default and enlarged text · loading, empty, error, refused-calculation, and limited-data states · official, user-entered, and estimated data · offline demo mode — using realistic values (large amounts, long Arabic labels), not placeholder text. All repository-required checks pass.

---

## Exit criteria

The phase is complete when Talal (product-owner sign-off authority, Decision D5) and the Arabic-reading reviewer confirm, in a recorded review, that all of the following gates pass:

1. **Validation matrix completed** for all five representative screens, with results recorded.
2. **Design-system decisions documented** — the design-direction document exists and matches what shipped.
3. **No accessibility failures on touched screens** — contrast, touch-target, dynamic-type, and reduced-motion checks pass.
4. **Arabic review completed** — each representative experience independently reviewed in Arabic by the Arabic-reading reviewer.
5. **Provenance states verified** — official, user-entered, and estimated values distinguishable without relying on color, in both languages.
6. **Owner sign-off** recorded.
7. **Unresolved inconsistencies logged with ownership** — any conflict between the existing specification and this direction, and any open "this still feels generic" finding, is either resolved or logged with a named owner and the smallest recommendation that preserves product and financial integrity.

Supporting evidence (not a gate on its own): a side-by-side before/after review concluding the screens read as one intentional product, and that styling choices can be explained through hierarchy, meaning, and usability rather than taste.

Additional scope protections confirmed at exit: no financial logic, provenance semantics, formulas, or expected values changed; offline demo intact; no unjustified new dependencies; no raw hex or ad-hoc styling remaining in touched feature code.

---

## Hard constraints

No changes to financial formulas or expected values; no invented financial behavior; no weakened or removed provenance; estimates never styled as official; refusal and incomplete-data states never hidden; no architecture changes without demonstrated need; no broken offline demo; no unjustified dependencies; no incorrect Murabaha terminology; no replacement of testable semantics with purely visual treatment; no remote changes without owner approval.

---

## Owner decisions

### Resolved

1. **D1 — Brand values:** **Resolved for MVP implementation.** The identity-board palette is wired through brand-display tokens and accessible semantic derivatives. Original brand assets may later refine exact values.
2. **D2 — Typography:** **Resolved as Tajawal (Arabic) + Inter (Latin).** Licensed font files are not bundled; asset loading remains blocked and the system-font fallback stays active. Do not download or invent font files.
3. **D3 — Dark theme scope:** **Resolved.** Phase 8.5 defines dark-compatible semantic tokens only. Full dark-mode application is outside this phase unless separately approved as product scope.
4. **D4 — Accessible brand variants:** **Resolved.** Accessible derived variants of teal and gold are approved where contrast requirements prevent use of the exact brand hexes.
5. **D5 — Exit authority:** **Resolved in part.** Talal is the product-owner sign-off authority. The Arabic-reading reviewer remains `TBD — required before the exit review`.
