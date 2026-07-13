import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, Stack } from 'expo-router'
import { Screen, Text, SectionHeader, space } from '@/core/design-system'
import { EDUCATION_TOPICS } from '@/content/education-topics'
import { GlossaryTermChip } from '@/features/learn/components/GlossaryTermChip'
import { GlossaryDefinitionSheet } from '@/features/learn/components/GlossaryDefinitionSheet'
import type { GlossaryTermId } from '@/content/glossary'

export default function LearnTopicScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [openTerm, setOpenTerm] = useState<GlossaryTermId | null>(null)

  const topic = EDUCATION_TOPICS.find((entry) => entry.id === id)

  if (!topic) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('learn.title') }} />
        <Text variant="body" color="secondary">
          {t('obligationDetail.notFoundTitle')}
        </Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(`learnTopics.${topic.id}.title`) }} />
      <Text variant="title">{t(`learnTopics.${topic.id}.title`)}</Text>
      <Text variant="body" color="secondary">
        {t(`learnTopics.${topic.id}.body`)}
      </Text>

      {topic.relatedTerms.length > 0 && (
        <View style={styles.relatedSection}>
          <SectionHeader title={t('learn.relatedTerms')} />
          <View style={styles.chipRow}>
            {topic.relatedTerms.map((termId) => (
              <GlossaryTermChip key={termId} termId={termId} onPress={setOpenTerm} />
            ))}
          </View>
        </View>
      )}

      <GlossaryDefinitionSheet termId={openTerm} onClose={() => setOpenTerm(null)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  relatedSection: {
    marginTop: space[5],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
})
