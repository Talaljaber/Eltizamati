import { View, StyleSheet } from 'react-native'
import { Text } from './Text'
import { space } from '../tokens'

export interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.title}>
        <Text variant="heading">{title}</Text>
      </View>
      {action !== undefined && <View>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space[2],
    marginBottom: space[2],
  },
  title: {
    flex: 1,
  },
})
