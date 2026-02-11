import { useState, useEffect } from 'react'
import { flushQueue, getPendingCount } from '../services/offlineQueue'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true)
      setIsSyncing(true)
      try {
        await flushQueue()
      } finally {
        setIsSyncing(false)
        const count = await getPendingCount()
        setPendingCount(count)
      }
    }

    const goOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    getPendingCount().then(setPendingCount)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return { isOnline, pendingCount, isSyncing }
}
