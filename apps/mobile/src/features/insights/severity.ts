import type { InsightSeverity } from '@eltizamati/domain'

/** InsightSeverity (domain) has no direct 'calm' bucket — info/positive both read as calm in the banner. */
export function toBannerSeverity(severity: InsightSeverity): 'urgent' | 'attention' | 'calm' {
  if (severity === 'urgent') return 'urgent'
  if (severity === 'attention') return 'attention'
  return 'calm'
}
