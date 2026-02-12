/**
 * Tests for Maintenance page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Maintenance from '../Maintenance'
import type { MaintenanceReminder, Tank } from '../../types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

import { useAuth } from '../../hooks/useAuth'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.defaultValue) return opts.defaultValue
      return key
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

vi.mock('../../api', () => ({
  maintenanceApi: {
    listReminders: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    completeReminder: vi.fn(),
    deleteReminder: vi.fn(),
  },
  tanksApi: {
    list: vi.fn(),
  },
}))

import { maintenanceApi, tanksApi } from '../../api'

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderMaintenance() {
  return render(
    <BrowserRouter>
      <Maintenance />
    </BrowserRouter>
  )
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const makeTank = (overrides: Partial<Tank> = {}): Tank => ({
  id: 'tank-1',
  user_id: 'user-1',
  name: 'My Reef Tank',
  water_type: 'saltwater',
  aquarium_subtype: 'mixed_reef',
  display_volume_liters: 300,
  sump_volume_liters: 80,
  total_volume_liters: 380,
  description: null,
  image_url: null,
  setup_date: '2023-06-15',
  created_at: '2023-06-15T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  events: [],
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

function setupDefaultMocks(reminders: MaintenanceReminder[] = [], tanks: Tank[] = []) {
  vi.mocked(maintenanceApi.listReminders).mockResolvedValue(reminders)
  vi.mocked(tanksApi.list).mockResolvedValue(tanks)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Maintenance Page', () => {
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
    vi.mocked(maintenanceApi.listReminders).mockReturnValue(new Promise(() => {}))
    vi.mocked(tanksApi.list).mockReturnValue(new Promise(() => {}))

    renderMaintenance()

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders title and subtitle after loading', async () => {
    renderMaintenance()

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  it('renders add-reminder button', async () => {
    renderMaintenance()

    await waitFor(() => {
      expect(screen.getByText('addReminder')).toBeInTheDocument()
    })
  })

  it('shows empty state when there are no reminders', async () => {
    setupDefaultMocks([], [makeTank()])

    renderMaintenance()

    await waitFor(() => {
      expect(screen.getByText('noReminders')).toBeInTheDocument()
      expect(screen.getByText('noRemindersDescription')).toBeInTheDocument()
      expect(screen.getByText('createFirst')).toBeInTheDocument()
    })
  })

  it('shows stats cards with zero counts when no reminders exist', async () => {
    setupDefaultMocks([], [makeTank()])

    renderMaintenance()

    await waitFor(() => {
      expect(screen.getByText('overdue')).toBeInTheDocument()
      expect(screen.getByText('dueSoon')).toBeInTheDocument()
      expect(screen.getByText('upcoming')).toBeInTheDocument()
    })
  })

  it('toggles form when add-reminder button is clicked', async () => {
    setupDefaultMocks([], [makeTank()])

    renderMaintenance()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('addReminder')).toBeInTheDocument()
    })

    await user.click(screen.getByText('addReminder'))

    // After clicking, button text should switch to cancel
    await waitFor(() => {
      expect(screen.getByText('actions.cancel')).toBeInTheDocument()
    })
  })

  it('calls API methods on mount', async () => {
    setupDefaultMocks()

    renderMaintenance()

    await waitFor(() => {
      expect(maintenanceApi.listReminders).toHaveBeenCalledTimes(1)
      expect(tanksApi.list).toHaveBeenCalledTimes(1)
    })
  })

  it('renders overdue section when overdue reminders exist', async () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    const overdueReminder = makeReminder({
      id: 'reminder-overdue',
      title: 'Overdue Task',
      next_due: pastDate.toISOString(),
      is_active: true,
    })

    setupDefaultMocks([overdueReminder], [makeTank()])

    renderMaintenance()

    await waitFor(() => {
      expect(screen.getByText('Overdue Task')).toBeInTheDocument()
    })
  })
})
