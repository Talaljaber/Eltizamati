import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { space } from '../tokens'
import { useTheme } from '../use-theme'

export interface FieldRowProps {
  label: string
  value: string | React.ReactNode
  valueColor?: 'primary' | 'secondary' | 'critical' | 'positive'
}

export function FieldRow({ label, value, valueColor = 'primary' }: FieldRowProps) {
  const theme = useTheme()
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.label}>
        <Text variant="body" color="secondary">
          {label}
        </Text>
      </View>
      {typeof value === 'string' ? (
        <View style={styles.value}>
          <Text variant="body" color={valueColor} align="end">
            {value}
          </Text>
        </View>
      ) : (
        <View style={styles.valueNode}>{value}</View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[2],
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  valueNode: {
    flex: 1,
    alignItems: 'flex-end',
  },
})
