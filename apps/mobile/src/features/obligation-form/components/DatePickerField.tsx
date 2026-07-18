import { createElement, useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Text,
  minTouchTarget,
  radius,
  space,
  useTheme,
  type ColorScheme,
} from '@/core/design-system'

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

/**
 * `@react-native-community/datetimepicker` ships no web implementation — it
 * silently renders `null` there (just a console warning), which is why the
 * native picker below must not be used on web. The browser's own
 * `<input type="date">` already speaks the app's `YYYY-MM-DD` format
 * natively, so it's rendered as a raw DOM element (react-native-web's root
 * renderer is ReactDOM, so a lowercase host tag mounts a real `<input>`).
 */
function WebDateInput({
  value,
  onChange,
  label,
  theme,
}: {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly label: string
  readonly theme: ColorScheme
}) {
  return createElement('input', {
    type: 'date',
    value,
    'aria-label': label,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    style: {
      minHeight: minTouchTarget,
      border: `1px solid ${theme.border}`,
      borderRadius: radius.md,
      paddingLeft: space[3],
      paddingRight: space[3],
      backgroundColor: theme.bgElevated,
      color: theme.textPrimary,
      fontSize: 16,
      fontFamily: 'inherit',
      width: '100%',
      boxSizing: 'border-box',
    },
  })
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.group}>
        <Text variant="bodySmall" color="secondary">
          {label}
        </Text>
        <WebDateInput value={value} onChange={onChange} label={label} theme={theme} />
        {optional === true && value !== '' ? (
          <Button variant="ghost" label={t('common.clear')} onPress={() => onChange('')} />
        ) : null}
      </View>
    )
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
