import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, Card, FieldRow, ProgressBar, SectionHeader, space } from '@/core/design-system'
import { ExplainSheet } from '@/features/explain/components/ExplainSheet'
import type { Id, MurabahaFinancing } from '@eltizamati/domain'
import type { MurabahaProgressModel } from '../hooks/use-murabaha-detail-view-model'

const PROGRESS_FORMULA_ID = 'murabahaProgress'

export interface MurabahaDetailSectionProps {
  obligationId: Id<'obligation'>
  obligation: MurabahaFinancing
  progress?: MurabahaProgressModel
}

export function MurabahaDetailSection({
  obligationId,
  obligation,
  progress,
}: MurabahaDetailSectionProps) {
  const { t } = useTranslation()
  const [explainVisible, setExplainVisible] = useState(false)
  const details = obligation.murabahaDetails

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.title}>
          <Text variant="heading">{t('obligationDetail.murabahaSection')}</Text>
        </View>
        <FieldRow
          label={t('obligationDetail.totalSalePrice')}
          value={details.totalSalePrice.value.toStorageString()}
        />
        <FieldRow
          label={t('obligationDetail.assetCost')}
          value={details.assetCost.value.toStorageString()}
        />
        <FieldRow
          label={t('obligationDetail.disclosedProfit')}
          value={details.disclosedProfit.value.toStorageString()}
        />
        <FieldRow
          label={t('obligationDetail.installment')}
          value={details.installment.value.toStorageString()}
        />
        <FieldRow
          label={t('obligationDetail.term')}
          value={t('obligationDetail.termMonths', { months: details.termMonths.value })}
        />

        <View style={styles.progressSection}>
          <FieldRow
            label={t('murabahaDetail.outstandingFinancing')}
            value={progress?.outstanding ?? t('common.unknown')}
          />
          {progress && (
            <>
              <ProgressBar progress={progress.progressPercent / 100} />
              <View style={styles.progressMeta}>
                <Text variant="bodySmall" color="secondary">
                  {t('murabahaDetail.progressLabel', {
                    percent: progress.progressPercent.toFixed(1),
                  })}
                </Text>
                <TouchableOpacity onPress={() => setExplainVisible(true)}>
                  <Text variant="bodySmall" color="primary">
                    {t('common.explain')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Card>

      <View style={styles.educationBlock}>
        <SectionHeader title={t('murabahaDetail.earlySettlementTitle')} />
        <Text variant="body" color="secondary">
          {t('murabahaDetail.earlySettlementBody')}
        </Text>
      </View>

      <ExplainSheet
        visible={explainVisible}
        onClose={() => setExplainVisible(false)}
        obligationId={obligationId}
        formulaId={PROGRESS_FORMULA_ID}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: space[4],
  },
  title: {
    marginBottom: space[4],
  },
  progressSection: {
    marginTop: space[4],
    gap: space[2],
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  educationBlock: {
    gap: space[2],
  },
})
