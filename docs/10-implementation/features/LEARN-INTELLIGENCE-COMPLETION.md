# Learn Intelligence implementation evidence

## Delivered branch slice

Branch: `feature/learn-intelligence`
Starting HEAD: `73f418f61fed1bca6686dee6c5e922f41cbbda35`

The Learn tab now has a financing-guide home, content search, goal journeys,
topic navigation, an offline dated comparison snapshot, a transparent local
comparison screen, and an Ask Eltizamati screen. The assistant screen is
explicitly offline/unavailable and shows a labelled sample explanation only.

## Catalogue coverage and sources

This is a deliberately small vertical slice, not market-wide coverage.

| Institution                        | Model        | Catalogue status                           |
| ---------------------------------- | ------------ | ------------------------------------------ |
| Arab Bank PLC                      | Conventional | Partially verified                         |
| Bank of Jordan PLC                 | Conventional | No public product data found in this slice |
| Cairo Amman Bank                   | Conventional | Pending review                             |
| Jordan Islamic Bank                | Islamic      | Verified vertical slice                    |
| Housing Bank for Trade and Finance | Conventional | Pending review                             |

Sources embedded in `catalogue-snapshot.ts`:

- Central Bank of Jordan, Banking Sector Guide — institution inventory source.
- Jordan Islamic Bank, Housing finance campaign — housing Murabaha campaign.
- Jordan Islamic Bank, Murabaha — structure/calculator description.
- Housing Bank, Automated Personal Loan — salary-transfer and maximum amount.
- Housing Bank, Interest Rates and Fees Retail and Corporate Loans 2026 —
  benchmark-linked pricing and quarterly adjustment disclosure.

The snapshot was retrieved and labelled `2026-07-15`. Missing dates, fees,
salary-transfer terms, effective rates, and eligibility remain unknown. No
product is described as universally best, approved, or guaranteed.

## Comparison and calculations

`comparePublishedProducts` filters category/structure/salary-transfer facts,
records conflicts and unknowns, and orders only transparent match information.
It does not issue eligibility decisions (`unknown`) or compute payments,
affordability, Murabaha profit, or total cost. No finance-engine formula was
changed or reused, because published inputs are incomplete and no reviewed
catalogue formula/vector exists.

## Assistant boundary and privacy

`supabase/functions/learn-assistant` accepts only a short question, language,
and public comparison IDs. It rejects any other shaped request and has no
provider implementation or secret. Its response is unavailable by design until
the owner configures and reviews a server-side provider adapter. The app does
not send profile, account, auth token, stored obligations, payment history,
or account numbers to the assistant.

## Migration and owner steps

`20260715140000_learn_reference_catalogue.sql` is generated for owner-run
remote application. It creates RLS-enabled reference tables with no client
write policies. The Supabase CLI was not installed, so the migration is
hand-authored and must be reviewed before application. No hosted migration,
secret, or configuration was changed.

Before enabling live catalogue/AI: appoint a data reviewer; complete the CBJ
inventory and source reviews; establish refresh cadence; deploy migration;
provide server-side provider secret; deploy Edge Function; set rate limits,
allowed origins, monitoring, and output-validation tests.

For the live chat, set `OPENAI_API_KEY` and optional `OPENAI_MODEL` in the
**Supabase Edge Function secret environment** (or dashboard), then deploy
`learn-assistant`. `apps/mobile/.env` must contain only
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; adding the
OpenAI key there would expose it in the mobile bundle. A safe template is at
`supabase/functions/.env.example`.

## Verification

- `pnpm --filter @eltizamati/mobile typecheck` — passed.
- Focused Jest comparison/privacy tests — passed (2 suites, 2 tests).
- Focused ESLint for Learn files — passed.
- `git diff --check` remains blocked by a pre-existing uncommitted blank line
  in `docs/final-review.md`; that file was not changed by this branch.

## Verdict

**PARTIALLY IMPLEMENTED — BLOCKED** for independent review and owner-side data
and live-provider configuration. The offline education/comparison foundation is
ready for review; it is not production-ready, market-wide, or live-AI verified.
