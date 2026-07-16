import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Screen, Text, SectionHeader, ListRow, Card, Button } from '@/core/design-system'
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
    for (const category of CATEGORY_ORDER)
      map.set(
        category,
        EDUCATION_TOPICS.filter((topic) => topic.category === category),
      )
    return map
  }, [])

  return (
    <Screen>
      <Text variant="title">{t('learn.guideTitle')}</Text>
      <Text variant="body" color="secondary">
        {t('learn.guideBody')}
      </Text>
      <SectionHeader title={t('learn.journeys')} />
      <Card>
        <ListRow onPress={() => router.push('/learn/howLoansWork')}>
          <Text variant="body">{t('learn.journeyBorrow')}</Text>
        </ListRow>
        <ListRow onPress={() => router.push('/learn/compare')}>
          <Text variant="body">{t('learn.journeyCompare')}</Text>
        </ListRow>
        <ListRow onPress={() => router.push('/learn/assistant')}>
          <Text variant="body">{t('learn.journeyAsk')}</Text>
        </ListRow>
      </Card>
      <SectionHeader title={t('learn.snapshotTitle')} />
      <Card>
        <Text variant="bodySmall" color="secondary">
          {t('learn.snapshotBody')}
        </Text>
        <Button
          label={t('learn.journeyCompare')}
          onPress={() => router.push('/learn/compare')}
          variant="secondary"
        />
      </Card>
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
  if (topics.length === 0) return null
  const key =
    category === 'conventional'
      ? 'learn.categoryConventional'
      : category === 'islamic'
        ? 'learn.categoryIslamic'
        : 'learn.categoryCards'
  return (
    <>
      <SectionHeader title={t(key)} />
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
