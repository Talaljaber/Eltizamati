import { useQuery } from '@tanstack/react-query'
import { View, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sheet, Text, FieldRow, ProvenanceBadge, space, useTheme } from '@/core/design-system'
import { useRepositories } from '@/features/repositories/hooks/use-repositories'
import type { Id } from '@eltizamati/domain'

export interface ExplainSheetProps {
  visible: boolean
  onClose: () => void
  obligationId: Id<'obligation'> | undefined
  formulaId: string | undefined
}

export function ExplainSheet({ visible, onClose, obligationId, formulaId }: ExplainSheetProps) {
  const { t } = useTranslation()
  const repos = useRepositories()
  const theme = useTheme()

  const {
    data: run,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['calculationRun', obligationId, formulaId],
    queryFn: async () => {
      if (formulaId === undefined) return null
      const res = await repos.calculationRunRepository.latestFor(obligationId, formulaId)
      if (!res.ok) throw res.error
      return res.value ?? null
    },
    enabled: obligationId !== undefined && formulaId !== undefined,
  })

  return (
    <Sheet visible={visible} onClose={onClose} title={t('explain.title', 'Calculation Details')}>
      {isLoading && <Text variant="body">{t('common.loading', 'Loading...')}</Text>}
      {isError && (
        <Text variant="body" color="critical">
          {t('explain.error', 'Unable to load calculation details.')}
        </Text>
      )}
      {!isLoading && run && (
        <ScrollView style={styles.scroll}>
          <View style={styles.sectionTitle}>
            <Text variant="heading">{t('explain.provenance', 'Provenance')}</Text>
          </View>
          <FieldRow label={t('explain.formula', 'Formula')} value={run.formulaId} />
          <FieldRow label={t('explain.version', 'Version')} value={`v${run.formulaVersion}`} />
          <FieldRow label={t('explain.asOf', 'As of')} value={run.asOf} />
          <FieldRow label={t('explain.calculatedAt', 'Calculated at')} value={run.calculatedAt} />
          <FieldRow
            label={t('explain.source', 'Source')}
            value={
              <ProvenanceBadge
                source={
                  run.outcome.kind === 'result' && run.outcome.confidence === 'official'
                    ? 'official'
                    : 'estimate'
                }
              />
            }
          />
          {run.outcome.kind === 'result' && (
            <FieldRow
              label={t('explain.confidence', 'Confidence')}
              value={
                run.outcome.confidence === 'official'
                  ? t('explain.confidenceHigh', 'High (Deterministic)')
                  : t('explain.confidenceEstimate', 'Estimate')
              }
            />
          )}

          <View style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            <Text variant="heading">{t('explain.assumptions', 'Assumptions')}</Text>
          </View>
          {run.assumptions.length === 0 ? (
            <Text variant="body" color="secondary">
              {t('explain.noAssumptions', 'No derived assumptions. Exact calculation.')}
            </Text>
          ) : (
            run.assumptions.map((assumption: string, idx: number) => (
              <View key={idx} style={styles.assumptionRow}>
                <Text variant="body">• {assumption}</Text>
              </View>
            ))
          )}

          <View style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            <Text variant="heading">{t('explain.inputs', 'Snapshot Inputs')}</Text>
          </View>
          <View
            style={[
              styles.codeBox,
              { backgroundColor: theme.bgElevated, borderColor: theme.border },
            ]}
          >
            <Text variant="bodySmall">{JSON.stringify(run.inputsSnapshot, null, 2)}</Text>
          </View>
        </ScrollView>
      )}
      {!isLoading && !isError && !run && obligationId !== undefined && formulaId !== undefined && (
        <Text variant="body" color="critical">
          {t('explain.notFound', 'Calculation record not found.')}
        </Text>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 400,
  },
  sectionTitle: {
    marginBottom: space[2],
  },
  sectionTitleSpaced: {
    marginTop: space[4],
  },
  assumptionRow: {
    marginBottom: space[2],
  },
  codeBox: {
    padding: space[2],
    borderRadius: 4,
    borderWidth: 1,
  },
})
