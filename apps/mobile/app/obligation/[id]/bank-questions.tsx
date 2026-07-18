import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Text,
  space,
  radius,
  layout,
  useTheme,
  useResponsiveLayout,
  NavGroup,
  ListRow,
} from '@/core/design-system'
import { useBankQuestionsViewModel } from '@/features/bank-questions/hooks/use-bank-questions-view-model'
import type { Id } from '@eltizamati/domain'

export default function BankQuestionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const theme = useTheme()
  const viewModel = useBankQuestionsViewModel(id as Id<'obligation'>)
  const { isWideWeb } = useResponsiveLayout()

  return (
    <>
      <Stack.Screen options={{ title: t('bankQuestions.title', 'Bank Questions') }} />
      <ScrollView contentContainerStyle={[styles.scroll, isWideWeb && styles.scrollWide]}>
        <View style={styles.header}>
          <Text variant="heading">{t('bankQuestions.header', 'Questions to ask your bank')}</Text>
        </View>
        <NavGroup>
          {viewModel.questions.map((q, idx) => (
            <ListRow
              key={q.id}
              leading={
                <View style={[styles.indexBadge, { backgroundColor: theme.bgSubtle }]}>
                  <Text variant="caption" color="secondary">
                    {idx + 1}
                  </Text>
                </View>
              }
            >
              <Text variant="body">{q.text}</Text>
            </ListRow>
          ))}
        </NavGroup>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  scrollWide: {
    width: '100%',
    maxWidth: layout.readableMaxWidth,
    alignSelf: 'center',
  },
  header: {
    marginBottom: space[4],
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
