/**
 * Tests for Login component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import Login from '../Login'
import * as apiClient from '../../api/client'

vi.mock('../../api/client', () => ({
  authApi: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign in',
        'auth.signingIn': 'Signing in...',
        'auth.signInToAccount': 'Sign in to your account',
        'auth.emailAddress': 'Email address',
        'auth.password': 'Password',
        'auth.dontHaveAccount': "Don't have an account?",
        'auth.createOneHere': 'Create one here',
        'auth.reefManagement': 'Aquarium Management',
        'auth.trackYourReef': 'Track your aquarium parameters',
        'auth.loginFailed': 'Login failed. Please check your credentials.',
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

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderWithProviders(<Login />)

    expect(screen.getByText('AquaScope')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithProviders(<Login />)
    const user = userEvent.setup()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toBeRequired()
  })

  it('submits login form with valid credentials', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.mocked(apiClient.authApi.login).mockResolvedValue({
      access_token: 'mock-token',
      token_type: 'bearer',
    })

    vi.mocked(apiClient.authApi.getCurrentUser).mockResolvedValue(mockUser)

    renderWithProviders(<Login />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(apiClient.authApi.login).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays error message on login failure', async () => {
    vi.mocked(apiClient.authApi.login).mockRejectedValue({
      response: {
        data: {
          detail: 'Invalid credentials',
        },
      },
    })

    renderWithProviders(<Login />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('has link to register page', () => {
    renderWithProviders(<Login />)

    const registerLink = screen.getByText(/create one here/i)
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})
