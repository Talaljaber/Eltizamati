/**
 * Finance engine — public API.
 *
 * M0: Registry scaffold only. Formula implementations land in M3.
 *
 * INVARIANTS (enforced by M3 property tests):
 *   INV-1: total paid = principal repaid + total interest over the schedule
 *   INV-2: outstanding balance decreases monotonically (conventional, on-schedule)
 *   INV-3: extra payment scenario payoff date ≤ base payoff date
 *   INV-4: residual balance = 0 for fixed-rate on-schedule loans
 *   INV-5: determinism — same inputs + asOf → same outputs (hash-verified)
 *   INV-6: confidence only downgrades through composition, never upgrades
 *   INV-7: Murabaha total paid = totalSalePrice (fixed contract)
 *
 * RULES (financial-calculation-spec.md):
 *   - Engine receives explicit asOf date — NEVER reads the system clock.
 *   - Engine is pure: no I/O, no network, no database.
 *   - All monetary computation via Money VO (AI_AGENT_RULES §5).
 *   - Formula changes require version bump + vector update + ADR note (AI_AGENT_RULES §7).
 */

// M0: exports are stubs. M3 will add formula implementations.
export type { FormulaId, FormulaVersion, CalculationConfidence } from './registry/types.js'
export { FORMULA_REGISTRY } from './registry/formula-registry.js'
