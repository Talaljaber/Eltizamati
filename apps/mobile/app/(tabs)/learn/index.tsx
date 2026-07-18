import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import {
  Screen,
  Text,
  SectionHeader,
  NavGroup,
  NavRow,
  Card,
  Button,
  TextField,
  InlineState,
} from '@/core/design-system'
import {
  EDUCATION_TOPICS,
  type EducationCategory,
  type EducationTopic,
} from '@/content/education-topics'
import { CATALOGUE_SNAPSHOT_VERIFIED_AT } from '@/features/learn/model/catalogue-snapshot'

const CATEGORY_ORDER: readonly EducationCategory[] = ['conventional', 'islamic', 'cards']

const CATEGORY_ICON: Record<EducationCategory, 'school-outline' | 'moon-outline' | 'card-outline'> =
  {
    conventional: 'school-outline',
    islamic: 'moon-outline',
    cards: 'card-outline',
  }

export default function LearnScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const filteredTopics = useMemo(() => {
    if (!isSearching) return EDUCATION_TOPICS
    return EDUCATION_TOPICS.filter((topic) =>
      t(`learnTopics.${topic.id}.title`).toLowerCase().includes(normalizedQuery),
    )
  }, [isSearching, normalizedQuery, t])

  const topicsByCategory = useMemo(() => {
    const map = new Map<EducationCategory, EducationTopic[]>()
    for (const category of CATEGORY_ORDER)
      map.set(
        category,
        filteredTopics.filter((topic) => topic.category === category),
      )
    return map
  }, [filteredTopics])

  return (
    <Screen gap={6} maxWidth="content">
      <Text variant="title">{t('learn.guideTitle')}</Text>
      <Text variant="body" color="secondary">
        {t('learn.guideBody')}
      </Text>

      <TextField
        label={t('learn.searchLabel')}
        placeholder={t('learn.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      {!isSearching && (
        <>
          <SectionHeader title={t('learn.journeys')} />
          <NavGroup>
            <NavRow
              icon="compass-outline"
              label={t('learn.journeyBorrow')}
              onPress={() => router.push('/learn/howLoansWork')}
            />
            <NavRow
              icon="git-compare-outline"
              label={t('learn.journeyCompare')}
              onPress={() => router.push('/learn/compare')}
            />
            <NavRow
              icon="chatbubbles-outline"
              label={t('learn.journeyAsk')}
              onPress={() => router.push('/learn/assistant')}
            />
            <NavRow
              icon="book-outline"
              label={t('learn.glossaryEntry')}
              onPress={() => router.push('/learn/glossary')}
            />
          </NavGroup>

          <SectionHeader title={t('learn.snapshotTitle')} />
          <Card>
            <Text variant="bodySmall" color="secondary">
              {t('learn.snapshotBody', { date: CATALOGUE_SNAPSHOT_VERIFIED_AT })}
            </Text>
            <Button
              label={t('learn.journeyCompare')}
              onPress={() => router.push('/learn/compare')}
              variant="secondary"
            />
          </Card>
        </>
      )}

      {isSearching && filteredTopics.length === 0 ? (
        <InlineState kind="empty" message={t('learn.searchEmpty')} />
      ) : null}

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
      <NavGroup>
        {topics.map((topic) => (
          <NavRow
            key={topic.id}
            icon={CATEGORY_ICON[category]}
            label={t(`learnTopics.${topic.id}.title`)}
            onPress={() => onSelect(topic.id)}
          />
        ))}
      </NavGroup>
    </>
  )
}
