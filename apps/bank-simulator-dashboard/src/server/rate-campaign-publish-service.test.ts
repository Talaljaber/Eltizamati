import { buildDemoLoan, DEMO_DATE } from '@eltizamati/demo-data'
import { ok, Rate, toLocalDate, userEntered, Money, type RatePeriod } from '@eltizamati/domain'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listObligations: vi.fn(),
  publishRateCampaign: vi.fn(),
  recordExcludedTargets: vi.fn(),
  persistCalculationRun: vi.fn(),
  raiseInsight: vi.fn(),
  recordActivity: vi.fn(),
  sendRateChangeEmail: vi.fn(),
}))

vi.mock('./allowlist', () => ({ isUserAllowlisted: () => true }))
vi.mock('./repositories/obligation-repository', () => ({
  listAllowlistedObligations: mocks.listObligations,
}))
vi.mock('./repositories/demo-campaign-repository', () => ({
  publishRateCampaign: mocks.publishRateCampaign,
  recordExcludedTargets: mocks.recordExcludedTargets,
}))
vi.mock('./repositories/calculation-run-repository', () => ({
  persistCalculationRun: mocks.persistCalculationRun,
}))
vi.mock('./repositories/insight-repository', () => ({ raiseInsight: mocks.raiseInsight }))
vi.mock('./repositories/demo-activity-repository', () => ({ recordActivity: mocks.recordActivity }))
vi.mock('./email/gateway', () => ({ sendRateChangeEmail: mocks.sendRateChangeEmail }))
vi.mock('./ids', () => ({ generateUuid: () => '10000000-0000-4000-8000-000000000001' }))

import { publishCampaign } from './rate-campaign-publish-service'

describe('publishCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.publishRateCampaign.mockResolvedValue(
      ok({ id: 'campaign-1', status: 'published', publishedAt: '2026-07-01T00:00:00Z' }),
    )
    mocks.recordExcludedTargets.mockResolvedValue(ok(undefined))
    mocks.persistCalculationRun.mockImplementation(async (run) => ok(run))
    mocks.raiseInsight.mockResolvedValue(ok(undefined))
    mocks.recordActivity.mockResolvedValue(ok(undefined))
  })

  it('reloads the loan after publication and calculates with the appended rate', async () => {
    const original = buildDemoLoan(DEMO_DATE)
    const eligibleLoan = {
      ...original,
      loanDetails: {
        ...original.loanDetails,
        outstandingBalance: userEntered(Money.of('12000', 'JOD'), `${DEMO_DATE}T00:00:00Z`),
      },
    }
    const previousPeriod = original.loanDetails.ratePeriods[1]
    expect(previousPeriod).toBeDefined()
    if (previousPeriod === undefined) return
    const publishedPeriod: RatePeriod = {
      ...previousPeriod,
      id: 'rate-published' as RatePeriod['id'],
      annualRate: Rate.fromPercent('11'),
      effectiveFrom: toLocalDate('2026-08-01'),
    }
    const refreshedLoan = {
      ...eligibleLoan,
      loanDetails: {
        ...eligibleLoan.loanDetails,
        ratePeriods: [...eligibleLoan.loanDetails.ratePeriods, publishedPeriod],
      },
    }
    mocks.listObligations
      .mockResolvedValueOnce(ok([eligibleLoan]))
      .mockResolvedValueOnce(ok([refreshedLoan]))

    const result = await publishCampaign({
      campaignName: 'Rate change',
      institutionName: original.institution.name,
      reason: undefined,
      sourceNote: undefined,
      newAnnualRate: Rate.fromPercent('11'),
      effectiveDate: toLocalDate('2026-08-01'),
      servicingPolicy: 'recalculated',
      emailNotificationEnabled: false,
      recipientEmailByUserId: new Map(),
      asOf: toLocalDate('2026-08-01'),
    })

    expect(result.ok).toBe(true)
    expect(mocks.listObligations).toHaveBeenCalledTimes(2)
    expect(mocks.publishRateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ installmentPolicy: 'unchanged' }),
    )

    const projectionRun = mocks.persistCalculationRun.mock.calls
      .map(([run]) => run)
      .find((run) => run.formulaId === 'variableProjection')
    expect(projectionRun).toBeDefined()
    expect(JSON.stringify(projectionRun.inputsSnapshot)).toContain('2026-08-01')
    expect(JSON.stringify(projectionRun.inputsSnapshot)).toContain('0.11')
    expect(JSON.stringify(projectionRun.inputsSnapshot)).toContain('unchanged')
  })
})
