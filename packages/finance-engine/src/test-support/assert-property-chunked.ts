import fc from 'fast-check'

/**
 * Runs `fc.assert` in chunks of `chunkSize` runs, yielding to the event loop
 * between chunks, instead of one continuous `numRuns`-sized synchronous call.
 *
 * A single uninterrupted `fc.assert` call over ~1000 generator iterations can
 * run synchronously for 40-65s. Vitest's worker⇄main "onTaskUpdate" heartbeat
 * (birpc, 60s default) can then time out because the worker thread never gets
 * a chance to process it — even though every property assertion passes. This
 * preserves the full `numRuns` count (same total coverage, same fixed seed
 * per chunk) while keeping any single synchronous stretch short.
 */
export async function assertPropertyChunked<Ts extends unknown[]>(
  property: fc.IProperty<Ts>,
  options: { seed: number; numRuns: number; endOnFailure?: boolean },
  chunkSize = 100,
): Promise<void> {
  const { seed, numRuns, endOnFailure = false } = options
  let remaining = numRuns
  let chunkIndex = 0

  while (remaining > 0) {
    const runs = Math.min(chunkSize, remaining)
    fc.assert(property, { seed: seed + chunkIndex, numRuns: runs, endOnFailure })
    remaining -= runs
    chunkIndex += 1
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
}
