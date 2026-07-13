import { useTranslation } from 'react-i18next'
import { Text, Sheet } from '@/core/design-system'
import type { GlossaryTermId } from '@/content/glossary'

export interface GlossaryDefinitionSheetProps {
  readonly termId: GlossaryTermId | null
  readonly onClose: () => void
}

export function GlossaryDefinitionSheet({ termId, onClose }: GlossaryDefinitionSheetProps) {
  const { t } = useTranslation()

  return (
    <Sheet
      visible={termId !== null}
      onClose={onClose}
      title={termId === null ? undefined : t(`glossary.${termId}.term`)}
    >
      <Text variant="body" color="secondary">
        {termId === null ? '' : t(`glossary.${termId}.definition`)}
      </Text>
    </Sheet>
  )
}
