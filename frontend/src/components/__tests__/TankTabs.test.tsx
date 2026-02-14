/**
 * Tests for TankTabs component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import TankTabs from '../tanks/TankTabs'
import type { Tank, TankEvent, Equipment, Livestock, Consumable, Photo, Note, MaintenanceReminder, ICPTestSummary, DiseaseRecord } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../../api', () => ({
  photosApi: { getFileBlobUrl: vi.fn().mockResolvedValue('blob:test-photo') },
  livestockApi: { getFishBaseSpeciesImages: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../tanks/TankOverview', () => ({
  default: () => <div data-testid="tank-overview">Overview</div>,
}))

vi.mock('../tanks/TankTimeline', () => ({
  default: () => <div data-testid="tank-timeline">Timeline</div>,
}))

vi.mock('../tanks/TankTimelineVisual', () => ({
  default: () => <div data-testid="tank-timeline-visual">TimelineVisual</div>,
  CATEGORY_LABELS: {},
}))

vi.mock('../../utils/timeline', () => ({
  buildTimelineEntries: () => [],
  CATEGORY_COLORS: {},
}))

globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
globalThis.URL.revokeObjectURL = vi.fn()

// --- Factory helpers ---

const makeTank = (overrides: Partial<Tank> = {}): Tank => ({
  id: 'tank-1',
  user_id: 'user-1',
  name: 'Test Tank',
  water_type: 'saltwater',
  aquarium_subtype: null,
  display_volume_liters: 200,
  sump_volume_liters: 50,
  total_volume_liters: 250,
  description: null,
  image_url: null,
  setup_date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  events: [],
  ...overrides,
})

const makeEvent = (overrides: Partial<TankEvent> = {}): TankEvent => ({
  id: 'evt-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  title: 'Water Change',
  description: null,
  event_date: '2024-01-10T00:00:00Z',
  event_type: null,
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
  ...overrides,
})

const makeEquipment = (overrides: Partial<Equipment> = {}): Equipment => ({
  id: 'equip-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  name: 'Protein Skimmer',
  equipment_type: 'filtration',
  manufacturer: 'Aqua Medic',
  model: null,
  specs: null,
  purchase_date: null,
  purchase_price: null,
  condition: null,
  status: 'active',
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeLivestock = (overrides: Partial<Livestock> = {}): Livestock => ({
  id: 'live-1',
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
  added_date: null,
  removed_date: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makePhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: 'photo-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  filename: 'tank-photo.jpg',
  file_path: '/uploads/tank-photo.jpg',
  thumbnail_path: null,
  description: 'Full tank shot',
  taken_at: '2024-01-10T00:00:00Z',
  is_tank_display: false,
  created_at: '2024-01-10T00:00:00Z',
  ...overrides,
})

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  content: 'Corals looking healthy today',
  created_at: '2024-01-10T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
  ...overrides,
})

const makeMaintenance = (overrides: Partial<MaintenanceReminder> = {}): MaintenanceReminder => ({
  id: 'maint-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  equipment_id: null,
  title: 'Water Change',
  description: null,
  reminder_type: 'water_change',
  frequency_days: 7,
  last_completed: null,
  next_due: '2025-01-20T00:00:00Z',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const makeICPTest = (overrides: Partial<ICPTestSummary> = {}): ICPTestSummary => ({
  id: 'icp-1',
  tank_id: 'tank-1',
  test_date: '2024-01-05T00:00:00Z',
  lab_name: 'Triton',
  water_type: 'saltwater',
  score_overall: 85,
  score_major_elements: 90,
  score_minor_elements: 80,
  score_pollutants: 75,
  created_at: '2024-01-05T00:00:00Z',
  ...overrides,
})

// --- Default props ---

const defaultCallbacks = {
  onCreateEvent: vi.fn().mockResolvedValue(undefined),
  onUpdateEvent: vi.fn().mockResolvedValue(undefined),
  onDeleteEvent: vi.fn().mockResolvedValue(undefined),
  onRefresh: vi.fn(),
}

const emptyProps = {
  tank: makeTank(),
  events: [] as TankEvent[],
  equipment: [] as Equipment[],
  livestock: [] as Livestock[],
  photos: [] as Photo[],
  notes: [] as Note[],
  maintenance: [] as MaintenanceReminder[],
  icpTests: [] as ICPTestSummary[],
  consumables: [] as Consumable[],
  diseases: [] as DiseaseRecord[],
  ...defaultCallbacks,
}

describe('TankTabs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 9 tab buttons', () => {
    renderWithProviders(<TankTabs {...emptyProps} />)

    expect(screen.getByText('tabs.overview')).toBeInTheDocument()
    expect(screen.getByText('tabs.events')).toBeInTheDocument()
    expect(screen.getByText('tabs.equipment')).toBeInTheDocument()
    expect(screen.getByText('tabs.livestock')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('tabs.photos')).toBeInTheDocument()
    expect(screen.getByText('tabs.notes')).toBeInTheDocument()
    expect(screen.getByText('tabs.icpTests')).toBeInTheDocument()
    expect(screen.getByText('tabs.maintenance')).toBeInTheDocument()
  })

  it('shows tab counts for tabs with data', () => {
    const props = {
      ...emptyProps,
      events: [
        makeEvent({ id: 'evt-1' }),
        makeEvent({ id: 'evt-2' }),
        makeEvent({ id: 'evt-3' }),
      ],
      equipment: [
        makeEquipment({ id: 'equip-1' }),
        makeEquipment({ id: 'equip-2' }),
      ],
      livestock: [makeLivestock({ id: 'live-1' })],
      photos: [makePhoto({ id: 'photo-1' }), makePhoto({ id: 'photo-2' })],
      notes: [makeNote({ id: 'note-1' })],
      icpTests: [makeICPTest({ id: 'icp-1' })],
      maintenance: [
        makeMaintenance({ id: 'maint-1', is_active: true }),
        makeMaintenance({ id: 'maint-2', is_active: false }),
      ],
    }

    renderWithProviders(<TankTabs {...props} />)

    // Events count = 3
    expect(screen.getByText('3')).toBeInTheDocument()
    // Equipment count = 2, Photos count = 2
    const twos = screen.getAllByText('2')
    expect(twos.length).toBeGreaterThanOrEqual(2)
    // Livestock count = 1, Notes count = 1, ICP count = 1, Maintenance active count = 1
    const ones = screen.getAllByText('1')
    expect(ones.length).toBeGreaterThanOrEqual(4)
  })

  it('defaults to Overview tab and shows overview content', () => {
    renderWithProviders(<TankTabs {...emptyProps} />)

    expect(screen.getByTestId('tank-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('tank-timeline')).not.toBeInTheDocument()
  })

  it('switches to Events tab on click and shows timeline', async () => {
    renderWithProviders(<TankTabs {...emptyProps} />)
    const user = userEvent.setup()

    const eventsTab = screen.getByText('tabs.events')
    await user.click(eventsTab)

    expect(screen.getByTestId('tank-timeline')).toBeInTheDocument()
    expect(screen.queryByTestId('tank-overview')).not.toBeInTheDocument()
  })

  it('switches to Equipment tab and shows equipment list', async () => {
    const props = {
      ...emptyProps,
      equipment: [
        makeEquipment({ id: 'equip-1', name: 'Protein Skimmer', equipment_type: 'filtration', manufacturer: 'Aqua Medic' }),
        makeEquipment({ id: 'equip-2', name: 'Heater', equipment_type: 'heating', manufacturer: 'Eheim', status: 'active' }),
      ],
    }

    renderWithProviders(<TankTabs {...props} />)
    const user = userEvent.setup()

    const equipmentTab = screen.getByText('tabs.equipment')
    await user.click(equipmentTab)

    // Equipment names are rendered
    expect(screen.getByText('Protein Skimmer')).toBeInTheDocument()
    expect(screen.getByText('Heater')).toBeInTheDocument()
    // Equipment type + manufacturer are rendered in combined subtitle
    expect(screen.getByText('filtration · Aqua Medic')).toBeInTheDocument()
    expect(screen.getByText('heating · Eheim')).toBeInTheDocument()
  })

  it('shows empty state for tabs with no data', async () => {
    renderWithProviders(<TankTabs {...emptyProps} />)
    const user = userEvent.setup()

    // Equipment tab empty state
    await user.click(screen.getByText('tabs.equipment'))
    expect(screen.getByText('emptyState.noEquipment')).toBeInTheDocument()

    // Livestock tab empty state
    await user.click(screen.getByText('tabs.livestock'))
    expect(screen.getByText('emptyState.noLivestock')).toBeInTheDocument()

    // Photos tab empty state
    await user.click(screen.getByText('tabs.photos'))
    expect(screen.getByText('emptyState.noPhotos')).toBeInTheDocument()

    // Notes tab empty state
    await user.click(screen.getByText('tabs.notes'))
    expect(screen.getByText('emptyState.noNotes')).toBeInTheDocument()

    // ICP Tests tab empty state
    await user.click(screen.getByText('tabs.icpTests'))
    expect(screen.getByText('emptyState.noIcpTests')).toBeInTheDocument()

    // Maintenance tab empty state
    await user.click(screen.getByText('tabs.maintenance'))
    expect(screen.getByText('emptyState.noMaintenance')).toBeInTheDocument()
  })
})
