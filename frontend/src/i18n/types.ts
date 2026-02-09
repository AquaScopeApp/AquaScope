/**
 * Type augmentation for react-i18next
 * This provides type safety for translation keys and namespaces
 */

import 'react-i18next'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof import('../../public/locales/en/common.json')
      tanks: typeof import('../../public/locales/en/tanks.json')
      dashboard: typeof import('../../public/locales/en/dashboard.json')
      parameters: typeof import('../../public/locales/en/parameters.json')
      maintenance: typeof import('../../public/locales/en/maintenance.json')
      notes: typeof import('../../public/locales/en/notes.json')
      photos: typeof import('../../public/locales/en/photos.json')
      equipment: typeof import('../../public/locales/en/equipment.json')
      livestock: typeof import('../../public/locales/en/livestock.json')
      icptests: typeof import('../../public/locales/en/icptests.json')
    }
  }
}
