/**
 * Tests for Livestock page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Livestock from '../Livestock'
import type { Livestock as LivestockType, Tank } from '../../types'

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
  livestockApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    split: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  },
  tanksApi: {
    list: vi.fn(),
  },
}))

import { livestockApi, tanksApi } from '../../api'

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderLivestock() {
  return render(
    <BrowserRouter>
      <Livestock />
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

const makeLivestock = (overrides: Partial<LivestockType> = {}): LivestockType => ({
  id: 'ls-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  species_name: 'Amphiprion ocellaris',
  common_name: 'Clownfish',
  type: 'fish',
  fishbase_species_id: null,
  worms_id: null,
  inaturalist_id: null,
  cached_photo_url: null,
  quantity: 2,
  status: 'alive',
  added_date: '2024-01-01',
  removed_date: null,
  notes: null,
  purchase_price: null,
  purchase_url: null,
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks(livestock: LivestockType[] = [], tanks: Tank[] = []) {
  vi.mocked(livestockApi.list).mockResolvedValue(livestock)
  vi.mocked(tanksApi.list).mockResolvedValue(tanks)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Livestock Page', () => {
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
    vi.mocked(livestockApi.list).mockReturnValue(new Promise(() => {}))
    vi.mocked(tanksApi.list).mockReturnValue(new Promise(() => {}))

    renderLivestock()

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders title and subtitle after loading', async () => {
    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  it('renders add-livestock button', async () => {
    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('addLivestock')).toBeInTheDocument()
    })
  })

  it('shows empty state when there is no livestock', async () => {
    setupDefaultMocks([], [makeTank()])

    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('noLivestock')).toBeInTheDocument()
      expect(screen.getByText('startTracking')).toBeInTheDocument()
      expect(screen.getByText('addFirst')).toBeInTheDocument()
    })
  })

  it('renders filter buttons for types', async () => {
    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('filterByType')).toBeInTheDocument()
    })
  })

  it('renders archive toggle checkbox', async () => {
    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('showArchivedItems')).toBeInTheDocument()
    })
  })

  it('renders add-livestock button that is clickable', async () => {
    setupDefaultMocks([], [makeTank()])

    renderLivestock()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /addLivestock/i })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeEnabled()
    })
  })

  it('calls API methods on mount', async () => {
    renderLivestock()

    await waitFor(() => {
      expect(livestockApi.list).toHaveBeenCalledTimes(1)
      expect(tanksApi.list).toHaveBeenCalledTimes(1)
    })
  })

  it('renders fish section when fish livestock exists', async () => {
    const fish = makeLivestock({
      id: 'fish-1',
      species_name: 'Amphiprion ocellaris',
      common_name: 'Clownfish',
      type: 'fish',
      status: 'alive',
      quantity: 2,
    })

    setupDefaultMocks([fish], [makeTank()])

    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText('Clownfish')).toBeInTheDocument()
    })
  })

  it('renders past livestock section when dead/removed entries exist', async () => {
    const alive = makeLivestock({ id: 'ls-alive', status: 'alive', common_name: 'Live Fish' })
    const dead = makeLivestock({ id: 'ls-dead', status: 'dead', common_name: 'Gone Fish' })

    setupDefaultMocks([alive, dead], [makeTank()])

    renderLivestock()

    await waitFor(() => {
      expect(screen.getByText(/pastLivestock/)).toBeInTheDocument()
    })
  })
})
