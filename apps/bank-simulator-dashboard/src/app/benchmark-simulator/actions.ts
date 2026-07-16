'use server'

import { redirect } from 'next/navigation'
import { DomainInvariantError } from '@eltizamati/domain'
import { recordBenchmarkSimulation } from '@/server/repositories/demo-benchmark-repository'
import { recordActivity } from '@/server/repositories/demo-activity-repository'

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.length === 0) {
    throw new DomainInvariantError(
      'validation',
      `benchmark-simulator record action: missing required field "${key}"`,
    )
  }
  return value
}

export async function recordBenchmarkSimulationAction(formData: FormData): Promise<void> {
  const benchmarkName = requiredString(formData, 'benchmarkName')
  const previousRateInput = requiredString(formData, 'previousRate')
  const newRateInput = requiredString(formData, 'newRate')
  const announcementDate = requiredString(formData, 'announcementDate')
  const effectiveDate = requiredString(formData, 'effectiveDate')
  const explanation = formData.get('explanation')

  const result = await recordBenchmarkSimulation({
    benchmarkName,
    previousRatePercent: previousRateInput,
    newRatePercent: newRateInput,
    announcementDate,
    effectiveDate,
    explanation: typeof explanation === 'string' && explanation.length > 0 ? explanation : undefined,
  })

  if (!result.ok) {
    await recordActivity('operation_failed', `Benchmark simulation record failed (${result.error.code})`)
    redirect(`/benchmark-simulator?recordError=couldNotSave`)
  }

  await recordActivity(
    'campaign_created',
    `Simulated benchmark change recorded: ${benchmarkName} (${previousRateInput}% → ${newRateInput}%). No contract was updated.`,
  )

  redirect(`/benchmark-simulator?recorded=${result.value.id}`)
}
