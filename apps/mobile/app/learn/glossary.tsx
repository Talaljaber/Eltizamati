import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Stack } from 'expo-router'
import { Screen, Text, TextField, ListRow, Card, InlineState } from '@/core/design-system'
import { GLOSSARY_TERM_IDS, type GlossaryTermId } from '@/content/glossary'
import { GlossaryDefinitionSheet } from '@/features/learn/components/GlossaryDefinitionSheet'

/**
 * Standalone glossary index (FR-EDU-001) — the 32 terms were previously only
 * reachable contextually via a topic's related-terms chips; this gives the
 * full glossary a first-class, searchable entry point.
 */
export default function GlossaryScreen() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [openTerm, setOpenTerm] = useState<GlossaryTermId | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  const sortedTerms = useMemo(() => {
    const withLabels = GLOSSARY_TERM_IDS.map((id) => ({ id, label: t(`glossary.${id}.term`) }))
    return withLabels.sort((a, b) => a.label.localeCompare(b.label))
  }, [t])

  const filteredTerms =
    normalizedQuery.length === 0
      ? sortedTerms
      : sortedTerms.filter((entry) => entry.label.toLowerCase().includes(normalizedQuery))

  return (
    <Screen gap={5} maxWidth="content">
      <Stack.Screen options={{ title: t('learn.glossaryTitle') }} />
      <TextField
        label={t('learn.searchLabel')}
        placeholder={t('learn.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      {filteredTerms.length === 0 ? (
        <InlineState kind="empty" message={t('learn.searchEmpty')} />
      ) : (
        <Card padding="none">
          {filteredTerms.map((entry) => (
            <ListRow key={entry.id} onPress={() => setOpenTerm(entry.id)}>
              <Text variant="body">{entry.label}</Text>
            </ListRow>
          ))}
        </Card>
      )}

      <GlossaryDefinitionSheet termId={openTerm} onClose={() => setOpenTerm(null)} />
    </Screen>
  )
}
