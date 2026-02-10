/**
 * Tests for TankOverview component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import TankOverview from '../tanks/TankOverview'
import type { TankEvent, Equipment, Livestock, Photo, Note, ICPTestSummary } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../../api/client', () => ({
  tanksApi: { getImageBlobUrl: vi.fn().mockResolvedValue('blob:test-url') },
  photosApi: { getFileBlobUrl: vi.fn().mockResolvedValue('blob:test-photo-url') },
}))

globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url')
globalThis.URL.revokeObjectURL = vi.fn()

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
  manufacturer: null,
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

const emptyProps = {
  events: [] as TankEvent[],
  equipment: [] as Equipment[],
  livestock: [] as Livestock[],
  photos: [] as Photo[],
  notes: [] as Note[],
  icpTests: [] as ICPTestSummary[],
}

describe('TankOverview Component', () => {
  it('renders quick stats with correct counts', () => {
    const props = {
      events: [makeEvent()],
      equipment: [makeEquipment(), makeEquipment({ id: 'equip-2', name: 'Heater' })],
      livestock: [makeLivestock(), makeLivestock({ id: 'live-2', species_name: 'Zebrasoma flavescens' })],
      photos: [makePhoto()],
      notes: [makeNote(), makeNote({ id: 'note-2', content: 'Second note' }), makeNote({ id: 'note-3', content: 'Third note' })],
      icpTests: [] as ICPTestSummary[],
    }

    renderWithProviders(<TankOverview {...props} />)

    // The quick stats grid shows livestock, equipment, photos, notes counts
    expect(screen.getByText('stats.livestockCount')).toBeInTheDocument()
    expect(screen.getByText('stats.equipmentCount')).toBeInTheDocument()
    expect(screen.getByText('stats.photoCount')).toBeInTheDocument()
    expect(screen.getByText('stats.noteCount')).toBeInTheDocument()

    // Check the count values: livestock=2, equipment=2, photos=1, notes=3
    const twos = screen.getAllByText('2')
    expect(twos).toHaveLength(2) // livestock and equipment both have count 2
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows empty state when no data is provided', () => {
    renderWithProviders(<TankOverview {...emptyProps} />)

    expect(screen.getByText('emptyState.startStory')).toBeInTheDocument()
    expect(screen.getByText('emptyState.addContent')).toBeInTheDocument()
  })

  it('does not show empty state when events are provided', () => {
    const props = {
      ...emptyProps,
      events: [makeEvent()],
    }

    renderWithProviders(<TankOverview {...props} />)

    expect(screen.queryByText('emptyState.startStory')).not.toBeInTheDocument()
  })

  it('renders recent events when provided', () => {
    const props = {
      ...emptyProps,
      events: [
        makeEvent({ id: 'evt-1', title: 'Water Change', event_date: '2024-01-10T00:00:00Z' }),
        makeEvent({ id: 'evt-2', title: 'Added Coral Frag', event_date: '2024-01-08T00:00:00Z' }),
      ],
    }

    renderWithProviders(<TankOverview {...props} />)

    expect(screen.getByText('recentEvents')).toBeInTheDocument()
    expect(screen.getByText('Water Change')).toBeInTheDocument()
    expect(screen.getByText('Added Coral Frag')).toBeInTheDocument()
  })

  it('renders recent notes when provided', () => {
    const props = {
      ...emptyProps,
      notes: [
        makeNote({ id: 'note-1', content: 'Corals looking healthy today' }),
        makeNote({ id: 'note-2', content: 'Need to dose more calcium' }),
      ],
    }

    renderWithProviders(<TankOverview {...props} />)

    expect(screen.getByText('recentNotes')).toBeInTheDocument()
    expect(screen.getByText('Corals looking healthy today')).toBeInTheDocument()
    expect(screen.getByText('Need to dose more calcium')).toBeInTheDocument()
  })

  it('does not render recent events section when events is empty', () => {
    renderWithProviders(<TankOverview {...emptyProps} />)

    expect(screen.queryByText('recentEvents')).not.toBeInTheDocument()
  })

  it('does not render recent notes section when notes is empty', () => {
    renderWithProviders(<TankOverview {...emptyProps} />)

    expect(screen.queryByText('recentNotes')).not.toBeInTheDocument()
  })

  it('shows zero counts in quick stats when arrays are empty', () => {
    renderWithProviders(<TankOverview {...emptyProps} />)

    // All four quick stat counts should be 0
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(4)
  })
})
