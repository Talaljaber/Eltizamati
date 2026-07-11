/**
 * DemoSeedProvider — Phase 5 (ADR-0009, seed-demo-data.md §2).
 *
 * Produces the canonical demo seed. Acts as the "provider" step
 * in the import pipeline: provider → validate → map → persist → events.
 *
 * Intentionally trivial — the real logic lives in @eltizamati/demo-data.
 * This class exists so ImportService never imports builders directly and
 * so it can be swapped or mocked in tests.
 */

import { buildDemoSeed, DEMO_DATE, type DemoSeed } from '@eltizamati/demo-data'
import type { LocalDate } from '@eltizamati/domain'

export class DemoSeedProvider {
  /**
   * Returns the canonical demo seed anchored to DEMO_DATE (2026-07-01).
   * Deterministic — same output on every call.
   */
  provide(demoDate: LocalDate = DEMO_DATE): DemoSeed {
    return buildDemoSeed({ demoDate })
  }
}
