/**
 * Tests for Dashboard page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Dashboard from '../Dashboard'
import type { Tank, MaintenanceReminder } from '../../types'

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

vi.mock('../../api', () => ({
  tanksApi: {
    list: vi.fn(),
    getImageBlobUrl: vi.fn().mockResolvedValue('blob:test-url'),
  },
  maintenanceApi: {
    listReminders: vi.fn(),
  },
  equipmentApi: {
    list: vi.fn(),
  },
  livestockApi: {
    list: vi.fn(),
  },
  photosApi: {
    list: vi.fn(),
  },
  notesApi: {
    list: vi.fn(),
  },
}))

// Import the mocked module so we can configure return values per test
import {
  tanksApi,
  maintenanceApi,
  equipmentApi,
  livestockApi,
  photosApi,
  notesApi,
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

const makeTank = (overrides: Partial<Tank> = {}): Tank => ({
  id: 'tank-1',
  user_id: 'user-1',
  name: 'My Reef Tank',
  water_type: 'saltwater',
  aquarium_subtype: 'mixed_reef',
  display_volume_liters: 300,
  sump_volume_liters: 80,
  total_volume_liters: 380,
  description: 'A beautiful mixed reef tank',
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

/** Configure all API mocks with sensible defaults so every test starts clean. */
function setupDefaultMocks(tanks: Tank[] = [], reminders: MaintenanceReminder[] = []) {
  vi.mocked(tanksApi.list).mockResolvedValue(tanks)
  vi.mocked(maintenanceApi.listReminders).mockResolvedValue(reminders)
  vi.mocked(equipmentApi.list).mockResolvedValue([])
  vi.mocked(livestockApi.list).mockResolvedValue([])
  vi.mocked(photosApi.list).mockResolvedValue([])
  vi.mocked(notesApi.list).mockResolvedValue([])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', username: 'TestUser', email: 'test@test.com', is_admin: false },
      isAuthenticated: true,
      isLoading: false,
      token: 'mock-token',
    })
    setupDefaultMocks()
  })

  it('shows loading spinner initially', () => {
    // Make API calls hang so the loading state persists
    vi.mocked(tanksApi.list).mockReturnValue(new Promise(() => {}))
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
    const tank1 = makeTank({ id: 'tank-1', name: 'Reef Display' })
    const tank2 = makeTank({ id: 'tank-2', name: 'Frag Tank' })
    setupDefaultMocks([tank1, tank2])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Reef Display')).toBeInTheDocument()
      expect(screen.getByText('Frag Tank')).toBeInTheDocument()
    })
  })

  it('shows overdue maintenance section when reminders exist', async () => {
    const tank = makeTank()
    const reminder = makeReminder({ title: 'Water Change Overdue', tank_id: tank.id })
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
    const tank = makeTank()
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
    const tank1 = makeTank({ id: 'tank-1', name: 'Tank A' })
    const tank2 = makeTank({ id: 'tank-2', name: 'Tank B' })
    setupDefaultMocks([tank1, tank2])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('stats.totalTanks')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('calls all expected API methods on mount', async () => {
    const tank = makeTank()
    setupDefaultMocks([tank])

    renderDashboard()

    await waitFor(() => {
      expect(tanksApi.list).toHaveBeenCalledTimes(1)
      expect(maintenanceApi.listReminders).toHaveBeenCalledWith({ overdue_only: true })
      // Per-tank data fetches
      expect(equipmentApi.list).toHaveBeenCalledWith({ tank_id: 'tank-1' })
      expect(livestockApi.list).toHaveBeenCalledWith({ tank_id: 'tank-1' })
      expect(photosApi.list).toHaveBeenCalledWith('tank-1')
      expect(notesApi.list).toHaveBeenCalledWith('tank-1')
      expect(maintenanceApi.listReminders).toHaveBeenCalledWith({ tank_id: 'tank-1' })
    })
  })

  it('does not show overdue section when there are no overdue reminders', async () => {
    const tank = makeTank()
    setupDefaultMocks([tank], [])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('My Reef Tank')).toBeInTheDocument()
    })

    // The overdue section heading (h2) should not be in the DOM.
    // Note: "stats.overdueMaintenance" in the quick-stats card is always present,
    // so we specifically check for the <h2> heading used in the overdue section.
    expect(screen.queryByRole('heading', { name: /overdueMaintenance/ })).not.toBeInTheDocument()
  })

  it('renders stat labels for each tank', async () => {
    const tank = makeTank()
    setupDefaultMocks([tank])
    vi.mocked(equipmentApi.list).mockResolvedValue([{ id: 'eq-1' } as any, { id: 'eq-2' } as any])
    vi.mocked(livestockApi.list).mockResolvedValue([{ id: 'ls-1' } as any])
    vi.mocked(photosApi.list).mockResolvedValue([{ id: 'ph-1' } as any, { id: 'ph-2' } as any, { id: 'ph-3' } as any])

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('equipment')).toBeInTheDocument()
      expect(screen.getByText('livestock')).toBeInTheDocument()
      expect(screen.getByText('photos')).toBeInTheDocument()
      expect(screen.getByText('notes')).toBeInTheDocument()
      expect(screen.getByText('maintenance')).toBeInTheDocument()
    })
  })
})
