# Data Provenance & Freshness Model

**Why this exists:** the product's trust promise is that users always know whether a number is official, theirs, or ours (C-04, PRIN-2). Provenance is a first-class value attached to fields — not UI copy.

## 1. `Provenance` value object

```ts
type Provenance = {
  source: SourceClass;            // see §2
  providerId?: string;            // 'demo-seed' | 'manual' | 'crif' | 'openbanking:<bank>' (P1)
  observedAt: string;             // ISO datetime: when the value was true per the source
  recordedAt: string;             // when we stored it
  sourceReference?: string;       // statement id, sync-run id, seed version (P1 fills)
};
```

`Sourced<T> = { value: T; provenance: Provenance }` wraps material fields (balances, rates, installments, limits). Derived values carry provenance indirectly through their `CalculationRun` (inputs' provenance visible in SCR-EXPLAIN).

## 2. Source classes & display mapping (BR-PROV-002)

| SourceClass | Meaning | Badge (TERM) | Display precision |
|-------------|---------|--------------|-------------------|
| `official` | Direct from lender/Open Banking (P1) | Official figure (TERM-028) | 3 dp |
| `bureau` | Credit bureau (P1) | "As reported {date}" — **never** "current" (CON-07 / BR-PROV-003) | 3 dp + as-of date mandatory |
| `userEntered` | Manual entry / user confirmation | Your entry (TERM-026 variant) | 3 dp |
| `estimate` | Engine-derived | Estimate (TERM-027) | ≈ + rounded (BR-CALC-014) |
| `demo` | Seed data | Demo | styled as official but under demo banner |

## 3. Business rules

| ID | Rule |
|----|------|
| BR-PROV-001 | **Field-level source priority** (formalizing SRC-1 §9.4): `official` > `bureau` > `userEntered` > `estimate`. Conflict handling: a lower-priority value never silently overwrites a higher-priority one; conflicts above tolerance (CONV-5) raise a `dataConflict` state for user resolution (SRC-1 §28: no silent merges). A *newer* lower-priority value may be shown alongside ("your entry differs from the bank's last figure"). |
| BR-PROV-002 | Every material displayed figure renders its source class (design-system `Amount` makes this unskippable). |
| BR-PROV-003 | Freshness classes: `official` stale after 7 days (P1 sync), `bureau` always displayed with as-of date, `userEntered` stale after 90 days (gentle "still accurate?" prompt), `estimate` recomputed on input change (never cached stale). Stale ⇒ `dataStale` status eligibility. |
| BR-PROV-004 | Aggregates mixing source classes are labeled `includes estimates`. |
| BR-PROV-005 | Values excluded from an aggregate (missing/unknown) are counted and named in the UI — exclusion is visible, never silent. |
| BR-PROV-006 | Provenance is immutable history: corrections append (supersede), never mutate (aligns with BR-RATE-001). |

## 4. Provider-to-provenance mapping (MVP)

- `DemoSeedProvider` stamps `source: 'demo'`, `providerId: 'demo-seed'`, `sourceReference: seed version` — so even demo data exercises the full provenance pipeline (the point is architectural honesty, C-07).
- `ManualEntryProvider` stamps `userEntered` with entry timestamps.
- P1 providers (CRIF/Open Banking sandbox) plug into the same `Sourced<T>` shapes — contracts in `docs/05-data-api/api-and-providers.md`.

## 5. UX surfacing (traces)
Badges: US-009/SCR components · explanation view shows inputs' provenance table (FR-CALC-001) · data-source status screen (FR-DATA-003) shows per-provider freshness · dashboard freshness footer (SCR-HOME ⑥).
