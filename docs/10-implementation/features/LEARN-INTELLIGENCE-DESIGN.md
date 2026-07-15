# Learn Intelligence design

## Current-state audit

The current Learn tab is a grouped list of ten bundled topics (conventional,
Islamic financing, and cards). Topic detail is a translated title/body with
related glossary chips. It has no search, journeys, product catalogue,
comparison, source display, loading/empty/error states, or assistant entry.
It already uses `Screen`, `Card`, `ListRow`, `Text`, i18next, logical spacing,
and a glossary sheet. Arabic is translation-backed; the existing topic layout
uses an unmirrored row direction and needs RTL-safe presentation as part of
this feature.

## Product and information architecture

Learn educates before it compares. The home screen contains: a financing-guide
hero; goal-based journeys; search across bundled education; topic categories;
a dated published-options snapshot; and an Ask Eltizamati entry. Detail screens
remain at `/learn/[id]`; `/learn/compare` is a guided comparison; and
`/learn/assistant` is the assistant entry.

The first slice is offline-first. Bundled education, glossary, a dated
reference snapshot, deterministic comparisons, and explicitly labelled sample
assistant explanations work without sign-in. Live AI is unavailable offline.
The client never reads obligations for Learn and never sends account/profile
data to an AI provider.

## Data and source policy

Reference data is normalized, not copied from pages. Every bank/product fact
has a `SourceRecord`, retrieval date, review status, completeness, and a
confirmation warning. Central Bank of Jordan sources establish the institution
inventory; official bank pages establish product facts. Unknown is stored as
`null`, never zero/false. The initial snapshot is a representative vertical
slice, not a market-wide ranking or completeness claim.

Reference migrations define publish-only tables protected by RLS with no client
write policies. The app presently consumes the bundled snapshot, which keeps
demo and offline behavior independent of network/auth. A future server reader
can implement the same catalogue interface after a reviewed refresh process.

## Comparison methodology

The service filters published rules, labels unknown eligibility, and sorts only
by selected priorities. Its result exposes matches, conflicts, unknowns,
freshness, source IDs, and any estimate assumptions. It never declares a best
bank. A partial/stale product receives a visible warning and cannot silently
outrank a verified complete one. Existing engine formulas are deliberately not
adapted for catalogue affordability or Murabaha estimates: this branch refuses
those calculations until a separately reviewed formula and vectors exist.

## Assistant and privacy model

`LearningAssistantGateway` is server-bound. Its request admits only question,
language, temporary comparison preferences, retrieved public facts, and
deterministic output. It explicitly excludes identifiers, auth tokens,
credentials, contacts, obligation rows, payment history, and account numbers.
The Edge Function owns any provider secret and validates structured output:
claims require source IDs; numbers must be present in allowed facts or the
temporary request; unsupported output is rejected. The mobile UI has a sample
mode only, clearly labelled as not live AI.

## Screen inventory and acceptance criteria

* Learn home: search, journeys, topic navigation, dated snapshot, assistant
  entry, Arabic translations, and no financial recommendation language.
* Compare: public preference intake, matches/no-match, source and freshness
  information, and no eligibility promise.
* Assistant: privacy notice, offline/unavailable state, sample-only response,
  citations, assumptions, and questions to ask the institution.
* Topic detail: related glossary and improved navigation continuity.

Acceptance requires both EN/AR keys, accessible controls, deterministic tests
for filtering/ranking and payload minimization, source validation, and existing
checks remaining green.

## Risks and cuttable scope

Official pages can omit effective dates, rates, fees, or product terms. Those
products remain partial/minimal and direct users to confirm with the
institution. No live provider, hosted migration, automated scraping, user-data
integration, application flow, or new finance formula is included. Full market
coverage and live AI require named data-review ownership, secret deployment,
rate limits, monitoring, migration deployment, and a refresh procedure.
