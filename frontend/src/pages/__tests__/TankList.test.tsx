/**
 * Tests for TankList page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import TankList from '../TankList'
import type { Tank } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
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
    useLocation: () => ({ state: null, pathname: '/tanks', search: '', hash: '', key: 'default' }),
  }
})

const mockTanksList = vi.fn()
const mockTanksDelete = vi.fn()
const mockTanksCreate = vi.fn()
const mockTanksUpdate = vi.fn()

vi.mock('../../api/client', () => ({
  tanksApi: {
    list: (...args: any[]) => mockTanksList(...args),
    delete: (...args: any[]) => mockTanksDelete(...args),
    create: (...args: any[]) => mockTanksCreate(...args),
    update: (...args: any[]) => mockTanksUpdate(...args),
  },
}))

vi.mock('../../components/tanks/TankCard', () => ({
  default: ({ tank }: { tank: Tank }) => (
    <div data-testid={`tank-card-${tank.id}`}>
      <span>{tank.name}</span>
    </div>
  ),
}))

vi.mock('../../components/tanks/TankForm', () => ({
  default: () => <div data-testid="tank-form">Tank Form</div>,
}))

globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
globalThis.URL.revokeObjectURL = vi.fn()

// --- Factory helpers ---

const makeTank = (overrides: Partial<Tank> = {}): Tank => ({
  id: 'tank-1',
  user_id: 'user-1',
  name: 'Reef Tank',
  water_type: 'saltwater',
  aquarium_subtype: null,
  display_volume_liters: 300,
  sump_volume_liters: 100,
  total_volume_liters: 400,
  description: 'Main display reef tank',
  image_url: null,
  setup_date: '2023-06-01',
  created_at: '2023-06-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  events: [],
  ...overrides,
})

describe('TankList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    // Make the API call hang so loading state stays visible
    mockTanksList.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<TankList />)

    // The loading state renders a spinning div (animate-spin class)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders tank cards after loading', async () => {
    const tanks = [
      makeTank({ id: 'tank-1', name: 'Reef Tank' }),
      makeTank({ id: 'tank-2', name: 'Freshwater Planted' }),
      makeTank({ id: 'tank-3', name: 'Nano Cube' }),
    ]
    mockTanksList.mockResolvedValue(tanks)

    renderWithProviders(<TankList />)

    await waitFor(() => {
      expect(screen.getByTestId('tank-card-tank-1')).toBeInTheDocument()
    })

    expect(screen.getByTestId('tank-card-tank-2')).toBeInTheDocument()
    expect(screen.getByTestId('tank-card-tank-3')).toBeInTheDocument()
    expect(screen.getByText('Reef Tank')).toBeInTheDocument()
    expect(screen.getByText('Freshwater Planted')).toBeInTheDocument()
    expect(screen.getByText('Nano Cube')).toBeInTheDocument()
  })

  it('shows add tank button', async () => {
    mockTanksList.mockResolvedValue([makeTank()])

    renderWithProviders(<TankList />)

    await waitFor(() => {
      expect(screen.getByTestId('tank-card-tank-1')).toBeInTheDocument()
    })

    // The add tank button text comes from the translation key 'addTank'
    expect(screen.getByText('addTank')).toBeInTheDocument()
  })

  it('shows empty state when no tanks', async () => {
    mockTanksList.mockResolvedValue([])

    renderWithProviders(<TankList />)

    await waitFor(() => {
      expect(screen.getByText('noTanksYet')).toBeInTheDocument()
    })

    expect(screen.getByText('getStarted')).toBeInTheDocument()
    expect(screen.getByText('addFirstTank')).toBeInTheDocument()
  })
})
