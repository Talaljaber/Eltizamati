import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Sheet, Text, ListRow, minTouchTarget, radius, space, useTheme } from '@/core/design-system'

export interface PickerSheetFieldProps<T> {
  readonly label: string
  readonly items: readonly T[]
  readonly getId: (item: T) => string
  readonly getLabel: (item: T) => string
  /** Falls back to `getLabel` when omitted — lets e.g. a country picker also match on dial code. */
  readonly getSearchText?: (item: T) => string
  readonly selectedId: string | undefined
  readonly onSelect: (item: T) => void
  readonly placeholder: string
  readonly searchPlaceholder: string
  /** What the closed trigger shows for the selected item — defaults to `getLabel`. Lets a
   * country-code trigger stay compact ("+962") while the sheet list shows the full name. */
  readonly renderTriggerValue?: (item: T) => string
  readonly compact?: boolean
  readonly testID?: string
}

/**
 * Shared "tap a field, search a short list in a bottom sheet, pick one" —
 * used for sign-up's bank picker and country-dial-code picker (FR-AUTH: no
 * free-typed bank name, no hand-typed country code). Generic over item type
 * so both pickers share one implementation.
 */
export function PickerSheetField<T>({
  label,
  items,
  getId,
  getLabel,
  getSearchText,
  selectedId,
  onSelect,
  placeholder,
  searchPlaceholder,
  renderTriggerValue,
  compact = false,
  testID,
}: PickerSheetFieldProps<T>) {
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')

  const selectedItem = items.find((item) => getId(item) === selectedId)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (normalized === '') return items
    return items.filter((item) =>
      (getSearchText?.(item) ?? getLabel(item)).toLocaleLowerCase().includes(normalized),
    )
  }, [items, query, getLabel, getSearchText])

  function handleSelect(item: T): void {
    onSelect(item)
    setQuery('')
    setVisible(false)
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
        testID={testID}
        style={[
          styles.control,
          compact ? styles.controlCompact : null,
          { backgroundColor: theme.bgElevated, borderColor: theme.border },
        ]}
      >
        <Text variant="body" color={selectedItem === undefined ? 'secondary' : 'primary'}>
          {selectedItem === undefined
            ? placeholder
            : (renderTriggerValue?.(selectedItem) ?? getLabel(selectedItem))}
        </Text>
        <Ionicons name="chevron-down-outline" size={16} color={theme.textTertiary} />
      </Pressable>

      <Sheet visible={visible} onClose={() => setVisible(false)} title={label}>
        <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}>
          <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            textContentType="none"
            accessibilityLabel={searchPlaceholder}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
        </View>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text variant="bodySmall" color="secondary">
              No matches.
            </Text>
          ) : (
            filtered.map((item) => (
              <ListRow
                key={getId(item)}
                onPress={() => handleSelect(item)}
                trailing={
                  getId(item) === selectedId ? (
                    <Ionicons name="checkmark" size={18} color={theme.brand} />
                  ) : null
                }
              >
                <Text variant="body">{getLabel(item)}</Text>
              </ListRow>
            ))
          )}
        </ScrollView>
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: space[1] },
  control: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  controlCompact: {
    alignSelf: 'flex-start',
    minWidth: 96,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    marginBlockEnd: space[3],
  },
  searchInput: {
    flex: 1,
    minHeight: minTouchTarget,
    fontSize: 16,
  },
  list: {
    maxHeight: 360,
  },
})
