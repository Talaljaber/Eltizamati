import { useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Button, Text, minTouchTarget, radius, space, useTheme } from '@/core/design-system'

interface DatePickerFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly optional?: boolean
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (year && month && day) return new Date(year, month - 1, day, 12)
  return new Date()
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DatePickerField({ label, value, onChange, optional }: DatePickerFieldProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [visible, setVisible] = useState(false)

  function handleChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS !== 'ios') setVisible(false)
    if (event.type === 'dismissed' || selected === undefined) return
    onChange(formatLocalDate(selected))
  }

  return (
    <View style={styles.group}>
      <Text variant="bodySmall" color="secondary">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setVisible(true)}
        style={[styles.control, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
      >
        <Text variant="body" color={value === '' ? 'secondary' : 'primary'}>
          {value === '' ? t('obligationForm.selectDate') : value}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={theme.brand} />
      </Pressable>
      {visible ? (
        <View style={styles.picker}>
          <DateTimePicker value={parseLocalDate(value)} mode="date" onChange={handleChange} />
          {Platform.OS === 'ios' ? (
            <Button variant="ghost" label={t('common.done')} onPress={() => setVisible(false)} />
          ) : null}
        </View>
      ) : null}
      {optional === true && value !== '' ? (
        <Button variant="ghost" label={t('common.clear')} onPress={() => onChange('')} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: space[1] },
  control: {
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  picker: { alignItems: 'flex-end' },
})
