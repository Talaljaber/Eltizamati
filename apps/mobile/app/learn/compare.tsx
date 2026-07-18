import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import {
  Screen,
  Text,
  Card,
  SectionHeader,
  SegmentedControl,
  InlineState,
  useTheme,
  space,
  radius,
} from '@/core/design-system'
import {
  FINANCING_PRODUCTS,
  FINANCIAL_INSTITUTIONS,
} from '@/features/learn/model/catalogue-snapshot'
import { comparePublishedProducts } from '@/features/learn/model/comparison-service'
import type { FinancingProduct } from '@/features/learn/model/catalogue'

const INSTITUTIONS_BY_ID = new Map(FINANCIAL_INSTITUTIONS.map((i) => [i.id, i]))

function productName(product: FinancingProduct, isArabic: boolean): string {
  if (isArabic && product.nameAr !== null) return product.nameAr
  return product.nameEn
}

function institutionName(institutionId: string, isArabic: boolean): string | undefined {
  const institution = INSTITUTIONS_BY_ID.get(institutionId)
  if (!institution) return undefined
  if (isArabic && institution.nameAr !== null) return institution.nameAr
  return institution.nameEn
}

export default function LearnCompareScreen() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const isArabic = i18n.language.startsWith('ar')
  const [purpose, setPurpose] = useState<'housing' | 'personal'>('housing')
  const results = comparePublishedProducts(FINANCING_PRODUCTS, {
    purpose,
    structurePreference: 'either',
    salaryTransferPreference: 'no-preference',
    priorities: ['clearer-published-terms'],
  })

  return (
    <Screen gap={5}>
      <Stack.Screen options={{ title: t('learn.compareTitle') }} />
      <Text variant="title">{t('learn.compareTitle')}</Text>
      <Text variant="body" color="secondary">
        {t('learn.compareIntro')}
      </Text>

      <SegmentedControl
        options={[
          { value: 'housing', label: t('learn.purposeHousing') },
          { value: 'personal', label: t('learn.purposePersonal') },
        ]}
        value={purpose}
        onChange={(value) => setPurpose(value as 'housing' | 'personal')}
      />

      <SectionHeader title={t('learn.showMatches')} />
      {results.length === 0 ? (
        <InlineState kind="empty" message={t('learn.noMatches')} />
      ) : (
        <View style={styles.resultList}>
          {results.map((result) => {
            const product = result.product
            const rate = product.pricing.minimumAnnualRate
            const institution = institutionName(product.institutionId, isArabic)
            const isComplete = product.completeness === 'complete-published-fields'
            return (
              <Card key={product.id}>
                <Text variant="heading">{productName(product, isArabic)}</Text>
                {institution !== undefined ? (
                  <Text variant="bodySmall" color="secondary">
                    {institution}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text variant="bodySmall" color="secondary">
                    {t(`learn.pricingKind.${camelizePricingKind(product.pricing.kind)}`)}
                  </Text>
                  {rate !== null ? (
                    <Text variant="bodySmall" color="secondary">
                      {t('learn.fromRate', { rate: rate.toPercent().toFixed(2) })}
                    </Text>
                  ) : null}
                  {product.termMonths.maximum !== null ? (
                    <Text variant="bodySmall" color="secondary">
                      {t('learn.upToMonths', { months: product.termMonths.maximum })}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.completenessBadge,
                    { backgroundColor: isComplete ? theme.positiveSoft : theme.cautionSoft },
                  ]}
                >
                  <Text variant="caption" color={isComplete ? 'positive' : 'caution'}>
                    {t(
                      isComplete
                        ? 'learn.completeness.complete'
                        : `learn.completeness.${product.completeness}`,
                    )}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  {t('learn.confirm')}
                </Text>
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

function camelizePricingKind(kind: FinancingProduct['pricing']['kind']): string {
  return kind.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

const styles = StyleSheet.create({
  resultList: {
    gap: space[4],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[1],
  },
  completenessBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    marginTop: space[2],
  },
})
