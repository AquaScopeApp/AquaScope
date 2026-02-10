/**
 * Tests for useAuth hook
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../useAuth'
import * as apiClient from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockToken = 'mock-jwt-token'

    vi.mocked(apiClient.authApi.login).mockResolvedValue({
      access_token: mockToken,
      token_type: 'bearer',
    })

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await result.current.login({ username: 'test@example.com', password: 'password123' })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    expect(localStorage.getItem('aquascope_token')).toBe(mockToken)
    expect(localStorage.getItem('aquascope_user')).toBe(JSON.stringify(mockUser))
  })

  it('should register successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'new@example.com',
      username: 'newuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockToken = 'mock-jwt-token'

    vi.mocked(apiClient.authApi.register).mockResolvedValue({
      access_token: mockToken,
      token_type: 'bearer',
    })

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await result.current.register({
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('should logout successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem('aquascope_token', 'mock-token')
    localStorage.setItem('aquascope_user', JSON.stringify(mockUser))

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Now logout
    result.current.logout()

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    expect(localStorage.getItem('aquascope_token')).toBeNull()
    expect(localStorage.getItem('aquascope_user')).toBeNull()
  })

  it('should restore user from localStorage on init', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem('aquascope_token', 'mock-token')
    localStorage.setItem('aquascope_user', JSON.stringify(mockUser))

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })
})
