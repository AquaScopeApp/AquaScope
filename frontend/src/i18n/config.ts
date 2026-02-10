/**
 * i18n Configuration
 *
 * Multi-language support for AquaScope using i18next
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import './types' // Import type augmentation

i18n
  .use(HttpBackend) // Load translations from public/locales
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'es', 'de', 'it', 'pt'],

    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'aquascope_language',
    },

    ns: ['common', 'tanks', 'dashboard', 'parameters', 'maintenance', 'livestock', 'icptests', 'notes', 'photos', 'equipment'],
    defaultNS: 'common',
  })

export default i18n
