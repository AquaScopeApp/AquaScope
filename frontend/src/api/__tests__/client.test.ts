/**
 * Tests for API client
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'

const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('axios', () => {
  class MockAxiosError extends Error {
    isAxiosError = true
  }
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: (err: any) => err?.isAxiosError === true,
    },
    AxiosError: MockAxiosError,
  }
})

// Must import after mock setup
const clientModule = await import('../client')
const apiClient = clientModule.default
const { authApi, tanksApi } = clientModule

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('exports a configured API client', () => {
    expect(apiClient).toBeDefined()
  })

  describe('authApi', () => {
    it('has login method', () => {
      expect(authApi.login).toBeDefined()
      expect(typeof authApi.login).toBe('function')
    })

    it('has register method', () => {
      expect(authApi.register).toBeDefined()
      expect(typeof authApi.register).toBe('function')
    })

    it('has getCurrentUser method', () => {
      expect(authApi.getCurrentUser).toBeDefined()
      expect(typeof authApi.getCurrentUser).toBe('function')
    })
  })

  describe('tanksApi', () => {
    it('has CRUD methods', () => {
      expect(tanksApi.list).toBeDefined()
      expect(tanksApi.get).toBeDefined()
      expect(tanksApi.create).toBeDefined()
      expect(tanksApi.update).toBeDefined()
      expect(tanksApi.delete).toBeDefined()
    })
  })
})
