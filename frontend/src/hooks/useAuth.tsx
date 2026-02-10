/**
 * Authentication Hook and Context
 *
 * Provides authentication state and methods throughout the application.
 *
 * Features:
 * - Login/Register/Logout
 * - Persistent auth state (localStorage)
 * - Automatic token management
 * - Loading states
 * - Error handling
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api/client'
import type { User, LoginCredentials, RegisterData, AuthState } from '../types'

// ============================================================================
// Context Type
// ============================================================================

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

// ============================================================================
// Create Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('aquascope_token')
      const storedUser = localStorage.getItem('aquascope_user')

      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))

          // Verify token is still valid by fetching current user
          const currentUser = await authApi.getCurrentUser()
          setUser(currentUser)
          localStorage.setItem('aquascope_user', JSON.stringify(currentUser))
        } catch (error) {
          // Token invalid - clear auth
          console.error('Auth initialization failed:', error)
          localStorage.removeItem('aquascope_token')
          localStorage.removeItem('aquascope_user')
          setToken(null)
          setUser(null)
        }
      }

      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  // Login method
  const login = async (credentials: LoginCredentials) => {
    try {
      // Get token
      const authToken = await authApi.login(credentials)

      // Store token
      localStorage.setItem('aquascope_token', authToken.access_token)
      setToken(authToken.access_token)

      // Fetch user data
      const currentUser = await authApi.getCurrentUser()
      localStorage.setItem('aquascope_user', JSON.stringify(currentUser))
      setUser(currentUser)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // Register method
  const register = async (data: RegisterData) => {
    try {
      // Register and get token
      const authToken = await authApi.register(data)

      // Store token
      localStorage.setItem('aquascope_token', authToken.access_token)
      setToken(authToken.access_token)

      // Fetch user data
      const currentUser = await authApi.getCurrentUser()
      localStorage.setItem('aquascope_user', JSON.stringify(currentUser))
      setUser(currentUser)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  // Logout method
  const logout = () => {
    localStorage.removeItem('aquascope_token')
    localStorage.removeItem('aquascope_user')
    setToken(null)
    setUser(null)
  }

  // Refresh user data
  const refreshUser = async () => {
    if (!token) return

    try {
      const currentUser = await authApi.getCurrentUser()
      localStorage.setItem('aquascope_user', JSON.stringify(currentUser))
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // Token might be invalid - logout
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access authentication context
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginForm onSubmit={login} />
 *   }
 *
 *   return <div>Welcome, {user?.username}!</div>
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export context for advanced use cases
export { AuthContext }
