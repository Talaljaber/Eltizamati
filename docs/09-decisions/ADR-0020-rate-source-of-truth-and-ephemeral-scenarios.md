# ADR-0020 — Authoritative Rate History and Ephemeral Customer Scenarios

- **Status:** Accepted
- **Date:** 2026-07-18

## Decision

Only the server-side Bank Rate Simulator campaign may append a later authoritative rate period for an existing loan. The mobile app may create the initial rate while creating an owned loan, but a customer cannot append, supersede, edit, or delete later rate periods.

A genuine repricing appends a non-superseded period. `superseded_by` is reserved for correcting erroneous history; it must not remove an earlier valid period from chronological projection.

The mobile “What if the rate changes?” experience is an ephemeral calculation. It never persists a rate period, calculation run, insight, notification, loan balance, installment, or contractual balloon.

Rate publication and what-if calculations use an unchanged installment. A rate change does not overwrite the reported current outstanding principal. The scenario reports the estimated projected total still payable, defined as future schedule payments strictly after the as-of date plus the projected residual at maturity.

## Consequences

- Database grants and a trigger enforce the source-of-truth rule even for stale or malicious mobile clients.
- The dashboard publish RPC is executable only by `service_role`.
- `rateChangeScenario.v1` is a pure finance-engine formula; its output is an estimate and not an official payoff quote.
- Contractual installment editing is explicitly outside this decision.
