/**
 * Tests for useNotifications hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications } from '../useNotifications'

const mockNotificationConstructor = vi.fn()
const mockRequestPermission = vi.fn()

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Set up Notification mock with 'granted' permission by default
    ;(globalThis as any).Notification = Object.assign(mockNotificationConstructor, {
      permission: 'granted',
      requestPermission: mockRequestPermission,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isSupported returns true when Notification API is available', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.isSupported).toBe(true)
  })

  it('permission returns granted when Notification.permission is granted', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.permission).toBe('granted')
  })

  it('permission returns denied when Notification is not supported', () => {
    delete (globalThis as any).Notification
    const { result } = renderHook(() => useNotifications())
    expect(result.current.isSupported).toBe(false)
    expect(result.current.permission).toBe('denied')
  })

  it('requestPermission calls Notification.requestPermission', async () => {
    mockRequestPermission.mockResolvedValue('granted')
    const { result } = renderHook(() => useNotifications())

    let permissionResult: string | undefined
    await act(async () => {
      permissionResult = await result.current.requestPermission()
    })

    expect(mockRequestPermission).toHaveBeenCalledOnce()
    expect(permissionResult).toBe('granted')
  })

  it('requestPermission returns denied when not supported', async () => {
    delete (globalThis as any).Notification
    const { result } = renderHook(() => useNotifications())

    let permissionResult: string | undefined
    await act(async () => {
      permissionResult = await result.current.requestPermission()
    })

    expect(mockRequestPermission).not.toHaveBeenCalled()
    expect(permissionResult).toBe('denied')
  })

  it('notifyOverdue creates a Notification with single title when count is 1', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })

    expect(mockNotificationConstructor).toHaveBeenCalledOnce()
    expect(mockNotificationConstructor).toHaveBeenCalledWith('AquaScope — Overdue Maintenance', {
      body: 'Clean filter',
      icon: '/logo-128.png',
      tag: 'overdue-maintenance',
    })
  })

  it('notifyOverdue creates a Notification with joined titles when count > 1 and <= 3', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(2, ['Clean filter', 'Water change'])
    })

    expect(mockNotificationConstructor).toHaveBeenCalledOnce()
    expect(mockNotificationConstructor).toHaveBeenCalledWith('AquaScope — Overdue Maintenance', {
      body: 'Clean filter, Water change',
      icon: '/logo-128.png',
      tag: 'overdue-maintenance',
    })
  })

  it('notifyOverdue shows "+N more" when count > 3', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(5, ['Task A', 'Task B', 'Task C', 'Task D', 'Task E'])
    })

    expect(mockNotificationConstructor).toHaveBeenCalledOnce()
    expect(mockNotificationConstructor).toHaveBeenCalledWith('AquaScope — Overdue Maintenance', {
      body: 'Task A, Task B, Task C +2 more',
      icon: '/logo-128.png',
      tag: 'overdue-maintenance',
    })
  })

  it('notifyOverdue does nothing when count is 0', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(0, [])
    })

    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })

  it('notifyOverdue does nothing when permission is not granted', () => {
    ;(globalThis as any).Notification = Object.assign(mockNotificationConstructor, {
      permission: 'denied',
      requestPermission: mockRequestPermission,
    })

    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })

    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })

  it('notifyOverdue only fires once per session (hasFiredRef)', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })
    expect(mockNotificationConstructor).toHaveBeenCalledOnce()

    mockNotificationConstructor.mockClear()

    act(() => {
      result.current.notifyOverdue(1, ['Water change'])
    })
    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })

  it('notifyOverdue does not fire if last notification was less than 1 hour ago', () => {
    // Simulate a notification sent 30 minutes ago
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
    localStorage.setItem('aquascope_last_notification', thirtyMinutesAgo.toString())

    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })

    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })

  it('notifyOverdue fires if last notification was more than 1 hour ago', () => {
    // Simulate a notification sent 2 hours ago
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    localStorage.setItem('aquascope_last_notification', twoHoursAgo.toString())

    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })

    expect(mockNotificationConstructor).toHaveBeenCalledOnce()
  })

  it('notifyOverdue stores timestamp in localStorage after firing', () => {
    const now = 1700000000000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notifyOverdue(1, ['Clean filter'])
    })

    expect(localStorage.getItem('aquascope_last_notification')).toBe(now.toString())
  })
})
