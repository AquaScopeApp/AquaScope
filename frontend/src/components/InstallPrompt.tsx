import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export default function InstallPrompt(): JSX.Element | null {
  const { canInstall, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)
  const { t } = useTranslation('common')

  if (!canInstall || dismissed) return null

  return (
    <div className="bg-ocean-50 dark:bg-ocean-900/30 border border-ocean-200 dark:border-ocean-800 rounded-lg p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/logo-128.png" alt="" className="h-10 w-10" />
        <div>
          <p className="text-sm font-medium text-ocean-900">{t('pwa.installTitle')}</p>
          <p className="text-xs text-ocean-700">{t('pwa.installDescription')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1"
        >
          {t('pwa.later')}
        </button>
        <button
          onClick={promptInstall}
          className="text-sm bg-ocean-600 text-white px-4 py-2 rounded-md hover:bg-ocean-700"
        >
          {t('pwa.installButton')}
        </button>
      </div>
    </div>
  )
}
