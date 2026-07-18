import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Screen, Text, SectionHeader, NavGroup, NavRow, Button, space } from '@/core/design-system'
import { EDUCATION_TOPICS } from '@/content/education-topics'
import { GlossaryTermChip } from '@/features/learn/components/GlossaryTermChip'
import { GlossaryDefinitionSheet } from '@/features/learn/components/GlossaryDefinitionSheet'
import type { GlossaryTermId } from '@/content/glossary'

export default function LearnTopicScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [openTerm, setOpenTerm] = useState<GlossaryTermId | null>(null)

  const topic = EDUCATION_TOPICS.find((entry) => entry.id === id)

  if (!topic) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('learn.title') }} />
        <View style={styles.notFound}>
          <Text variant="heading" align="center">
            {t('learn.topicNotFoundTitle')}
          </Text>
          <Text variant="body" color="secondary" align="center">
            {t('learn.topicNotFoundSubtitle')}
          </Text>
          <Button label={t('learn.backToLearn')} onPress={() => router.replace('/(tabs)/learn')} />
        </View>
      </Screen>
    )
  }

  const relatedTopics = EDUCATION_TOPICS.filter(
    (entry) => entry.category === topic.category && entry.id !== topic.id,
  )

  return (
    <Screen gap={5}>
      <Stack.Screen options={{ title: t(`learnTopics.${topic.id}.title`) }} />
      <Text variant="title">{t(`learnTopics.${topic.id}.title`)}</Text>
      <Text variant="body" color="secondary">
        {t(`learnTopics.${topic.id}.body`)}
      </Text>

      {topic.relatedTerms.length > 0 && (
        <View>
          <SectionHeader title={t('learn.relatedTerms')} />
          <View style={styles.chipRow}>
            {topic.relatedTerms.map((termId) => (
              <GlossaryTermChip key={termId} termId={termId} onPress={setOpenTerm} />
            ))}
          </View>
        </View>
      )}

      {relatedTopics.length > 0 && (
        <View>
          <SectionHeader title={t('learn.relatedTopics')} />
          <NavGroup>
            {relatedTopics.map((entry) => (
              <NavRow
                key={entry.id}
                icon="arrow-forward-outline"
                label={t(`learnTopics.${entry.id}.title`)}
                onPress={() => router.push(`/learn/${entry.id}`)}
              />
            ))}
          </NavGroup>
        </View>
      )}

      <GlossaryDefinitionSheet termId={openTerm} onClose={() => setOpenTerm(null)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    gap: space[3],
    padding: space[6],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
})
