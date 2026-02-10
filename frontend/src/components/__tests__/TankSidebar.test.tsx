/**
 * Tests for TankSidebar component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import TankSidebar from '../tanks/TankSidebar'
import type { Tank } from '../../types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${key} ${opts.count}`
      if (opts?.defaultValue) return opts.defaultValue
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../../api/client', () => ({
  tanksApi: { getImageBlobUrl: vi.fn().mockResolvedValue('blob:test-url') },
}))

// Stub heavy child components so the sidebar tests stay focused
vi.mock('../tanks/TankStats', () => ({
  default: ({ stats }: any) => (
    <div data-testid="tank-stats">{JSON.stringify(stats)}</div>
  ),
}))

vi.mock('../tanks/TankImageUpload', () => ({
  default: () => <div data-testid="tank-image-upload">ImageUpload</div>,
}))

vi.mock('../tanks/DefaultTankAnimation', () => ({
  default: ({ waterType }: any) => (
    <div data-testid="default-tank-animation">{waterType}</div>
  ),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
globalThis.URL.revokeObjectURL = vi.fn()

// ---------------------------------------------------------------------------
// Factory helper
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TankSidebar Component', () => {
  const mockOnEdit = vi.fn()
  const mockOnAddEvent = vi.fn()
  const mockOnRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the tank name', () => {
    renderWithProviders(<TankSidebar tank={makeTank()} />)

    expect(screen.getByText('My Reef Tank')).toBeInTheDocument()
  })

  it('renders water type badge', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ water_type: 'saltwater' })} />
    )

    // The translation mock returns the key directly: t(`waterType.saltwater`) -> "waterType.saltwater"
    expect(screen.getByText('waterType.saltwater')).toBeInTheDocument()
  })

  it('renders freshwater water type badge', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ water_type: 'freshwater' })} />
    )

    expect(screen.getByText('waterType.freshwater')).toBeInTheDocument()
  })

  it('renders aquarium subtype badge when present', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ aquarium_subtype: 'mixed_reef' })} />
    )

    expect(screen.getByText('subtype.mixed_reef')).toBeInTheDocument()
  })

  it('renders volume information', () => {
    const tank = makeTank({
      display_volume_liters: 300,
      sump_volume_liters: 80,
      total_volume_liters: 380,
    })
    renderWithProviders(<TankSidebar tank={tank} />)

    // The JSX renders "{t('fields.displayVolume')}:" so the text includes the colon.
    // Use regex to match the label portion.
    expect(screen.getByText(/fields\.displayVolume/)).toBeInTheDocument()
    expect(screen.getByText(/fields\.sumpVolume/)).toBeInTheDocument()
    expect(screen.getByText(/fields\.totalVolume/)).toBeInTheDocument()

    // Volume values are rendered as "{value}L" inside a <span>
    expect(screen.getByText('300L')).toBeInTheDocument()
    expect(screen.getByText('80L')).toBeInTheDocument()
    expect(screen.getByText('380L')).toBeInTheDocument()
  })

  it('renders setup date', () => {
    const tank = makeTank({ setup_date: '2023-06-15' })
    renderWithProviders(<TankSidebar tank={tank} />)

    expect(screen.getByText('fields.setupDate')).toBeInTheDocument()
    // The formatted date is locale-dependent; just verify the label renders
    expect(screen.getByText(new Date('2023-06-15').toLocaleDateString())).toBeInTheDocument()
  })

  it('renders stats when provided', () => {
    const stats = {
      event_count: 5,
      equipment_count: 3,
      livestock_count: 12,
      photo_count: 8,
      note_count: 2,
      maintenance_count: 1,
      icp_test_count: 0,
      tank_age_days: 200,
    }
    renderWithProviders(<TankSidebar tank={makeTank()} stats={stats} />)

    // The statistics section heading
    expect(screen.getByText('statistics')).toBeInTheDocument()
    // The mocked TankStats renders the stats as JSON
    expect(screen.getByTestId('tank-stats')).toBeInTheDocument()
  })

  it('does not render stats section when stats are not provided', () => {
    renderWithProviders(<TankSidebar tank={makeTank()} />)

    expect(screen.queryByText('statistics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tank-stats')).not.toBeInTheDocument()
  })

  it('shows quick action buttons', () => {
    renderWithProviders(
      <TankSidebar
        tank={makeTank()}
        onEdit={mockOnEdit}
        onAddEvent={mockOnAddEvent}
        onRefresh={mockOnRefresh}
      />
    )

    expect(screen.getByText('quickActions')).toBeInTheDocument()
    // The action link/button texts are prefixed with emojis by the component
    expect(screen.getByText(/actions\.logParameters/)).toBeInTheDocument()
    expect(screen.getByText(/actions\.uploadPhoto/)).toBeInTheDocument()
    expect(screen.getByText(/actions\.addEvent/)).toBeInTheDocument()
    expect(screen.getByText(/actions\.manageEquipment/)).toBeInTheDocument()
    expect(screen.getByText(/actions\.manageLivestock/)).toBeInTheDocument()
  })

  it('does not render addEvent button when onAddEvent is not provided', () => {
    renderWithProviders(<TankSidebar tank={makeTank()} />)

    expect(screen.queryByText(/actions\.addEvent/)).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    renderWithProviders(
      <TankSidebar tank={makeTank()} onEdit={mockOnEdit} />
    )
    const user = userEvent.setup()

    const editButton = screen.getByTitle('editTank')
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('does not render edit button when onEdit is not provided', () => {
    renderWithProviders(<TankSidebar tank={makeTank()} />)

    expect(screen.queryByTitle('editTank')).not.toBeInTheDocument()
  })

  it('shows days running badge', () => {
    const stats = {
      tank_age_days: 150,
    }
    renderWithProviders(
      <TankSidebar tank={makeTank({ setup_date: '2023-06-15' })} stats={stats} />
    )

    // The translation mock returns "stats.daysRunning 150"
    expect(screen.getByText('stats.daysRunning 150')).toBeInTheDocument()
  })

  it('calculates days running from setup_date when stats.tank_age_days is not provided', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ setup_date: '2023-06-15' })} />
    )

    // The component calls calculateDaysUp which computes from setup_date
    // The exact number depends on the current date; just verify the badge is present
    const badge = screen.getByText(/stats\.daysRunning/)
    expect(badge).toBeInTheDocument()
  })

  it('renders description when present', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ description: 'A beautiful mixed reef tank' })} />
    )

    expect(screen.getByText('A beautiful mixed reef tank')).toBeInTheDocument()
  })

  it('does not render description when null', () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ description: null })} />
    )

    expect(screen.queryByText('A beautiful mixed reef tank')).not.toBeInTheDocument()
  })

  it('renders default tank animation when no image is set', async () => {
    renderWithProviders(
      <TankSidebar tank={makeTank({ image_url: null })} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('default-tank-animation')).toBeInTheDocument()
    })
  })

  it('calls onAddEvent when add-event button is clicked', async () => {
    renderWithProviders(
      <TankSidebar tank={makeTank()} onAddEvent={mockOnAddEvent} />
    )
    const user = userEvent.setup()

    const addEventButton = screen.getByText(/actions\.addEvent/)
    await user.click(addEventButton)

    expect(mockOnAddEvent).toHaveBeenCalledTimes(1)
  })

  it('hides volume rows when volumes are null', () => {
    const tank = makeTank({
      display_volume_liters: null,
      sump_volume_liters: null,
      total_volume_liters: 0,
    })
    renderWithProviders(<TankSidebar tank={tank} />)

    expect(screen.queryByText(/fields\.displayVolume/)).not.toBeInTheDocument()
    expect(screen.queryByText(/fields\.sumpVolume/)).not.toBeInTheDocument()
    // Total volume always renders
    expect(screen.getByText(/fields\.totalVolume/)).toBeInTheDocument()
  })
})
