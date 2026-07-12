import { View, StyleSheet, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Text, space, Card } from '@/core/design-system'
import { useBankQuestionsViewModel } from '@/features/bank-questions/hooks/use-bank-questions-view-model'
import type { Id } from '@eltizamati/domain'

export default function BankQuestionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const viewModel = useBankQuestionsViewModel(id as Id<'obligation'>)

  return (
    <>
      <Stack.Screen options={{ title: t('bankQuestions.title', 'Bank Questions') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.header}>
            <Text variant="heading">{t('bankQuestions.header', 'Questions to ask your bank')}</Text>
          </View>
          {viewModel.questions.map((q, idx) => (
            <View key={q.id} style={styles.questionItem}>
              <Text variant="body">{idx + 1}. {q.text}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scroll: {
    padding: space[4],
  },
  header: {
    marginBottom: space[4],
  },
  questionItem: {
    marginBottom: space[3],
  },
})
