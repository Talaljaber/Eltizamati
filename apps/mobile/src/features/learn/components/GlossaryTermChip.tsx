import { Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text, useTheme, radius, space } from '@/core/design-system'
import type { GlossaryTermId } from '@/content/glossary'

export interface GlossaryTermChipProps {
  readonly termId: GlossaryTermId
  readonly onPress: (termId: GlossaryTermId) => void
}

/** Tappable glossary-term chip (FR-EDU-001) — opens the term's plain-language definition. */
export function GlossaryTermChip({ termId, onPress }: GlossaryTermChipProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const label = t(`glossary.${termId}.term`)

  return (
    <Pressable
      onPress={() => onPress(termId)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: theme.brandSoft }]}
    >
      <Text variant="caption" color="brand">
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
})
