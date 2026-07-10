/* eslint-disable no-console */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { I18nManager } from 'react-native'
import * as Updates from 'expo-updates'
import { getLocales } from 'expo-localization'

import en from './translations/en.json'
import ar from './translations/ar.json'

// Fallback to English if device locale is not available
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en'
const initialLang = ['en', 'ar'].includes(deviceLanguage) ? deviceLanguage : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
  })
  .catch(console.error)

/**
 * Change language and automatically enforce RTL alignment.
 * Requires an app reload to take effect natively.
 */
export async function changeLanguage(lang: 'en' | 'ar') {
  await i18n.changeLanguage(lang)

  const isRTL = lang === 'ar'
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL)
    I18nManager.forceRTL(isRTL)
    // In production, we'd use Updates.reloadAsync()
    // For development, we might just warn or reload
    try {
      await Updates.reloadAsync()
    } catch (e) {
      console.warn('Cannot reload automatically in this environment. Please restart the app.', e)
    }
  }
}

export default i18n
