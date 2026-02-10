/**
 * Tests for TankCard component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import TankCard from '../tanks/TankCard'
import type { Tank } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.age) return `${key} ${opts.age}`
      if (opts?.defaultValue) return opts.defaultValue
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../../api', () => ({
  tanksApi: { getImageBlobUrl: vi.fn().mockResolvedValue('blob:test-url') },
  photosApi: { getFileBlobUrl: vi.fn().mockResolvedValue('blob:test-photo-url') },
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

describe('TankCard Component', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tank name', () => {
    const tank = makeTank()
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('My Reef Tank')).toBeInTheDocument()
  })

  it('renders water type badge via aquarium subtype', () => {
    const tank = makeTank({ aquarium_subtype: 'mixed_reef' })
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    // The subtype badge renders with t(`subtype.${tank.aquarium_subtype}`, { defaultValue: ... })
    // Our mock returns defaultValue, so "mixed reef" (with underscore replaced by space)
    expect(screen.getByText('mixed reef')).toBeInTheDocument()
  })

  it('renders volume information', () => {
    const tank = makeTank({
      display_volume_liters: 300,
      sump_volume_liters: 80,
      total_volume_liters: 380,
    })
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('fields.displayVolume')).toBeInTheDocument()
    expect(screen.getByText('fields.sumpVolume')).toBeInTheDocument()
    // Display volume: "300 fields.liters"
    expect(screen.getByText('300 fields.liters')).toBeInTheDocument()
    // Sump volume: "80 fields.liters"
    expect(screen.getByText('80 fields.liters')).toBeInTheDocument()
    // Total volume
    expect(screen.getByText('380.0 fields.liters')).toBeInTheDocument()
  })

  it('calls onEdit callback when edit button is clicked', async () => {
    const tank = makeTank()
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )
    const user = userEvent.setup()

    const editButton = screen.getByTitle('editTank')
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledTimes(1)
    expect(mockOnEdit).toHaveBeenCalledWith(tank)
  })

  it('calls onDelete callback when delete button is clicked', async () => {
    const tank = makeTank()
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )
    const user = userEvent.setup()

    const deleteButton = screen.getByTitle('deleteTank')
    await user.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('tank-1')
  })

  it('handles tank with no events', () => {
    const tank = makeTank({ events: [] })
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    // The "recentEvents" section should not render when events is empty
    expect(screen.queryByText('recentEvents')).not.toBeInTheDocument()
  })

  it('shows setup date', () => {
    const tank = makeTank({ setup_date: '2023-06-15' })
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('fields.setupDate')).toBeInTheDocument()
    // The formatted date will be locale-dependent; just check the label is present
    // and that the date container does not show "notSet"
    expect(screen.queryByText('notSet')).not.toBeInTheDocument()
  })

  it('shows notSet when setup date is null', () => {
    const tank = makeTank({ setup_date: null })
    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('notSet')).toBeInTheDocument()
  })

  it('renders recent events when tank has events', () => {
    const tank = makeTank({
      events: [
        {
          id: 'evt-1',
          tank_id: 'tank-1',
          user_id: 'user-1',
          title: 'Water Change',
          description: null,
          event_date: '2024-01-10T00:00:00Z',
          event_type: null,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-10T00:00:00Z',
        },
        {
          id: 'evt-2',
          tank_id: 'tank-1',
          user_id: 'user-1',
          title: 'Added New Coral',
          description: null,
          event_date: '2024-01-08T00:00:00Z',
          event_type: null,
          created_at: '2024-01-08T00:00:00Z',
          updated_at: '2024-01-08T00:00:00Z',
        },
      ],
    })

    renderWithProviders(
      <TankCard tank={tank} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    )

    expect(screen.getByText('recentEvents')).toBeInTheDocument()
    expect(screen.getByText('Water Change')).toBeInTheDocument()
    expect(screen.getByText('Added New Coral')).toBeInTheDocument()
  })
})
