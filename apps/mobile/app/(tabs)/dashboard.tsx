import { View, Text, StyleSheet, Button } from 'react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage } from '@/i18n'

export default function DashboardScreen() {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en'
    // eslint-disable-next-line no-console
    changeLanguage(nextLang).catch(console.error)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dashboard.greeting')}</Text>
      <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
      <View style={styles.buttonContainer}>
        <Button title={t('common.toggleLanguage')} onPress={toggleLanguage} />
      </View>
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
  buttonContainer: {
    marginTop: 32,
  },
})
