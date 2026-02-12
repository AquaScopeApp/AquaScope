/**
 * Tests for Equipment page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import EquipmentPage from '../Equipment'
import type { Equipment, Tank } from '../../types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useCurrency', () => ({
  useCurrency: () => ({ currency: 'EUR', bannerTheme: 'reef', isLoaded: true, refresh: vi.fn() }),
}))

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
  equipmentApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    convertToConsumable: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  },
  tanksApi: {
    list: vi.fn(),
  },
}))

import { equipmentApi, tanksApi } from '../../api'

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderEquipment() {
  return render(
    <BrowserRouter>
      <EquipmentPage />
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

const makeEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
  id: 'eq-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  name: 'Return Pump',
  equipment_type: 'return_pump',
  manufacturer: 'Ecotech',
  model: 'Vectra M2',
  specs: null,
  purchase_date: '2024-01-01',
  purchase_price: '350',
  purchase_url: null,
  condition: 'new',
  status: 'active',
  notes: null,
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks(equipment: Equipment[] = [], tanks: Tank[] = []) {
  vi.mocked(equipmentApi.list).mockResolvedValue(equipment)
  vi.mocked(tanksApi.list).mockResolvedValue(tanks)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Equipment Page', () => {
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

  it('shows loading text initially', () => {
    vi.mocked(equipmentApi.list).mockReturnValue(new Promise(() => {}))
    vi.mocked(tanksApi.list).mockReturnValue(new Promise(() => {}))

    renderEquipment()

    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('renders title and subtitle after loading', async () => {
    renderEquipment()

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  it('renders add-equipment button', async () => {
    renderEquipment()

    await waitFor(() => {
      expect(screen.getByText('addEquipment')).toBeInTheDocument()
    })
  })

  it('shows empty state message when no equipment exists', async () => {
    setupDefaultMocks([], [makeTank()])

    renderEquipment()

    await waitFor(() => {
      expect(screen.getByText('noEquipment')).toBeInTheDocument()
    })
  })

  it('renders filter controls', async () => {
    renderEquipment()

    await waitFor(() => {
      expect(screen.getByText('filterByType')).toBeInTheDocument()
      expect(screen.getByText('filterByStatus')).toBeInTheDocument()
    })
  })

  it('renders archive toggle checkbox', async () => {
    renderEquipment()

    await waitFor(() => {
      expect(screen.getByText('showArchivedItems')).toBeInTheDocument()
    })
  })

  it('calls API methods on mount', async () => {
    renderEquipment()

    await waitFor(() => {
      expect(equipmentApi.list).toHaveBeenCalledTimes(1)
      expect(tanksApi.list).toHaveBeenCalledTimes(1)
    })
  })

  it('renders equipment cards when data exists', async () => {
    const pump = makeEquipment({
      id: 'eq-1',
      name: 'My Custom Pump',
      equipment_type: 'pump',
      manufacturer: 'Ecotech',
      model: 'Vectra M2',
    })

    setupDefaultMocks([pump], [makeTank()])

    renderEquipment()

    await waitFor(() => {
      // The card name is unique; type "Pump" may also appear in the dropdown
      expect(screen.getByText('My Custom Pump')).toBeInTheDocument()
      expect(screen.getByText('Ecotech')).toBeInTheDocument()
      expect(screen.getByText('Vectra M2')).toBeInTheDocument()
    })
  })

  it('renders add-equipment button that is clickable', async () => {
    setupDefaultMocks([], [makeTank()])

    renderEquipment()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /addEquipment/i })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeEnabled()
    })
  })

  it('renders condition and status badges for equipment items', async () => {
    const item = makeEquipment({ condition: 'good', status: 'active' })
    setupDefaultMocks([item], [makeTank()])

    renderEquipment()

    // The condition badge "Good" and status badge "Active" appear both in the card
    // and in the filter dropdowns. Use getAllByText to verify at least one is rendered.
    await waitFor(() => {
      expect(screen.getAllByText('Good').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows tank name for each equipment item', async () => {
    const item = makeEquipment({ tank_id: 'tank-1' })
    setupDefaultMocks([item], [makeTank({ id: 'tank-1', name: 'My Reef Tank' })])

    renderEquipment()

    // Tank name appears in both filter and card; use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText('My Reef Tank').length).toBeGreaterThanOrEqual(1)
    })
  })
})
