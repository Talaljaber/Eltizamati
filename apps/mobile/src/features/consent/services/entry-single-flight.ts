import type { AppError, Result } from '@eltizamati/domain'

let entryInFlight: Promise<Result<boolean, AppError>> | undefined

export function runEntryExclusive(
  operation: () => Promise<Result<boolean, AppError>>,
): Promise<Result<boolean, AppError>> {
  if (entryInFlight !== undefined) return entryInFlight
  entryInFlight = operation().finally(() => {
    entryInFlight = undefined
  })
  return entryInFlight
}

export function __resetEntrySingleFlightForTest(): void {
  entryInFlight = undefined
}
