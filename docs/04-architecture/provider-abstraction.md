# Provider Abstraction & Demo-to-Real Transition

**Non-negotiables served:** replaceable providers (§35.6), honest mock labeling (C-07), no client secrets (§35.7).

## 1. Contract (in `packages/domain/src/providers/`)

```ts
interface ObligationDataProvider {
  readonly id: ProviderId;                 // 'demo-seed' | 'manual' | 'crif' | 'openbanking:<inst>'
  readonly sourceClass: SourceClass;       // maps to provenance (data-provenance.md §2)
  readonly capabilities: ProviderCapability[]; // 'obligations','payments','rates','balances','statements'
  fetchObligations(ctx): Promise<Result<ProviderObligation[], AppError>>;
  fetchPayments(ctx, obligationRef): Promise<Result<ProviderPayment[], AppError>>;
  // rate history, statements — capability-gated
}
```

- Provider DTOs (`ProviderObligation` etc.) are **not** domain types: zod-validated at the boundary (NFR-SEC-008), then mapped to domain entities with provenance stamped (BR-PROV rules). Raw payloads never flow to UI (anti-pattern).
- Providers are read acquisition; user *writes* (log payment/rate) always go through repositories directly with `userEntered` provenance — manual entry is a data source class, not literally a provider round-trip.

## 2. Implementations by phase

| Provider | Phase | Location | Notes |
|----------|-------|----------|-------|
| `DemoSeedProvider` | MVP | reads `packages/demo-data` | Versioned seed; stamps `demo` class; reset/reload via FR-SET-005 |
| `ManualEntryProvider` | MVP | wraps local repos | Exists so the data-source status screen and import pipeline treat manual data uniformly |
| `CrifSandboxProvider` | P1 (if RES-002) | **Supabase Edge Function** proxy; app calls our API only | Secrets server-side; consent gate (FR-AUTH-002) checked server-side before fetch |
| `OpenBankingProvider` | P1+ | same pattern | Per-institution config |

## 3. Import pipeline (same for all providers)

`fetch → validate (zod) → map to domain + provenance → conflict check (BR-PROV-001: never downgrade-overwrite; conflicts raised, not merged) → persist → emit events → recalc → insights`. The pipeline is one application service (`ImportService`) so CRIF later reuses exactly the path demo data exercises today — **the demo is a rehearsal of the real integration, not a fake**.

## 4. Honesty surfacing
- `SCR-DATA-STATUS` lists all registered providers with real status: demo/manual active; CRIF & Open Banking shown as *not connected — planned* (never a fake "connected" state).
- Demo banner (FR-ONB-005) driven by `dataMode: 'demo'`, set only by the demo provider path.
- Any pitch/demo material claims match this screen (SRC-1 §32.3).
