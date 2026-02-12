/**
 * Tests for useTheme hook and ThemeProvider
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../useTheme'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('defaults to system theme when no localStorage value', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('system')
  })

  it('reads theme from localStorage', () => {
    localStorage.setItem('aquascope_theme', 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('ignores invalid localStorage values', () => {
    localStorage.setItem('aquascope_theme', 'invalid')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('system')
  })

  it('setTheme updates theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('aquascope_theme')).toBe('dark')
  })

  it('setTheme to light removes dark class from html', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme to dark adds dark class to html', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('resolvedTheme returns light or dark, never system', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(['light', 'dark']).toContain(result.current.resolvedTheme)

    act(() => {
      result.current.setTheme('light')
    })
    expect(result.current.resolvedTheme).toBe('light')

    act(() => {
      result.current.setTheme('dark')
    })
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('cycles through all three themes', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')

    act(() => result.current.setTheme('system'))
    expect(result.current.theme).toBe('system')

    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
  })
})
