import { PhasePlaceholder } from '@/components/phase-placeholder'

export default function BankRateSimulatorPage() {
  return (
    <PhasePlaceholder
      title="Bank Rate Simulator"
      subtitle="Publish a simulated variable-rate change to eligible conventional loans; preview the unchanged-installment impact via variableProjection.v1 + residualDetection.v1 before publishing."
      plannedIn="Phase 3 (impact preview) and Phase 4 (publish flow)"
    />
  )
}
