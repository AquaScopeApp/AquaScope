/**
 * Tests for Dashboard page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Dashboard from '../Dashboard'
import type { MaintenanceReminder, DashboardTankSummary, DashboardResponse } from '../../types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useAuth – only override the hook, keep AuthProvider out of the picture
// because we render with a plain BrowserRouter wrapper instead.
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useCurrency', () => ({
  useCurrency: () => ({ currency: 'EUR', bannerTheme: 'reef', isLoaded: true, refresh: vi.fn() }),
}))

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    isSupported: false,
    permission: 'denied',
    requestPermission: vi.fn(),
    notifyOverdue: vi.fn(),
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.name) return `${key} ${opts.name}`
      if (opts?.defaultValue) return opts.defaultValue
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../components/banners', () => ({
  banners: {
    reef: () => <div data-testid="reef-banner">ReefBanner</div>,
    planted: () => <div data-testid="planted-banner">PlantedBanner</div>,
  },
}))

vi.mock('../../components/banners/BannerEditor', () => ({
  default: () => <div data-testid="banner-editor">BannerEditor</div>,
}))

vi.mock('../../components/dashboard/Sparkline', () => ({
  default: ({ tankId }: { tankId: string }) => <div data-testid={`sparkline-${tankId}`}>Sparkline</div>,
}))

vi.mock('../../api', () => ({
  dashboardApi: {
    getSummary: vi.fn(),
  },
  tanksApi: {
    getImageBlobUrl: vi.fn().mockResolvedValue('blob:test-url'),
    setDefault: vi.fn(),
    unsetDefault: vi.fn(),
  },
  maintenanceApi: {
    listReminders: vi.fn(),
  },
  adminApi: {
    getBannerImageBlobUrl: vi.fn().mockResolvedValue(null),
  },
}))

// Import the mocked module so we can configure return values per test
import {
  dashboardApi,
  tanksApi,
  maintenanceApi,
  adminApi,
} from '../../api'

globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
globalThis.URL.revokeObjectURL = vi.fn()

// ---------------------------------------------------------------------------
// Render helper – wraps in BrowserRouter only (useAuth is already mocked)
// ---------------------------------------------------------------------------

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  )
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const makeTankSummary = (overrides: Partial<DashboardTankSummary> = {}): DashboardTankSummary => ({
  tank_id: 'tank-1',
  tank_name: 'My Reef Tank',
  water_type: 'saltwater',
  aquarium_subtype: 'mixed_reef',
  total_volume_liters: 380,
  setup_date: '2023-06-15',
  image_url: null,
  is_default: false,
  equipment_count: 0,
  livestock_count: 0,
  photos_count: 0,
  notes_count: 0,
  maintenance_count: 0,
  consumables_count: 0,
  overdue_count: 0,
  ...overrides,
})

const makeReminder = (overrides: Partial<MaintenanceReminder> = {}): MaintenanceReminder => ({
  id: 'reminder-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  equipment_id: null,
  title: 'Water Change',
  description: null,
  reminder_type: 'water_change',
  frequency_days: 7,
  last_completed: null,
  next_due: '2024-01-01T00:00:00Z',
  is_active: true,
  created_at: '2023-12-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configure all API mocks with sensible defaults so every test starts clean. */
function setupDefaultMocks(
  tanks: DashboardTankSummary[] = [],
  reminders: MaintenanceReminder[] = [],
  totalOverdue?: number,
) {
  const dashResponse: DashboardResponse = {
    tanks,
    total_overdue: totalOverdue ?? reminders.length,
  }
  vi.mocked(dashboardApi.getSummary).mockResolvedValue(dashResponse)
  vi.mocked(maintenanceApi.listReminders).mockResolvedValue(reminders)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', username: 'TestUser', email: 'test@test.com', is_admin: false, default_tank_id: null },
      isAuthenticated: true,
      isLoading: false,
      token: 'mock-token',
      refreshUser: vi.fn(),
    })
    setupDefaultMocks()
  })

  it('shows loading spinner initially', () => {
    // Make API calls hang so the loading state persists
    vi.mocked(dashboardApi.getSummary).mockReturnValue(new Promise(() => {}))
    vi.mocked(maintenanceApi.listReminders).mockReturnValue(new Promise(() => {}))

    renderDashboard()

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows welcome message with username after load', async () => {
    renderDashboard()

    await waitFor(() => {
      // The translation mock returns "welcome TestUser" for t('welcome', { name: 'TestUser' })
      expect(screen.getByText('welcome TestUser')).toBeInTheDocument()
    })
  })

  it('shows tank cards after loading', async () => {
    const tank1 = makeTankSummary({ tank_id: 'tank-1', tank_name: 'Reef Display' })
    const tank2 = makeTankSummary({ tank_id: 'tank-2', tank_name: 'Frag Tank' })
    setupDefaultMocks([tank1, tank2])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Reef Display')).toBeInTheDocument()
      expect(screen.getByText('Frag Tank')).toBeInTheDocument()
    })
  })

  it('shows overdue maintenance section when reminders exist', async () => {
    const tank = makeTankSummary()
    const reminder = makeReminder({ title: 'Water Change Overdue', tank_id: tank.tank_id })
    setupDefaultMocks([tank], [reminder])

    renderDashboard()

    await waitFor(() => {
      // The overdue section heading renders as "overdueMaintenance (1)" inside an <h2>
      expect(screen.getByRole('heading', { name: /overdueMaintenance/ })).toBeInTheDocument()
      expect(screen.getByText('Water Change Overdue')).toBeInTheDocument()
    })
  })

  it('shows "no tanks" message when user has no tanks', async () => {
    setupDefaultMocks([], [])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('noTanksYet')).toBeInTheDocument()
      expect(screen.getByText('addFirstTank')).toBeInTheDocument()
    })
  })

  it('navigates to add tank page when add-first-tank button is clicked', async () => {
    setupDefaultMocks([], [])

    renderDashboard()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('addFirstTank')).toBeInTheDocument()
    })

    await user.click(screen.getByText('addFirstTank'))

    expect(mockNavigate).toHaveBeenCalledWith('/tanks', { state: { showForm: true } })
  })

  it('navigates to add tank page from header add-tank button', async () => {
    const tank = makeTankSummary()
    setupDefaultMocks([tank])

    renderDashboard()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('addTank')).toBeInTheDocument()
    })

    await user.click(screen.getByText('addTank'))

    expect(mockNavigate).toHaveBeenCalledWith('/tanks', { state: { showForm: true } })
  })

  it('shows quick stats section with tank count', async () => {
    const tank1 = makeTankSummary({ tank_id: 'tank-1', tank_name: 'Tank A' })
    const tank2 = makeTankSummary({ tank_id: 'tank-2', tank_name: 'Tank B' })
    setupDefaultMocks([tank1, tank2])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('stats.totalTanks')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('calls all expected API methods on mount', async () => {
    const tank = makeTankSummary()
    setupDefaultMocks([tank])

    renderDashboard()

    await waitFor(() => {
      expect(dashboardApi.getSummary).toHaveBeenCalledTimes(1)
      expect(maintenanceApi.listReminders).toHaveBeenCalledWith({ overdue_only: true })
    })
  })

  it('does not show overdue section when there are no overdue reminders', async () => {
    const tank = makeTankSummary()
    setupDefaultMocks([tank], [])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('My Reef Tank')).toBeInTheDocument()
    })

    // The overdue section heading (h2) should not be in the DOM.
    // Note: "stats.overdueMaintenance" in the quick-stats card is always present
    // when totalOverdue > 0, so we specifically check for the <h2> heading used
    // in the overdue section.
    expect(screen.queryByRole('heading', { name: /overdueMaintenance/ })).not.toBeInTheDocument()
  })

  it('renders stat labels for each tank', async () => {
    const tank = makeTankSummary({
      equipment_count: 2,
      livestock_count: 1,
      photos_count: 3,
      notes_count: 0,
      maintenance_count: 0,
      consumables_count: 0,
    })
    setupDefaultMocks([tank])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('equipment')).toBeInTheDocument()
      expect(screen.getByText('livestock')).toBeInTheDocument()
      expect(screen.getByText('consumables')).toBeInTheDocument()
      expect(screen.getByText('photos')).toBeInTheDocument()
      expect(screen.getByText('notes')).toBeInTheDocument()
      expect(screen.getByText('maintenance')).toBeInTheDocument()
    })
  })

  it('renders Sparkline for each tank', async () => {
    const tank1 = makeTankSummary({ tank_id: 'tank-1' })
    const tank2 = makeTankSummary({ tank_id: 'tank-2', tank_name: 'Second Tank' })
    setupDefaultMocks([tank1, tank2])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId('sparkline-tank-1')).toBeInTheDocument()
      expect(screen.getByTestId('sparkline-tank-2')).toBeInTheDocument()
    })
  })

  it('displays stat counts from DashboardTankSummary', async () => {
    const tank = makeTankSummary({
      equipment_count: 5,
      livestock_count: 12,
      photos_count: 8,
      notes_count: 3,
      maintenance_count: 4,
      consumables_count: 7,
    })
    setupDefaultMocks([tank])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })
})
