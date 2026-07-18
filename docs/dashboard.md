Act as the principal full-stack engineer, financial-data engineer, and product designer for Eltizamati.

Build a demo-only web dashboard that simulates how a bank or financial regulator could interact with Eltizamati’s database.

This is a hackathon demonstration only.

It will not be used by real bank employees, Central Bank employees, customers, or the public after the competition.

There is no authentication requirement for the dashboard.

The dashboard must still keep all privileged database and email credentials server-side.

Repository:

Talaljaber/Eltizamati

Create a separate branch:

feature/bank-simulator-dashboard

Create a separate worktree so this feature can be developed in parallel with the Learn and Phase 9 branches:

../Eltizamati-bank-dashboard

# 1. Branch and repository protection

Before changing anything, run:

git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -20
git diff --stat
git diff
git ls-files --others --exclude-standard
git worktree list
node --version
pnpm --version

Read in this order:

1. `docs/10-implementation/STATUS.md`
2. The active phase file
3. `docs/08-delivery/IMPLEMENTATION_PLAN.md`
4. Relevant Phase 3, 4, 6, 7, and 8 completion reports
5. Supabase migrations
6. Generated Supabase database types
7. Current profile domain and mapper
8. Obligation repository and mappers
9. Rate-period repository and migrations
10. Payment repository
11. Calculation-run repository
12. Insight repository and evaluation service
13. Existing finance-engine formulas
14. Existing provenance rules
15. Security and privacy documentation
16. `AI_AGENT_RULES.md`
17. `CODE_REVIEW_CHECKLIST.md`

Do not depend on conversation memory.

Fetch the latest remote state and create the isolated worktree:

git fetch origin

git worktree add ../Eltizamati-bank-dashboard \
-b feature/bank-simulator-dashboard \
origin/main

If the branch or worktree already exists, stop and report it. Do not overwrite or delete it.

Local commits are authorized.

Do not:

- push;
- merge;
- open a pull request;
- tag;
- deploy the website;
- apply migrations to hosted Supabase;
- change hosted secrets;
- send emails to real users;
- modify unrelated mobile features;
- change financial formulas or expected values.

# 2. Product identity

Name the website:

Eltizamati Bank Simulator

Subtitle:

Demo institution and regulatory operations portal

Always display a visible banner:

Demo environment — not an official bank or Central Bank system.

The dashboard may visually simulate:

- a bank operations portal;
- a financial institution servicing portal;
- a regulatory aggregate-monitoring portal.

It must never claim to be:

- the Central Bank of Jordan;
- a licensed bank system;
- an Open Banking integration;
- a credit bureau;
- a production customer-management system.

# 3. Authentication decision

Do not create:

- login pages;
- operator accounts;
- roles;
- permissions UI;
- password reset;
- MFA;
- institution-user management.

The website has no user authentication because it is a local hackathon demo.

However:

- all Supabase privileged access must occur server-side;
- the Supabase secret/service-role key must never enter browser JavaScript;
- the Gmail app password must never enter browser JavaScript;
- no sensitive environment value may use a `NEXT_PUBLIC_` prefix;
- browser components must call server routes or server actions;
- do not weaken existing mobile-user RLS policies.

Add an environment guard.

Required configuration:

DEMO_DASHBOARD_ENABLED=true
DEMO_DASHBOARD_ALLOW_REMOTE=false
EMAIL_SENDING_ENABLED=false
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_APP_PASSWORD=
SMTP_SENDER_NAME=Eltizamati Demo
SMTP_SENDER_EMAIL=

By default:

- the dashboard must bind to localhost;
- email sending must be disabled;
- only synthetic/test records may be shown.

If the application detects a production deployment while
`DEMO_DASHBOARD_ALLOW_REMOTE` is not explicitly enabled, it must refuse to start.

Do not commit `.env` files or secret values.

# 4. Website architecture

Create:

apps/bank-simulator-dashboard

Preferred stack:

- Next.js App Router;
- TypeScript strict mode;
- server components;
- server actions or route handlers;
- Supabase server client;
- repository or service layer;
- reusable web design system;
- Vitest for unit tests;
- Playwright for E2E tests.

Inspect the workspace before adding dependencies.

Do not perform broad dependency upgrades.

Do not import React Native components into the dashboard.

Platform-neutral domain and finance-engine packages may be reused.

# 5. Current-data audit

Before implementation, inspect the actual database and domain models.

Create:

docs/10-implementation/features/BANK-SIMULATOR-DASHBOARD-DESIGN.md

Record what is currently available.

## Profile information

Confirm actual fields such as:

- user ID;
- full name;
- phone number;
- primary bank;
- preferred locale;
- data mode;
- created date;
- updated date;
- reminder day;
- user-defined threshold.

Do not assume the authentication email is stored in the profile table.

When a test user’s email is needed, retrieve it only through a server-side Supabase Admin boundary.

## Obligation information

Inspect:

- obligation ID;
- user ID;
- kind;
- nickname;
- institution name;
- institution ID;
- currency;
- opened date;
- closed date;
- notes;
- provenance;
- created and updated timestamps.

## Conventional loans

Inspect:

- original principal;
- outstanding balance;
- installment;
- fixed or variable rate;
- term;
- start date;
- maturity date;
- first payment date;
- purpose;
- contractual balloon;
- per-field provenance.

## Murabaha

Inspect:

- asset cost;
- disclosed profit;
- total sale price;
- installment;
- term;
- start date;
- disclosed profit rate;
- provenance.

Do not treat Murabaha as an ordinary interest-bearing loan.

## Credit cards

Inspect:

- credit limit;
- current balance;
- statement balance;
- statement date;
- minimum-payment rule;
- purchase APR;
- cash-advance APR;
- due date;
- grace period;
- fees;
- provenance.

## Other records

Inspect:

- rate periods;
- payments;
- calculation runs;
- formula ID and version;
- assumptions;
- insights;
- consent records;
- data-source status.

Document fields that do not exist.

Do not invent:

- customer salary;
- employer;
- national ID;
- credit score;
- delinquency score;
- approval probability;
- internal bank account numbers;
- credit-bureau history.

# 6. Synthetic/test-data requirement

The dashboard must use only:

- deterministic demo users;
- explicitly approved test accounts;
- synthetic obligations;
- synthetic rates;
- synthetic email recipients.

Do not browse or modify unrelated hosted users.

Create a test-data allowlist such as:

DEMO_ALLOWED_USER_IDS=
DEMO_ALLOWED_EMAILS=

Every server query must filter to the allowed test-user IDs.

If the allowlist is missing or empty, the dashboard must refuse to load client-level information.

Do not create a “show all auth users” page.

# 7. Dashboard information architecture

## A. Overview

Create a professional dashboard home page containing:

- total demo clients;
- active obligations;
- conventional loans;
- Murabaha agreements;
- credit cards;
- total known outstanding balances;
- total known monthly commitments;
- fixed-rate exposure;
- variable-rate exposure;
- upcoming maturities;
- active residual-risk insights;
- high-utilization credit cards;
- incomplete-data count;
- recent simulated rate changes;
- email queue status.

Never treat missing values as zero.

Every aggregate must indicate whether it contains:

- official;
- user-entered;
- estimated;
- mixed;
- incomplete;

data.

## B. Client directory

Show only allowlisted test clients.

Columns:

- masked client name;
- preferred language;
- primary bank;
- number of obligations;
- total known monthly commitment;
- variable-rate exposure;
- active insight count;
- data-completeness state;
- last updated.

Allow filtering by:

- product type;
- institution;
- fixed or variable;
- active or closed;
- insight type;
- data completeness;
- Arabic or English.

## C. Client detail

Create sections for:

- profile;
- obligations;
- conventional-loan details;
- Murabaha details;
- credit-card details;
- rate history;
- payment history;
- calculations;
- insights;
- provenance;
- email history.

Show every material value with its provenance.

Do not create or display a fake credit score.

A client situation summary may include deterministic facts such as:

- number of active obligations;
- known monthly commitments;
- known outstanding balances;
- percentage of obligations with variable rates;
- upcoming maturity;
- existing engine-generated residual-risk insights;
- credit-card utilization;
- missing-data warnings.

Do not label a customer:

- good;
- bad;
- risky;
- safe;
- approved;
- rejected.

## D. Portfolio analytics

Create visual and tabular summaries for:

- obligation type distribution;
- outstanding balances by type;
- fixed versus variable rates;
- maturity timeline;
- rate distribution;
- insight distribution;
- provenance distribution;
- incomplete-data distribution;
- communication delivery status.

Charts must include text summaries and tables.

Do not use decorative or misleading charts.

## E. Bank rate simulator

This is the main demonstration feature.

Allow the operator to create a simulated bank-rate-change campaign.

Fields:

- campaign name;
- institution;
- reason;
- source note;
- old annual rate;
- new annual rate;
- effective date;
- product scope;
- selected test users or obligations;
- email notification enabled or disabled.

Only include eligible obligations that:

- belong to an allowed demo user;
- match the selected institution;
- are conventional loans;
- are marked variable rate;
- have a known current rate;
- have valid rate history;
- have sufficient provenance.

Automatically exclude:

- fixed-rate loans;
- Murabaha;
- credit cards unless a separate APR flow is implemented;
- obligations from another institution;
- incomplete records;
- obligations with no known current rate;
- non-allowlisted users.

Show the reason for every exclusion.

## F. Central-bank benchmark simulator

Create a separate demonstration page for a simulated policy/reference-rate change.

This is not the same as changing every client contract.

Allow entering:

- benchmark name;
- previous benchmark rate;
- new benchmark rate;
- announcement date;
- effective date;
- explanation/source note.

The benchmark change should be stored as a simulation record.

Do not automatically update borrower rates.

Show:

- variable-rate obligations that may potentially be affected;
- obligations missing benchmark/margin information;
- obligations where contract impact cannot be calculated.

The current app may not store:

- benchmark identity;
- margin/spread;
- repricing frequency;
- floor;
- cap;
- next repricing date.

When these fields are unavailable, clearly state:

Contract impact cannot be calculated from the available data.

Do not guess.

# 8. Rate-change implementation

Rate history is append-only.

Do not overwrite an existing rate period.

When a simulated bank campaign is published:

1. Revalidate that all target users are allowlisted.
2. Revalidate that every target obligation is variable-rate.
3. Revalidate the latest non-corrected rate effective on the campaign date.
4. Create a new rate period with the selected effective date.
5. Preserve all historical rate periods.
6. Attach demo provenance.
7. Re-run supported existing calculations.
8. Re-evaluate supported insights.
9. Create email-outbox records.
10. Create a demo audit event.
11. Mark the campaign complete.

Use one server-side transaction or approved RPC.

Do not mutate directly from browser code.

Do not alter an existing historical rate’s:

- annual rate;
- effective date;
- user ID;
- obligation ID;
- provenance.

Corrections must follow the existing `superseded_by` semantics. A normal later-effective repricing is not a correction: both it and the preceding historical period remain non-superseded so calculations can apply each over its effective interval.

Read the current implementation before using it.

Stop if those semantics are unclear.

## Demo provenance

Dashboard-created changes must use clearly simulated provenance.

Example meaning:

- source: demo;
- provider: bank-simulator-dashboard;
- observed time;
- recorded time;
- campaign ID;
- explanation.

Never mark a dashboard-created hackathon record as official bank data.

# 9. Impact preview

Before applying a rate campaign, show:

- current rate;
- proposed rate;
- effective date;
- current installment;
- known outstanding balance;
- current maturity date;
- supported estimated impact;
- assumptions;
- missing inputs;
- unsupported calculations.

Use existing Eltizamati financial formulas only.

Do not write calculations inside React components.

Do not invent a new formula.

Do not change expected financial values.

When the existing engine cannot calculate an effect, show:

Impact unavailable because the required contract inputs are missing.

# 10. Insights after a rate change

Reuse existing deterministic insight logic.

Where supported, evaluate:

- rate-change detected;
- residual-risk changes;
- installment/principal impact;
- projected balance at maturity;
- incomplete-data warning.

The dashboard may display an explanation of the result.

Do not produce regulated recommendations.

Use wording such as:

- Estimated impact
- Requires customer review
- Questions the client may ask the institution
- Based on available data

Do not use:

- This customer should refinance
- This customer must pay more
- This client is high risk
- Approve or reject

# 11. Gmail email integration

Use a dedicated Gmail account and app password.

Implement a server-only `EmailGateway`.

The Gmail app password must remain in:

SMTP_APP_PASSWORD

It must never appear in:

- source files;
- browser bundles;
- logs;
- database rows;
- screenshots;
- test output;
- documentation;
- committed environment examples.

Use Nodemailer or the smallest compatible SMTP library after inspecting current dependencies.

Default:

EMAIL_SENDING_ENABLED=false

Provide three modes:

1. Preview only
2. Development email sink
3. Gmail SMTP

The UI must clearly show the current mode.

## Recipient controls

Only send to an email address already on file (`profiles.email`) for an account listed in `DEMO_ALLOWED_USER_IDS` — there is no separate recipient allowlist to configure. Because `profiles.email` is only ever read through `listAllowlistedProfiles()`, which is itself scoped to `DEMO_ALLOWED_USER_IDS`, this can never be broader than the existing test-data allowlist.

If the selected user has no email on file, or isn't allowlisted:

- do not send;
- mark the email as suppressed;
- show a safe reason.

Do not send to every account in Supabase Auth.

The first live test may target only Talal’s approved test email.

## Email templates

Provide Arabic and English templates.

Rate-change email should contain:

- demo institution name;
- clear “demo notification” label;
- obligation nickname or masked reference;
- old rate;
- new rate;
- effective date;
- explanation;
- instruction to open Eltizamati;
- questions to confirm with the institution;
- disclaimer that this is a hackathon simulation.

Do not include:

- complete payment history;
- full outstanding balance unless explicitly approved;
- account numbers;
- phone number;
- national ID;
- other obligations;
- authentication links;
- passwords;
- risk labels.

Example subject:

Demo rate-change notification — Eltizamati

Example disclosure:

This message was generated by the Eltizamati hackathon bank simulator. It is not an official notice from your bank.

# 12. Email outbox

Create a demo email outbox.

Suggested fields:

- ID;
- campaign ID;
- user ID;
- locale;
- recipient hash;
- recipient masked value;
- template ID;
- status;
- attempt count;
- idempotency key;
- safe error code;
- created time;
- sent time.

Statuses:

- preview;
- queued;
- sent;
- failed;
- suppressed;
- sending-disabled.

Ensure duplicate processing does not send duplicate emails.

Do not store the Gmail app password.

# 13. Demo activity log

Create a simple append-only demo activity log.

Show:

- campaign created;
- campaign previewed;
- rate period appended;
- calculation evaluated;
- insight generated;
- email queued;
- email sent;
- email suppressed;
- operation failed.

Do not put full PII, balances, email addresses, tokens, or secrets in the log.

This is not a production compliance audit system. Label it:

Demo activity log

# 14. Website UI

Create a professional institutional interface.

Desktop-first, responsive down to tablet width.

Navigation:

- Overview
- Clients
- Portfolio
- Bank Rate Simulator
- Benchmark Simulator
- Communications
- Activity Log
- Demo Settings

Design language:

- deep navy navigation;
- teal primary actions;
- gold explanation/review accent;
- light neutral content surfaces;
- clear numeric hierarchy;
- tabular financial figures;
- accessible warnings;
- restrained charts;
- no generic admin-template look.

Include a permanent demo banner.

Support English and Arabic where practical.

At minimum, bilingual support is required for:

- main navigation;
- rate campaign;
- impact preview;
- emails;
- client summary;
- important warnings;
- demo labels.

RTL must be correctly supported.

# 15. Demo settings page

Show configuration state without exposing values:

- Supabase configured: yes/no
- Supabase secret configured: yes/no
- Gmail SMTP configured: yes/no
- Email sending enabled: yes/no
- Recipient allowlist configured: yes/no
- Allowed test users configured: yes/no
- Environment: local/demo
- Remote deployment allowed: yes/no

Never display the actual secret values.

Provide buttons:

- Preview sample email
- Send test email to allowlisted address
- Reset synthetic demonstration records
- Seed demonstration data

All destructive operations require confirmation.

# 16. Database changes

Prefer dashboard-specific tables and functions.

Possible migrations:

- `demo_rate_campaigns`
- `demo_benchmark_rates`
- `demo_rate_campaign_targets`
- `demo_email_outbox`
- `demo_dashboard_activity`

Do not add a public admin policy to existing tables.

All privileged database access is server-side.

Do not apply migrations to the hosted database.

Generate the migration files and tests only.

Provide an owner checklist for applying them later.

# 17. Tests

## Unit tests

Test:

- demo-user allowlist;
- client masking;
- aggregate handling;
- missing values not treated as zero;
- rate-campaign eligibility;
- fixed-rate exclusion;
- Murabaha exclusion;
- institution mismatch;
- missing-rate exclusion;
- append-only rate creation;
- provenance;
- calculation integration;
- email templates;
- email allowlist;
- disabled email;
- idempotency;
- log sanitization.

## Server tests

Test:

- missing dashboard-enabled flag;
- missing allowed-user list;
- attempted access to non-allowlisted user;
- invalid campaign;
- fixed-rate target;
- invalid rate;
- invalid date;
- duplicate campaign publication;
- email disabled;
- non-allowlisted recipient;
- SMTP failure;
- safe error response.

## Database tests

Add pgTAP tests for:

- historical rates remain unchanged;
- new rate period is appended;
- duplicate effective date is rejected where required;
- campaign transaction rolls back on failure;
- non-allowlisted targets cannot be processed;
- email-outbox idempotency;
- activity log append-only.

## UI tests

Test:

- overview;
- client list;
- client detail;
- portfolio;
- campaign creation;
- target exclusions;
- impact preview;
- campaign publication with fake email;
- email preview;
- benchmark simulator;
- demo settings;
- loading;
- empty;
- error;
- Arabic/RTL.

## Playwright E2E

Add:

1. View demo client.
2. Inspect variable-rate loan.
3. Create rate campaign.
4. Preview affected/excluded obligations.
5. Publish using fake email gateway.
6. Confirm rate history appended.
7. Confirm updated insight/calculation.
8. Confirm email appears in outbox.
9. Confirm activity log.
10. Confirm benchmark simulation does not automatically alter contracts.

# 18. Suggested implementation commits

Commit 1:

docs: define bank simulator dashboard architecture

Commit 2:

feat(dashboard): add bank simulator web application

Commit 3:

feat(dashboard): add demo client and portfolio views

Commit 4:

feat(dashboard): add rate and benchmark simulators

Commit 5:

feat(dashboard): add calculation and insight impact preview

Commit 6:

feat(dashboard): add Gmail-backed demo email outbox

Commit 7:

test(dashboard): cover simulation and email workflows

Commit 8:

docs: record bank simulator implementation evidence

Keep commits small and reviewable.

# 19. Validation

Use Node LTS before treating results as final evidence.

Run:

pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run depcruise
pnpm run test:packages
pnpm run test:app
pnpm run check

Run dashboard commands:

pnpm --filter bank-simulator-dashboard lint
pnpm --filter bank-simulator-dashboard typecheck
pnpm --filter bank-simulator-dashboard test
pnpm --filter bank-simulator-dashboard build
pnpm --filter bank-simulator-dashboard test:e2e

Where local Supabase is available:

supabase db reset
supabase test db
pnpm run test:integration

Do not apply migrations remotely.

Do not send live emails during automated testing.

# 20. Stop conditions

Stop rather than guessing when:

- the worktree cannot be created safely;
- another branch overlaps the same files;
- the dashboard would require weakening mobile RLS;
- the Supabase secret would enter browser code;
- the Gmail app password would enter browser code;
- a non-allowlisted user would become visible;
- a non-allowlisted email could receive a message;
- a fixed-rate loan would be changed;
- Murabaha would be treated as a variable-interest loan;
- benchmark/margin information is missing for a requested calculation;
- a new finance formula would be required;
- expected financial values are unavailable;
- rate-history correction semantics are unclear;
- a hosted migration would be required;
- deployment would make the no-auth dashboard publicly accessible.

# 21. Final report

Return:

1. Branch.
2. Worktree.
3. Starting and ending HEAD.
4. Working-tree state.
5. Commits.
6. Data fields discovered.
7. Missing data.
8. Website architecture.
9. Screens implemented.
10. Client and portfolio metrics.
11. Rate-campaign workflow.
12. Benchmark simulation behavior.
13. Financial calculations reused.
14. Unsupported calculations refused.
15. Email architecture.
16. Gmail configuration still required.
17. Email allowlist behavior.
18. Synthetic/test data used.
19. Database migrations.
20. Tests and exact results.
21. Hosted changes not performed.
22. Real emails not sent.
23. Secrets not committed.
24. Merge-conflict risks.
25. Final verdict:
    - READY FOR INDEPENDENT REVIEW
    - PARTIALLY IMPLEMENTED — BLOCKED
    - REOPEN FEATURE
    - STOP SHIP

End with:

Nothing was pushed.
Nothing was merged.
No hosted migration was applied.
No real client data was accessed.
No non-allowlisted email was sent.
Waiting for Talal’s review and merge approval.

correction

# Required variable-rate simulation behavior

The primary bank-simulator story is:

Variable benchmark or lending rate increases
→ the customer’s monthly installment remains unchanged
→ the financing-cost portion of each payment increases
→ the principal-repayment portion decreases
→ a projected balance may remain at contractual maturity
→ the dashboard explains the projected final residual
→ the customer receives a bilingual rate-change notification.

This is the default demonstration policy for eligible variable-rate conventional loans.

## Correct implementation

When a simulated rate change is published:

1. Append a new `RatePeriod` with:
   - the new annual rate;
   - the effective date;
   - demo provenance;
   - the originating campaign ID.

2. Preserve every historical rate period.

3. Run the existing `variableProjection.v1` calculation using:

   `installmentPolicy: 'unchanged'`

4. Calculate:

   - updated payment allocation;
   - financing-cost portion;
   - principal portion;
   - remaining balance by period;
   - projected residual at contractual maturity;
   - negative-amortization state, where applicable.

5. Pass the projection into `residualDetection.v1`.

6. Store or display the resulting calculation run with:
   - formula ID;
   - formula version;
   - input snapshot;
   - as-of date;
   - assumptions;
   - confidence;
   - provenance.

Do not calculate the residual inside the dashboard UI.

Do not manually add a value to `contractualBalloon`.

## Contractual balloon versus projected residual

Keep these concepts separate.

### Contractual balloon

A large final payment explicitly contained in the original contract.

Source:

- official;
- or user-entered contract information.

Field:

- `contractualBalloon`

### Projected residual at maturity

A calculated estimate of the balance expected to remain because the rate changed while the monthly installment stayed unchanged.

Source:

- finance-engine estimate.

Field/result:

- `projectedResidualAtMaturity`

Never copy a projected residual into the contractual-balloon field.

Never label a projected residual as an official final payment unless the bank has confirmed it.

## Dashboard display

For an affected loan, show:

Current annual rate
New annual rate
Effective date
Monthly installment
Installment policy: Unchanged
Previous estimated interest portion
New estimated interest portion
Previous estimated principal portion
New estimated principal portion
Contractual maturity date
Projected residual at maturity
Estimated equivalent number of additional installments
Confidence
Assumptions
Missing contract information

Primary explanation:

“Your simulated interest rate increased while your monthly installment remained unchanged. A larger part of each payment now covers interest, leaving less to reduce the principal. Based on the available information, an estimated balance may remain at the original maturity date.”

Do not say:

“The Central Bank added this amount to your balloon.”

Do not say:

“This is definitely your final payment.”

## Final-payment presentation

When the engine calculates a projected residual, show:

“Projected amount remaining at maturity”

and not:

“Final installment”

unless a confirmed contractual source states that the bank collects the complete residual as the final installment.

For the hackathon simulation, a separate clearly labeled scenario may show:

“Demo servicing assumption: the complete projected residual is collected with the final scheduled payment.”

Under that assumption, display:

Scheduled final installment +
Projected residual at maturity
=

Simulated final payment

The entire result must remain marked:

Estimated demo scenario — actual treatment depends on the financing contract and institution.

## Alternative servicing policies

The simulator should allow three policies:

1. `Unchanged installment`

   Monthly payment remains the same. A projected residual may remain at maturity.

2. `Recalculated installment`

   Monthly payment increases or decreases so the loan remains scheduled to close at the original maturity.

3. `Unknown contract treatment`

   The dashboard records the rate change but refuses to calculate the final treatment because the contract policy is unavailable.

Default the hackathon demo to:

`Unchanged installment`

Do not silently apply that policy to every product.

## Eligibility

This simulation applies only to:

- conventional loans;
- variable-rate loans;
- loans with a known current balance;
- loans with a known current rate;
- loans with a known installment;
- loans with a maturity date or remaining term;
- allowlisted synthetic/test clients.

Exclude:

- fixed-rate loans;
- Murabaha;
- Ijara;
- diminishing Musharakah;
- credit cards;
- records missing material inputs.

Explain each exclusion.

## Benchmark-rate change

A simulated Central Bank benchmark change does not directly modify every loan.

Use this sequence:

Benchmark publication
→ identify potentially linked variable-rate products
→ select a bank lending-rate change for the demo
→ append the new loan rate
→ run the unchanged-installment projection
→ calculate projected residual
→ notify the test customer.

When benchmark, spread, cap, floor, or repricing-frequency data is missing, label the relationship as simulated.

Do not claim the customer’s contractual rate was derived directly from the Central Bank rate.

## Email wording

The bilingual email should say:

“Your simulated variable interest rate changed from X% to Y%, effective DATE. In this demonstration, your monthly installment remains unchanged. This means more of each installment may go toward interest and less toward principal. Eltizamati estimates that approximately AMOUNT may remain at the original maturity date.”

Then show:

- estimate label;
- assumptions;
- link/instruction to review the scenario;
- questions to confirm with the institution.

Include:

“This is a hackathon simulation and not an official notification from your bank.”

Do not describe the projected residual as guaranteed or contractual.
