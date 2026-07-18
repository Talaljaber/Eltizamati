import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from './Text'
import { Button, type ButtonVariant } from './Button'
import { SectionHeader } from './SectionHeader'
import { Sheet } from './Sheet'
import { space } from '../tokens'

export interface DangerZoneConfirm {
  readonly title: string
  readonly body: string
  readonly confirmLabel: string
  readonly cancelLabel?: string
}

export interface DangerZoneAction {
  readonly label: string
  readonly variant?: Extract<ButtonVariant, 'secondary' | 'destructive'>
  readonly onPress: () => void
  readonly loading?: boolean
  /** When provided, the action opens a confirmation Sheet before firing. */
  readonly confirm?: DangerZoneConfirm
}

export interface DangerZoneProps {
  readonly title: string
  readonly actions: readonly DangerZoneAction[]
  readonly testID?: string
}

/**
 * DangerZone — a de-emphasized group of destructive/risky actions
 * (archive, delete, ...) with Sheet-based confirmation, replacing
 * `Alert.alert` (which is inconsistent with the Sheet used elsewhere).
 */
export function DangerZone({ title, actions, testID }: DangerZoneProps) {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | undefined>(undefined)
  const openAction = openIndex !== undefined ? actions[openIndex] : undefined

  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader title={title} />
      {actions.map((action, index) => (
        <Button
          key={index}
          label={action.label}
          variant={action.variant ?? 'secondary'}
          loading={action.loading}
          onPress={() => {
            if (action.confirm) setOpenIndex(index)
            else action.onPress()
          }}
        />
      ))}
      <Sheet
        visible={openAction?.confirm !== undefined}
        onClose={() => setOpenIndex(undefined)}
        title={openAction?.confirm?.title}
      >
        {openAction?.confirm ? (
          <View style={styles.confirmBody}>
            <Text variant="body" color="secondary">
              {openAction.confirm.body}
            </Text>
            <Button
              label={openAction.confirm.confirmLabel}
              variant={openAction.variant ?? 'destructive'}
              onPress={() => {
                setOpenIndex(undefined)
                openAction.onPress()
              }}
            />
            <Button
              label={openAction.confirm.cancelLabel ?? t('common.cancel')}
              variant="ghost"
              onPress={() => setOpenIndex(undefined)}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: space[3],
  },
  confirmBody: {
    gap: space[3],
  },
})
