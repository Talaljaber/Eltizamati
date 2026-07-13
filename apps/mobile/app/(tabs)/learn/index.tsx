import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Screen, Text, SectionHeader, ListRow, Card } from '@/core/design-system'
import {
  EDUCATION_TOPICS,
  type EducationCategory,
  type EducationTopic,
} from '@/content/education-topics'

const CATEGORY_ORDER: readonly EducationCategory[] = ['conventional', 'islamic', 'cards']

export default function LearnScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  const topicsByCategory = useMemo(() => {
    const map = new Map<EducationCategory, EducationTopic[]>()
    for (const category of CATEGORY_ORDER) map.set(category, [])
    for (const topic of EDUCATION_TOPICS) {
      map.get(topic.category)?.push(topic)
    }
    return map
  }, [])

  return (
    <Screen>
      <Text variant="title">{t('learn.title')}</Text>
      <Text variant="body" color="secondary">
        {t('learn.subtitle')}
      </Text>

      {CATEGORY_ORDER.map((category) => (
        <CategorySection
          key={category}
          category={category}
          topics={topicsByCategory.get(category) ?? []}
          onSelect={(id) => router.push(`/learn/${id}`)}
        />
      ))}
    </Screen>
  )
}

function CategorySection({
  category,
  topics,
  onSelect,
}: {
  category: EducationCategory
  topics: EducationTopic[]
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()
  const categoryLabelKey =
    category === 'conventional'
      ? 'learn.categoryConventional'
      : category === 'islamic'
        ? 'learn.categoryIslamic'
        : 'learn.categoryCards'

  return (
    <>
      <SectionHeader title={t(categoryLabelKey)} />
      <Card>
        {topics.map((topic) => (
          <ListRow key={topic.id} onPress={() => onSelect(topic.id)}>
            <Text variant="body">{t(`learnTopics.${topic.id}.title`)}</Text>
          </ListRow>
        ))}
      </Card>
    </>
  )
}
