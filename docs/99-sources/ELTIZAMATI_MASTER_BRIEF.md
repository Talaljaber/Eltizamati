# ELTIZAMATI — MASTER PRODUCT & ENGINEERING BRIEF

**Document status:** Authoritative starting brief  
**Version:** 1.0  
**Primary owner:** Talal Jaber  
**Project:** Rally Fintech Hackathon  
**Product name:** Eltizamati — التزاماتي  
**Target market:** Jordan first; MENA-ready  
**Primary platform:** Cross-platform mobile application  
**Purpose of this file:** Give any AI agent, architect, designer, engineer, reviewer, or future teammate enough context to understand Eltizamati from problem to implementation without relying on chat history.

---

## 0. How to Use This Document

This file describes the product truth, current direction, constraints, confirmed requirements, unresolved questions, and expected quality level.

It is **not** a final technical architecture. The architecture must be designed by the lead architecture agent after evaluating alternatives.

When another document, prototype, screen, or suggestion conflicts with this file:

1. Preserve the product mission and non-negotiable requirements in this file.
2. Treat mockups and early documents as evidence and inspiration, not unquestionable truth.
3. Record material changes as explicit decisions.
4. Never silently alter financial logic, terminology, security boundaries, or core flows.
5. Mark assumptions separately from verified facts.

---

# 1. Executive Summary

Eltizamati is a personal financial obligations management application focused on helping borrowers understand where they stand, what they still owe, how much financing is costing them, what changed, what is due next, and how different repayment choices may affect their future obligations.

The initial use case is personal loans and financing in Jordan. The product should ultimately support:

- Conventional loans.
- Islamic financing.
- Credit cards.
- Multiple obligations across different financial institutions.
- Rate or profit-rate changes.
- Payment tracking.
- Remaining-balance and repayment-progress visibility.
- Interest/profit breakdowns.
- Balloon-payment risk awareness.
- Educational simulations.
- Contextual alerts.
- A unified view of the user's financial commitments.

The product exists because borrowers commonly receive fragmented information from different lenders, see individual statements rather than one clear financial picture, and may not understand how rate changes, minimum payments, financing costs, or unchanged installments affect total repayment.

Eltizamati must not pretend to be a bank, credit bureau, licensed financial adviser, or debt-settlement service. It provides transparent calculations, tracking, education, and planning support. Any calculated values that are not authoritative bank figures must be clearly identified as estimates.

---

# 2. The Product in One Sentence

**Eltizamati gives borrowers one clear, understandable view of all their financial obligations, explains what changed and why, and helps them explore the impact of repayment choices before future costs become surprises.**

---

# 3. Core Problem

Borrowers are often “flying blind” because:

- Obligations are split across banks, lenders, cards, and statements.
- Banking applications mainly expose products held with that bank.
- Statements show figures but rarely explain the long-term impact clearly.
- Users may know their monthly installment but not their remaining principal, total financing cost, rate history, or projected end-state.
- Variable-rate changes can increase the cost of financing without being easy to understand.
- Keeping an installment unchanged after a rate increase can cause less principal to be repaid, potentially leaving a large balance at maturity.
- Credit-card minimum payments can create long repayment periods and substantial finance charges.
- Conventional and Islamic products use different terminology and contract structures, making generic explanations misleading.
- Many borrowers lack a single place to track due dates, payments, changes, progress, and obligations collectively.

The problem is not merely “loan tracking.” The deeper problem is **financial obligation opacity**.

---

# 4. Product Vision

## 4.1 Vision

Enable every borrower to understand their financial commitments clearly enough to make informed, timely decisions.

## 4.2 Mission

Turn fragmented and difficult-to-interpret obligation data into a calm, unified, explainable financial picture.

## 4.3 Long-Term Outcome

A user should be able to open Eltizamati and answer, within seconds:

- What do I currently owe?
- To whom?
- What is due next?
- Am I on track?
- What changed?
- How much has the change cost me?
- Is there a future risk I am not seeing?
- What happens if I pay more, less, or earlier?
- Which figures are official and which are estimates?
- What should I discuss with my bank?

---

# 5. Product Goals

## 5.1 Primary Goals

1. Give users one unified view of obligations.
2. Explain balances, payments, rates, profit, principal, and costs in plain language.
3. Surface material changes and future risks early.
4. Make financial calculations transparent and reproducible.
5. Help users explore scenarios without presenting estimates as guaranteed outcomes.
6. Support both conventional and Islamic financial products correctly.
7. Build trust through privacy, accuracy, traceability, and calm communication.
8. Create an architecture that can evolve from hackathon prototype to production system without a complete rewrite.

## 5.2 Secondary Goals

- Improve financial awareness.
- Encourage timely payment behavior.
- Reduce surprises at maturity.
- Make conversations with lenders more informed.
- Provide a foundation for future regulated integrations and partnerships.
- Support Arabic and English from the beginning.

## 5.3 Non-Goals for the Initial Product

The initial version is not intended to:

- Approve or reject financing.
- Give regulated investment, legal, or individualized financial advice.
- Negotiate with banks on the user's behalf.
- Change bank repayment schedules.
- Move money unless a future regulated payment feature is explicitly approved.
- Replace official statements, contracts, lender calculations, or credit reports.
- Guarantee savings or settlement outcomes.
- Recommend a specific lender or financial product as the “best” choice.
- Build a full budgeting, investing, or general expense-management application.

---

# 6. Target Users

## 6.1 Primary Segment: Multi-Obligation Borrowers

Characteristics:

- Hold two or more active obligations.
- May have loans, financing, and credit cards across institutions.
- Pay regularly but lack one total view.
- Do not know their exact progress or aggregate burden.
- Are vulnerable to missed dates, rate changes, and fragmented information.

Key jobs:

- See everything in one place.
- Know total outstanding obligations.
- Understand monthly commitment.
- Track progress and upcoming payments.
- Detect costly changes early.

## 6.2 Secondary Segment: First-Time Borrowers

Characteristics:

- Have limited experience with financing terminology.
- May understand the installment but not total cost.
- Need explanations without condescension.
- Want reassurance that they are on track.

Key jobs:

- Understand the structure of the obligation.
- Learn the difference between principal and interest/profit.
- Understand due dates, statements, and rate behavior.
- Explore repayment scenarios.

## 6.3 Additional Future Segments

- Credit-card-heavy users.
- Households managing obligations jointly.
- Islamic-financing customers.
- Self-employed borrowers with irregular income.
- Users approaching maturity with residual-balance risk.
- Financial coaches or advisers operating under an appropriate regulated model.
- Banks or credit bureaus providing a white-label transparency experience.

---

# 7. Product Principles

These principles are non-negotiable.

## 7.1 Clarity Before Complexity

The user sees the conclusion first and can inspect the calculation afterward.

## 7.2 Explain Every Material Number

Every important figure must have:

- A label.
- A source.
- A last-updated time.
- A definition.
- A calculation explanation when derived.
- A distinction between official and estimated.

## 7.3 Never Shame the User

No guilt-based language, aggressive red screens, or moral judgment.

## 7.4 Calm but Honest

Risk must not be hidden, but communication should focus on control and understanding rather than fear.

## 7.5 Education, Not False Authority

The product explains possibilities and provides questions/actions to discuss with the lender. It does not claim authority to modify an agreement.

## 7.6 Financial Logic Is Domain Logic

Calculations must never be embedded casually inside UI components. They belong in tested domain services or calculation engines.

## 7.7 Product-Type Accuracy

Conventional and Islamic products cannot be handled by replacing words alone when underlying contracts differ. Terminology adaptation is required, but calculations must also respect the detected or selected contract type.

## 7.8 Privacy by Design

Collect only what is needed. Make data origin and consent understandable. Protect data in transit, at rest, and on device.

## 7.9 Mobile Simplicity

Each screen should have one dominant purpose and normally one primary action.

## 7.10 Architecture Must Resist AI-Generated Entropy

Future agents must not duplicate logic, bypass layers, invent models, or create inconsistent components.

---

# 8. Product Scope

## 8.1 Obligation Types

The architecture must be designed to support an extensible obligation model.

Initial types:

1. Conventional personal loan.
2. Conventional auto loan.
3. Conventional housing loan.
4. Islamic Murabaha financing.
5. Islamic Ijara financing.
6. Diminishing Musharakah, where data and calculation rules are sufficiently defined.
7. Revolving credit card.
8. Other credit facility as a generic read-only type when full calculations are unavailable.

Not every type must be fully implemented in the hackathon MVP. The system design must avoid locking the domain to only one product.

## 8.2 Core Modules

- Authentication and identity.
- Consent and data connection.
- Manual data entry or demo-data import.
- Unified obligations dashboard.
- Obligation details.
- Payment history.
- Rate/profit-rate history.
- Repayment progress.
- Balloon/residual-balance analysis.
- Loan/financing simulator.
- Credit-card payoff simulator.
- Notifications and alerts.
- Financial education.
- Settings, privacy, export, and deletion.
- Data-source status and synchronization.

---

# 9. Data Acquisition Strategy

The product concept includes two strategic data sources:

## 9.1 CRIF / Credit Bureau Data

Potential use:

- List of obligations.
- Product and contract type.
- Original amount.
- Outstanding balance.
- Credit limits.
- Payment performance.
- Delinquencies.
- Historical data.
- Institution identity.
- Contract status.

## 9.2 Open Banking Data

Potential use:

- Live or recent account balances.
- Transactions.
- Installment-payment confirmation.
- Connected-account information.
- Account updates.
- Notifications or webhooks.

## 9.3 Reality and MVP Constraint

Actual production access to CRIF and Open Banking may require regulatory approval, institutional agreements, credentials, certification, and sandbox availability.

Therefore, the architecture and documentation must clearly distinguish:

- **Real integration**
- **Sandbox integration**
- **Mock provider**
- **Manual entry**
- **Demo seed data**

The hackathon build must remain usable without pretending that unavailable integrations are live.

## 9.4 Data Source Priority

For each field, define source priority and conflict handling. A recommended starting policy to evaluate:

1. Authoritative lender/Open Banking value when available and applicable.
2. Credit-bureau value.
3. User-confirmed statement entry.
4. System estimate.

The final architecture agent must formalize this policy and define provenance metadata.

---

# 10. Core User Journey

## 10.1 First Launch

1. Splash/router.
2. Language selection if not inferred.
3. Short onboarding:
   - See all obligations.
   - Understand what changed.
   - Plan before surprises.
4. Sign in, sign up, or explore a demo if allowed.
5. Accept mandatory legal documents and permissions.
6. Choose how to add data:
   - Connect supported source.
   - Import from a sandbox/demo source.
   - Enter manually.
7. Create unified financial profile.
8. Classify obligations.
9. Land on Home.

## 10.2 Returning User

1. Secure session restoration.
2. Optional biometric unlock.
3. Home dashboard.
4. See overall state and next action.
5. Refresh/synchronize in the background or on demand.
6. Open an obligation or respond to an alert.

## 10.3 Rate-Change Flow

1. A new rate is imported, detected, or entered.
2. System validates effective date and previous value.
3. Recalculation engine creates a new projection.
4. System records the calculation version and inputs.
5. User sees:
   - Previous rate.
   - New rate.
   - Effective date.
   - Estimated added cost.
   - Payment/principal impact.
   - Potential residual/balloon balance.
6. User opens scenario planner.
7. User explores an adjusted payment.
8. Product gives questions or steps to discuss with the lender.
9. No schedule is changed by Eltizamati.

## 10.4 Payment Flow

1. Payment is imported or entered.
2. Duplicate detection runs.
3. Payment is associated with an obligation and schedule period.
4. Principal/interest or principal/profit allocation is imported or estimated.
5. Progress and status update.
6. Due-date and delinquency state update.
7. User can inspect payment provenance.

---

# 11. Navigation Direction

The final navigation should be validated by the architect and product designer. The current recommended information architecture is:

- **Home**
- **Obligations**
- **Plan**
- **Learn**

Common global access:

- Notifications.
- Profile/settings.
- Data connection/sync status.

A dedicated Payments tab should only exist if user testing shows enough independent value; otherwise payments can live inside each obligation and Home activity. The final agent must compare navigation alternatives rather than copying this recommendation blindly.

---

# 12. Home Dashboard

## 12.1 Purpose

Answer “Where do I stand?” immediately.

## 12.2 Candidate Sections

- Greeting and profile status.
- Total outstanding obligations.
- Total regular monthly commitment.
- Amount due soon.
- Overall state:
  - On track.
  - Due soon.
  - Overdue.
  - Attention required.
- Obligation list/cards.
- Recent material changes.
- Next payment.
- Critical risk or insight.
- Sync/data freshness status.
- Primary action based on context.

## 12.3 Obligation Card

Should display only the most useful fields:

- Product name or nickname.
- Institution.
- Product type.
- Remaining balance.
- Next due amount/date.
- Progress.
- Status.
- Material warning if present.
- Data freshness.

## 12.4 Empty States

- No obligations added.
- Data source connected but no obligations found.
- Connection expired.
- Data unavailable.
- Demo mode.
- Partial data.

Each state needs a clear next action.

---

# 13. Obligation Detail — Conventional Loan

## 13.1 Required Information

- Original principal.
- Outstanding principal or official remaining balance.
- Current installment.
- Current interest rate.
- Rate type: fixed, variable, mixed, unknown.
- Original term.
- Remaining term.
- Start date.
- Maturity date.
- Next due date.
- Payment frequency.
- Repayment progress.
- Total paid.
- Principal paid.
- Interest paid.
- Estimated remaining interest.
- Rate history.
- Payment history.
- Schedule/amortization view.
- Data sources and freshness.

## 13.2 Insights

- Rate increased/decreased.
- Installment changed.
- Installment did not change after rate increase.
- Less principal is being reduced.
- Potential residual balance.
- Missed payment.
- Payment due soon.
- Projection changed materially.
- Extra payment impact.

## 13.3 Actions

- Explore repayment scenario.
- Add/log payment.
- Add/log rate change.
- View schedule.
- View calculation explanation.
- View questions to ask the bank.
- Refresh data.

---

# 14. Obligation Detail — Islamic Financing

## 14.1 Terminology

Use financing-appropriate language:

- Loan → Financing where appropriate.
- Interest → Profit, rental, or financing cost depending on contract.
- Interest rate → Profit rate or rental rate where accurate.
- Principal → Outstanding financing amount or asset-share language when needed.
- Early payoff → Early settlement.

## 14.2 Critical Rule

The system must not assume all Islamic products behave like conventional amortizing loans. Each supported contract type requires:

- A defined data model.
- A defined calculation method.
- A legal/product terminology map.
- A known limitation policy.
- A fallback read-only view when accurate simulation is not possible.

## 14.3 Educational Topics

- Murabaha.
- Ijara.
- Diminishing Musharakah.
- Fixed and variable profit/rental behavior.
- Early settlement.
- Outstanding financing amount.
- Contract-specific caveats.

---

# 15. Credit Card Detail

## 15.1 Required Information

- Credit limit.
- Current balance.
- Available credit.
- Utilization.
- Statement balance.
- Minimum payment.
- Due date.
- Statement date.
- Grace period or interest-free days where known.
- Purchase rate.
- Cash-advance rate where available.
- Fees.
- Recent payments.
- Recent transactions if the integration permits.
- Payment status.

## 15.2 Simulator

Allow the user to compare:

- Minimum payment.
- Statement balance.
- Fixed monthly amount.
- Custom amount.

Show:

- Estimated payoff date.
- Number of months.
- Estimated finance charges.
- Total paid.
- Savings versus minimum-only behavior.
- Assumptions and rate stability caveat.

---

# 16. Balloon / Residual-Balance Detection

## 16.1 Purpose

Identify when the expected balance at contractual maturity is materially above zero.

## 16.2 Candidate Causes

- Rate increase while installment remains unchanged.
- Payment shortfall.
- Capitalized interest.
- Payment holiday.
- Fees added to balance.
- Irregular payment timing.
- Contract structure intentionally includes a balloon.
- Incorrect or incomplete data.

## 16.3 User Explanation Flow

1. What was detected?
2. How reliable is the detection?
3. What changed?
4. Why did it affect principal reduction?
5. Estimated additional cost.
6. Estimated residual balance at maturity.
7. Scenario comparison.
8. Questions to ask the lender.
9. Legal and estimation disclaimer.

## 16.4 Calculation Requirements

The final calculation specification must define:

- Input contract.
- Formula.
- Day-count convention.
- Compounding convention.
- Payment timing.
- Rate effective dates.
- Fee treatment.
- Rounding policy.
- Currency precision.
- Negative amortization behavior.
- Missing data behavior.
- Confidence level.
- Test vectors.
- Comparison against lender schedules.

No balloon figure may be displayed without assumptions and traceability.

---

# 17. Repayment Planning

## 17.1 Loan/Financing Scenarios

Inputs:

- Extra monthly payment.
- One-time payment.
- Start date.
- Goal:
  - Reduce maturity balance.
  - Shorten term.
  - Reduce total cost.
  - Restore original trajectory.

Outputs:

- New estimated installment or total payment.
- New projected payoff date.
- Estimated cost saved.
- Months saved.
- Projected residual balance.
- Comparison with current scenario.

## 17.2 Credit Card Scenarios

Inputs:

- Monthly payment.
- One-time payment.
- Estimated future spending toggle.
- Rate.

Outputs:

- Payoff duration.
- Finance charges.
- Total paid.
- Utilization path.
- Warning when payment is insufficient to reduce balance.

## 17.3 Recommendation Boundary

The product may state:

- “At this amount, the model estimates…”
- “You may want to ask your bank whether…”
- “Confirm that additional payment reduces principal.”

It must not state:

- “You should definitely…”
- “The bank must…”
- “This guarantees…”
- “This is the optimal financial decision.”

---

# 18. Notifications

## 18.1 Categories

- Payment due soon.
- Payment overdue.
- Statement ready.
- Rate/profit rate changed.
- Installment changed.
- Balloon/residual risk detected.
- Utilization high.
- Credit limit changed.
- Connection expired.
- Data refresh failed.
- Financing completed.
- Educational reminder.
- User-defined threshold reached.

## 18.2 Notification Principles

- Explain why it was triggered.
- Deep-link to the relevant screen.
- Avoid duplicate alerts.
- Respect user preferences and quiet hours.
- Never expose sensitive detail on a locked screen by default.
- Distinguish informational, warning, and urgent states.
- Record delivery and read state.
- Provide an in-app notification center.

---

# 19. Education Engine

## 19.1 Purpose

Provide short, contextual explanations tied to what the user is seeing.

## 19.2 Content Categories

Conventional:

- Principal.
- Interest.
- APR/effective rate.
- Fixed versus variable rate.
- Amortization.
- Balloon payment.
- Early repayment.
- Fees.

Islamic:

- Murabaha.
- Ijara.
- Diminishing Musharakah.
- Profit calculation.
- Rental changes.
- Early settlement.
- Financing cost.

Credit cards:

- Statement balance.
- Current balance.
- Minimum payment.
- Utilization.
- Grace period.
- Finance charges.
- Cash advance.
- Late fees.

## 19.3 Content Rules

- Plain language.
- Arabic-first quality, not literal machine translation.
- Examples in JOD.
- Product-specific.
- Reviewed for accuracy.
- Versioned.
- Linked to glossary terms.
- Never personalized beyond the available evidence.

---

# 20. Authentication, Consent, and Account Lifecycle

## 20.1 Authentication

Potential capabilities:

- Email/password.
- Phone OTP.
- Email verification.
- Password reset.
- Session invalidation.
- Device/session management.
- Optional biometric unlock.
- Optional passkeys if selected by architecture review.

## 20.2 Consent

Separate, auditable consent for:

- Terms of service.
- Privacy policy.
- Financial-information disclaimer.
- Credit-bureau access.
- Open Banking access.
- Marketing, optional.
- Analytics, depending on jurisdiction and implementation.

Consent must be:

- Versioned.
- Timestamped.
- Revocable where applicable.
- Specific.
- Understandable.
- Re-requested when scope materially changes.

## 20.3 Account Lifecycle

- Sign up.
- Verification.
- Sign in.
- Sign out.
- Password recovery.
- Re-authentication for sensitive actions.
- Export.
- Revoke connections.
- Delete account.
- Retention/erasure workflow.
- Audit event creation.

---

# 21. Data Model — Conceptual

The final architect must produce the exact schema. At minimum, the domain must account for:

- User.
- User profile.
- Device/session.
- Consent record.
- Financial institution.
- Data connection.
- Data provider.
- Sync run.
- Raw provider payload reference or normalized import record.
- Obligation.
- Obligation subtype/details.
- Contract terms.
- Rate/profit-rate period.
- Installment schedule.
- Payment.
- Statement.
- Credit-card account.
- Transaction where in scope.
- Calculation run.
- Calculation input snapshot.
- Calculation result.
- Insight.
- Notification.
- Education content.
- User preference.
- Audit event.
- Currency.
- Data provenance.

## 21.1 Domain Modeling Requirement

Avoid one giant “loans” table containing unrelated nullable fields. The architecture must compare:

- Single-table inheritance.
- Class-table inheritance.
- Aggregate with subtype detail records.
- Polymorphic domain model.
- Event-sourced or snapshot approaches where justified.

Choose the simplest model that preserves correctness and extensibility.

---

# 22. Financial Calculation Standards

## 22.1 General

- Use decimal arithmetic, never binary floating point for money.
- JOD presentation normally requires three decimal places.
- Store rates with sufficient precision.
- Define rounding at every stage.
- Preserve raw values from authoritative sources.
- Version formulas.
- Store calculation timestamp and input snapshot.
- Make results reproducible.
- Attach provenance and confidence.
- Build independent test vectors.

## 22.2 Calculation Categories

- Standard amortization.
- Remaining balance.
- Principal/interest split.
- Variable-rate schedule.
- Residual/balloon projection.
- Extra-payment scenarios.
- Early settlement estimate.
- Credit-card payoff.
- Utilization.
- Aggregate monthly obligation.
- Aggregate outstanding balance.
- Delinquency status.

## 22.3 Unknowns

The calculation engine must explicitly handle:

- Unknown payment allocation.
- Unknown fees.
- Missing rate history.
- Mismatched statement values.
- Irregular schedules.
- Grace periods.
- Payment holidays.
- Late charges.
- Repricing frequency.
- Islamic contract differences.

When confidence is insufficient, show a limited view instead of false precision.

---

# 23. Status Model

A robust status model should distinguish at least:

- On track.
- Due soon.
- Paid.
- Overdue.
- Delinquent.
- Data stale.
- Connection issue.
- Calculation incomplete.
- Attention required.
- Closed/completed.
- Unknown.

Status must be derived centrally, not recreated in every screen.

---

# 24. UX and Visual Direction

## 24.1 Design Personality

**Calm clarity.**

The app should feel like a steady financial companion with a calculator, not a lender, collection agency, or trading application.

## 24.2 Visual Principles

- Strong hierarchy.
- Limited color semantics.
- Soft caution instead of panic.
- Positive states used meaningfully.
- Generous spacing.
- Clear decimal formatting.
- Accessible contrast.
- Charts only when they improve comprehension.
- One primary CTA per screen.
- Skeleton/loading states.
- No fake precision.
- Consistent source/freshness labels.

## 24.3 Localization

- Arabic and English.
- Complete RTL support.
- Locale-aware dates and numbers.
- JOD three-decimal display.
- Content designed for Arabic, not translated as an afterthought.
- Avoid text embedded in images.
- Support long labels and dynamic font scaling.

## 24.4 Accessibility

- Screen-reader semantics.
- Dynamic text.
- Sufficient target sizes.
- Contrast compliance.
- No meaning conveyed by color alone.
- Reduced-motion support.
- Accessible charts and summaries.
- Clear error messages.

---

# 25. Technical Quality Expectations

Talal is the sole implementation developer and is experienced in web development but new to mobile development. AI agents will perform much of the implementation. Therefore, the generated system must be easy to reason about, hard to misuse, and heavily documented.

The chosen architecture must support:

- Cross-platform mobile development.
- Feature-first organization.
- Explicit dependency direction.
- Clear domain boundaries.
- Reusable design-system components.
- Separation of UI, state, domain logic, and infrastructure.
- Dependency injection.
- Strong typing.
- Immutable data where useful.
- Central error model.
- Central navigation model.
- Central financial calculation package/module.
- Testability without network or UI.
- Replaceable mock and real data providers.
- Local development with seeded demo data.
- Automated formatting, linting, and testing.
- CI from the beginning.
- Environment separation.
- Secrets management.
- Observability.
- Secure local storage.
- Offline/read-cache strategy.
- Migration discipline.
- Architecture Decision Records.

Do not over-engineer a hackathon prototype with distributed services or abstractions that have no plausible value. The goal is **production-minded modularity**, not ceremonial complexity.

---

# 26. OOP, SOLID, and Clean-Code Expectations

These are goals, not excuses to create excessive classes.

## 26.1 Apply

- Single Responsibility.
- Open/Closed when real extension points exist.
- Liskov Substitution for actual polymorphism.
- Interface Segregation.
- Dependency Inversion.
- Encapsulation.
- Composition over inheritance.
- High cohesion.
- Low coupling.
- Explicit contracts.
- Domain value objects for money, rate, date range, and identifiers where useful.

## 26.2 Avoid

- God classes.
- God services.
- An interface for every class without need.
- Deep inheritance.
- Generic “utils” dumping grounds.
- Business logic in widgets/views.
- Network calls from UI.
- Database entities used directly as UI models.
- Duplicated mappers and formatters.
- Stringly typed states.
- Magic numbers.
- Unbounded global state.
- Premature microservices.
- Repository layers that add no abstraction.
- Patterns copied only for appearance.

## 26.3 Code Review Standard

Every feature must be understandable by another senior engineer without reading the entire repository.

---

# 27. Security and Privacy Requirements

The final architecture must threat-model:

- Account takeover.
- Token theft.
- Insecure device storage.
- Sensitive data in logs.
- API key exposure.
- Broken object-level authorization.
- Row-level access failures.
- Consent bypass.
- Replay attacks.
- Malicious provider payloads.
- Injection.
- Insecure deep links.
- Notification leakage.
- Screenshot/app-switcher leakage where relevant.
- Debug builds using production data.
- Excessive analytics.
- Unauthorized exports.
- Account deletion failures.

Required practices:

- TLS.
- Secure token storage.
- Least privilege.
- Backend validation.
- Authorization independent of UI.
- Secret separation.
- Environment isolation.
- Audit logging for sensitive operations.
- Redacted logs.
- Dependency scanning.
- Static analysis.
- Rate limiting where applicable.
- Secure error messages.
- Data minimization.
- Clear retention policy.
- RLS or equivalent when using a shared backend database.
- No provider secrets embedded in the app.

---

# 28. Offline, Caching, and Synchronization

The app should provide useful read access when temporarily offline, while clearly showing freshness.

The architect must define:

- What is cached.
- What is encrypted locally.
- Cache lifetime.
- Sync triggers.
- Conflict strategy.
- Idempotency.
- Retry policy.
- Duplicate detection.
- Background restrictions on iOS/Android.
- Offline mutation queue if needed.
- Last successful sync.
- Partial failure behavior.
- Manual refresh.
- Provider throttling.

Financial data must never silently merge conflicting values.

---

# 29. Error Model

Errors should be categorized, structured, and mapped to user-safe messages.

Candidate categories:

- Validation.
- Authentication.
- Authorization.
- Consent.
- Connectivity.
- Provider unavailable.
- Rate limited.
- Data conflict.
- Data incomplete.
- Calculation unsupported.
- Calculation failed.
- Local storage.
- Synchronization.
- Unknown.

Each error definition should include:

- Internal code.
- User message.
- Retryability.
- Logging severity.
- Safe metadata.
- Recovery action.
- Analytics policy.

---

# 30. Analytics and Observability

## 30.1 Product Analytics

Track behavior without collecting unnecessary sensitive financial details.

Candidate events:

- Onboarding completed.
- Obligation added.
- Connection started/completed/failed.
- Dashboard viewed.
- Insight opened.
- Scenario run.
- Notification opened.
- Education item viewed.
- Data refreshed.
- Calculation explanation opened.

Avoid recording exact balances or contract details in general analytics unless explicitly justified and protected.

## 30.2 Engineering Observability

- Crash reporting.
- Structured logs.
- Network/provider health.
- Sync success/failure.
- Calculation failure rate.
- App-start performance.
- Screen performance.
- Backend latency.
- Alerting.
- Release/version correlation.

---

# 31. Testing Expectations

The generated plan must include:

## 31.1 Unit Tests

- Domain entities and value objects.
- Financial formulas.
- Status derivation.
- Mappers.
- Validation.
- Use cases.
- Error mapping.

## 31.2 Property / Invariant Tests

Examples:

- Outstanding principal cannot become negative without a defined overpayment state.
- Sum of principal and interest allocations equals payment within rounding tolerance.
- Higher payment should not increase payoff duration under identical assumptions.
- A zero rate should produce zero interest.
- Calculation reruns with identical inputs produce identical outputs.

## 31.3 Integration Tests

- Repository/provider behavior.
- Local cache.
- Sync.
- Auth.
- Database authorization.
- Mock/real provider replacement.
- Notifications.

## 31.4 UI Tests

- Critical onboarding.
- Add obligation.
- View dashboard.
- Run scenario.
- Handle error.
- RTL layout.
- Accessibility.

## 31.5 Golden/Snapshot Tests

Use selectively for design-system components and high-value screens if supported by the chosen stack.

## 31.6 Financial Validation

Create known test cases reviewed by the accounting/finance team members and, when possible, compare with bank schedules.

---

# 32. Hackathon MVP

The final architect should refine this scope, but the MVP should demonstrate the core value convincingly without fake integrations.

## 32.1 Must Demonstrate

- Bilingual mobile app foundation.
- Clean onboarding.
- Demo user and seeded obligations.
- Unified obligations dashboard.
- At least one conventional variable-rate loan.
- Rate-change timeline.
- Recalculated projection.
- Balloon/residual warning.
- Scenario showing how adjusted payment changes the projection.
- Clear calculation explanation.
- Payment history.
- Credit-card view or second obligation type if time permits.
- Local/mock provider abstraction that can later be replaced.
- High-quality architecture, tests for core calculations, and polished primary flows.

## 32.2 Should Demonstrate

- Islamic-financing terminology and one supported model, only if calculations are trustworthy.
- Notifications.
- Data-source freshness.
- Error/empty states.
- Secure authentication or a clear demo-mode boundary.
- Analytics and crash reporting setup.

## 32.3 Explicit Mocking

Every mocked integration must be labeled in code and demo documentation. Never imply live CRIF/Open Banking access when not present.

## 32.4 Stretch Goals

- Real sandbox integration.
- OCR-assisted statement import, only with privacy safeguards and validation.
- Multiple scenario comparison.
- Credit-card payoff engine.
- Exportable summary.
- Advisor/bank discussion checklist.
- Remote content management for education.

---

# 33. Team Context

## 33.1 Talal Jaber

- Computer Engineering.
- Sole implementation developer.
- Strong web-development and AI-assisted building experience.
- No previous mobile-development experience.
- Responsible for technical development, integration, architecture execution, and demo stability.

## 33.2 Other Team Members

The team includes members contributing in areas such as:

- International accounting.
- Financial modeling.
- Product design.
- Business model.
- Logistics.
- Validation.
- User and market feedback.

The architecture and workflow should let non-developer members validate calculations, language, product assumptions, and demo content without editing core application code.

Recommended artifacts include calculation test-case sheets, screen acceptance criteria, and a decision log that team members can review.

---

# 34. Decisions Fable Must Make

These are deliberately not fixed here. Fable must evaluate and choose:

- Flutter versus React Native/Expo versus another credible cross-platform option.
- State-management approach.
- Navigation library.
- Dependency-injection approach.
- Local database/cache.
- Backend platform and deployment.
- Authentication approach.
- API style.
- Monorepo or separated repositories.
- Domain/package/module boundaries.
- Data modeling pattern for obligation subtypes.
- Offline strategy.
- Mapping between domain, persistence, provider, and presentation models.
- Testing libraries.
- CI/CD platform.
- Observability services.
- Feature-flag strategy.
- Localization implementation.
- Design-system approach.
- Calculation-engine packaging.
- Demo-data and mock-provider architecture.

Every material choice requires alternatives, tradeoffs, decision, consequences, and reversal cost.

---

# 35. Non-Negotiable Engineering Constraints

1. One cross-platform codebase unless a compelling reason is documented.
2. Mobile app must support Android and iOS architecture, even if only Android APK is delivered at the hackathon.
3. Arabic and English with RTL from the foundation.
4. Financial values use decimal-safe arithmetic.
5. Business calculations are outside UI.
6. Mock providers and real providers share explicit contracts.
7. No secrets in client code.
8. Authorization is enforced server-side.
9. Components are built from a reusable design system.
10. Feature boundaries are explicit.
11. Core calculations have automated tests.
12. Data provenance is represented.
13. Official values and estimates are visibly distinguished.
14. The app never claims to alter contracts or guarantee outcomes.
15. No silent architecture changes by implementation agents.
16. Material decisions are documented as ADRs.
17. The project must run locally using documented setup and seed data.
18. CI must enforce format, lint, and tests.
19. AI-generated code must be reviewed against the architecture rules.
20. The implementation should be clean enough to continue after the hackathon.

---

# 36. Open Questions Requiring Validation

- Exact Rally Hackathon judging criteria and technical restrictions.
- Availability of CRIF sandbox/API access.
- Availability and scope of Open Banking sandbox access.
- Legal/regulatory boundaries in Jordan.
- Exact conventional-loan formulas used by target institutions.
- Day-count and repricing conventions.
- Which Islamic contract types can be modeled accurately within the event.
- Whether authentication is required for judging or demo mode is preferable.
- Whether the primary problem should be broad obligation visibility or specifically variable-rate surprise/balloon prevention.
- Which user segment judges find most compelling.
- What data can realistically be obtained during the hackathon.
- Whether payment initiation is out of scope.
- Brand identity and visual assets.
- Final Arabic product language.
- Privacy and retention requirements for production.
- How users verify manually entered values.
- How confidence is communicated.
- Whether “smart repayment tips” should be rules-based, AI-assisted, or deferred.

Fable must convert these into a research and decision backlog, not silently assume answers.

---

# 37. Known Tensions to Resolve

## 37.1 Broad Platform vs Sharp MVP

The broader concept covers all obligations, but the strongest demo story may be rate-change and balloon transparency. The architecture should support breadth while the MVP communicates one sharp promise.

## 37.2 Live Aggregation vs Manual/Demo Data

The vision includes CRIF and Open Banking, but access may be unavailable. Provider abstraction and honest demo labeling are essential.

## 37.3 Adaptive Terminology vs Correct Islamic Modeling

Simple word replacement is not enough. Support must be contract-aware or deliberately limited.

## 37.4 Senior Architecture vs Hackathon Speed

Use strong boundaries and automation, but avoid unnecessary enterprise complexity.

## 37.5 AI Automation vs Engineering Control

AI may write much of the code, but documented architecture, tests, linters, and review gates must control it.

---

# 38. Success Metrics

## 38.1 Hackathon Success

- Judges understand the problem in under one minute.
- The demo completes reliably.
- The rate-change-to-impact flow is memorable.
- Calculations can be explained and defended.
- The team is honest about mock/live data.
- The codebase demonstrates professional structure.
- Talal can continue implementation after the event.

## 38.2 Product Metrics

Potential future metrics:

- Activation: first obligation successfully added.
- Time to first clarity: time until user sees a meaningful dashboard.
- Connected/active obligations per user.
- Monthly active borrowers.
- Payment reminder engagement.
- Scenario-planner usage.
- Data sync success.
- Insight comprehension.
- Reduction in unexpected residual-balance cases, if measurable.
- Retention around statement/payment cycles.
- Trust and clarity survey score.

---

# 39. Required Documentation Output From Fable

Fable must turn this brief into an implementation-ready knowledge base. At minimum:

1. Executive product specification.
2. Assumptions and validation backlog.
3. Functional requirements.
4. Non-functional requirements.
5. Personas and jobs-to-be-done.
6. User stories and acceptance criteria.
7. End-to-end user journeys.
8. Information architecture.
9. Navigation specification.
10. Screen inventory and state matrix.
11. Design-system specification.
12. Domain model.
13. Financial calculation specification.
14. System architecture.
15. Chosen tech stack and ADRs.
16. Repository/folder structure.
17. State-management architecture.
18. Backend/API specification.
19. Database schema and ERD.
20. Security and privacy model.
21. Consent model.
22. Provider-integration abstraction.
23. Offline/sync design.
24. Notification design.
25. Error taxonomy.
26. Analytics and observability plan.
27. Testing strategy and test vectors.
28. CI/CD and environment strategy.
29. MVP scope and phased roadmap.
30. Implementation sequence.
31. Definition of done.
32. AI coding-agent rules.
33. Risk register.
34. Demo architecture and fallback plan.
35. Open questions and decisions requiring the human team.

---

# 40. Final Product Standard

Eltizamati should not be a visually impressive shell around unverified calculations, nor an over-engineered architecture that never reaches a working demo.

The target is a trustworthy, explainable fintech mobile product with:

- A sharp user problem.
- A polished core journey.
- Correct and testable financial logic.
- Honest data boundaries.
- Clean modular architecture.
- Strong privacy and security foundations.
- Clear documentation.
- A codebase that a new senior engineer or AI agent can understand and extend.
