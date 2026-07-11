/**
 * BR-OBL-003: assetCost + disclosedProfit = totalSalePrice, within the named
 * CONV-5 rounding tolerance (financial-calculation-spec.md §2) — never an
 * arbitrary tolerance. Violation is a data error surfaced to the user, never
 * auto-corrected (domain-model.md §5).
 */
import { err, ok, makeError, type Result, type AppError } from '../errors/app-error.js'
import type { MurabahaDetails } from '../entities/obligation.js'
import { conv5PerPeriodTolerance } from '../constants.js'

export function validateMurabahaFinancing(details: MurabahaDetails): Result<void, AppError> {
  const { assetCost, disclosedProfit, totalSalePrice } = details
  const currency = totalSalePrice.value.currency
  const computed = assetCost.value.add(disclosedProfit.value)
  const difference = computed.subtract(totalSalePrice.value).abs()
  const tolerance = conv5PerPeriodTolerance(currency)

  if (difference.isGreaterThan(tolerance)) {
    return err(
      makeError('validation', {
        safeMetadata: {
          field: 'totalSalePrice',
          reason: 'BR-OBL-003',
        },
        recoveryHint:
          'assetCost + disclosedProfit must equal totalSalePrice (within CONV-5 tolerance) — check the contract figures, this is a data error, not something to auto-correct.',
      }),
    )
  }

  return ok(undefined)
}
