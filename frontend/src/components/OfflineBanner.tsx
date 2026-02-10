import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner(): JSX.Element | null {
  const { isOnline, pendingCount, isSyncing } = useOnlineStatus()
  const { t } = useTranslation('common')

  if (isOnline && pendingCount === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
      isOnline
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-700 text-white'
    }`}>
      {!isOnline && (
        <span>{t('pwa.offlineMessage')}</span>
      )}
      {isOnline && isSyncing && (
        <span>{t('pwa.syncingMessage', { count: pendingCount })}</span>
      )}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <span>{t('pwa.syncFailedMessage', { count: pendingCount })}</span>
      )}
    </div>
  )
}
