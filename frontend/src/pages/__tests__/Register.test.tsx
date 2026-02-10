/**
 * Tests for Register component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import Register from '../Register'
import * as apiClient from '../../api/client'

vi.mock('../../api/client', () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.createAccount': 'Create account',
        'auth.creatingAccount': 'Creating account...',
        'auth.emailAddress': 'Email address',
        'auth.fullName': 'Full Name',
        'auth.password': 'Password',
        'auth.confirmPassword': 'Confirm Password',
        'auth.passwordMinLength': 'Must be at least 8 characters',
        'auth.alreadyHaveAccount': 'Already have an account?',
        'auth.signInHere': 'Sign in here',
        'auth.reefManagement': 'Aquarium Management',
        'auth.registrationFailed': 'Registration failed',
        'auth.passwordsDontMatch': 'Passwords do not match',
        'auth.passwordTooShort': 'Password must be at least 8 characters long',
      }
      return translations[key] || key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form', () => {
    renderWithProviders(<Register />)

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    renderWithProviders(<Register />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email address/i)
    const usernameInput = screen.getByLabelText(/full name/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'differentpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows error when password is too short', async () => {
    renderWithProviders(<Register />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email address/i)
    const usernameInput = screen.getByLabelText(/full name/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'short')
    await user.type(confirmPasswordInput, 'short')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument()
    })
  })

  it('submits registration form with valid data', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.mocked(apiClient.authApi.register).mockResolvedValue({
      access_token: 'mock-token',
      token_type: 'bearer',
    })

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    renderWithProviders(<Register />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email address/i)
    const usernameInput = screen.getByLabelText(/full name/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(apiClient.authApi.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      })
    })
  })

  it('has link to login page', () => {
    renderWithProviders(<Register />)

    const loginLink = screen.getByText(/sign in here/i)
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})
