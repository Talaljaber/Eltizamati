/**
 * Loads a vector family JSON file from `packages/finance-engine/vectors/`.
 *
 * Vectors live outside `src/` (calculation-test-vectors.md: "readable/editable
 * without touching code") — loaded via `node:fs` at test runtime rather than
 * a static TS import, since a static import would fall outside `rootDir`
 * (`./src`) and fail the package's `tsc --build`.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VECTORS_DIR = path.resolve(HERE, '../../vectors')

export interface RawVector {
  readonly id: string
  readonly formulaId: string
  readonly version: number
  readonly description: string
  readonly inputs: Readonly<Record<string, unknown>>
  readonly asOf: string
  readonly expected: unknown
  readonly tolerance: string
  readonly source: 'analytical' | 'finance-team' | 'bank-schedule'
  readonly reviewedBy: string | null
}

export function loadVectorFamily(fileName: string): readonly RawVector[] {
  const fullPath = path.join(VECTORS_DIR, fileName)
  const raw = readFileSync(fullPath, 'utf-8')
  return JSON.parse(raw) as readonly RawVector[]
}

export function isPendingFinance(vector: RawVector): boolean {
  return vector.expected === 'PENDING-FINANCE'
}
