import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

export default function SimulatorScreen() {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('simulator.title')}</Text>
      <Text style={styles.subtitle}>{t('simulator.subtitle')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
})
