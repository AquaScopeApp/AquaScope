/**
 * Browser Notifications Hook
 *
 * Uses the browser Notification API to alert users about overdue maintenance.
 * Only fires once per session to avoid spamming.
 */

import { useCallback, useRef } from 'react'

const NOTIFICATION_KEY = 'aquascope_last_notification'

export function useNotifications() {
  const hasFiredRef = useRef(false)

  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  const permission = isSupported ? Notification.permission : 'denied'

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied'
    const result = await Notification.requestPermission()
    return result
  }, [isSupported])

  const notifyOverdue = useCallback(
    (count: number, titles: string[]) => {
      if (!isSupported || permission !== 'granted' || hasFiredRef.current) return
      if (count === 0) return

      // Only notify once per hour
      const lastNotified = localStorage.getItem(NOTIFICATION_KEY)
      if (lastNotified) {
        const elapsed = Date.now() - parseInt(lastNotified, 10)
        if (elapsed < 60 * 60 * 1000) return
      }

      hasFiredRef.current = true
      localStorage.setItem(NOTIFICATION_KEY, Date.now().toString())

      const body =
        count === 1
          ? titles[0]
          : `${titles.slice(0, 3).join(', ')}${count > 3 ? ` +${count - 3} more` : ''}`

      new Notification('AquaScope — Overdue Maintenance', {
        body,
        icon: '/logo-128.png',
        tag: 'overdue-maintenance',
      })
    },
    [isSupported, permission],
  )

  return { isSupported, permission, requestPermission, notifyOverdue }
}
