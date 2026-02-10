/**
 * Tests for App component
 *
 * Since App includes its own Router, we render it directly
 * and verify it mounts without errors.
 */
import { describe, it, expect, vi } from 'vitest'
import { screen, render, waitFor } from '@testing-library/react'

// Mock all page components to avoid complex dependencies
vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))
vi.mock('../pages/Register', () => ({
  default: () => <div data-testid="register-page">Register Page</div>,
}))
vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}))
vi.mock('../components/Layout', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom')
    return <div data-testid="layout"><Outlet /></div>
  },
}))
vi.mock('../components/auth/ProtectedRoute', () => ({
  default: ({ children }: any) => <>{children}</>,
}))
vi.mock('../pages/Tanks', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom')
    return <div data-testid="tanks-page"><Outlet /></div>
  },
}))
vi.mock('../pages/TankList', () => ({ default: () => <div>Tank List</div> }))
vi.mock('../pages/TankDetail', () => ({ default: () => <div>Tank Detail</div> }))
vi.mock('../pages/Parameters', () => ({ default: () => <div>Parameters</div> }))
vi.mock('../pages/Maintenance', () => ({ default: () => <div>Maintenance</div> }))
vi.mock('../pages/Livestock', () => ({ default: () => <div>Livestock</div> }))
vi.mock('../pages/Equipment', () => ({ default: () => <div>Equipment</div> }))
vi.mock('../pages/ICPTests', () => ({ default: () => <div>ICP Tests</div> }))
vi.mock('../pages/Photos', () => ({ default: () => <div>Photos</div> }))
vi.mock('../pages/Notes', () => ({ default: () => <div>Notes</div> }))
vi.mock('../pages/Admin', () => ({ default: () => <div>Admin</div> }))
vi.mock('../i18n/config', () => ({}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('App Component', () => {
  it('renders without crashing', async () => {
    const { default: App } = await import('../App')
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('renders the app with ProtectedRoute and Layout', async () => {
    // Navigate to root - the ProtectedRoute is mocked to passthrough
    // so Layout should render and redirect to /dashboard
    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      // The layout should be rendered for protected routes
      expect(screen.getByTestId('layout')).toBeInTheDocument()
    })
  })
})
