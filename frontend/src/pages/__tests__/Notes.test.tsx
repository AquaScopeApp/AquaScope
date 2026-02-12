/**
 * Tests for Notes page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Notes from '../Notes'
import type { Note, Tank } from '../../types'

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
  notesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tanksApi: {
    list: vi.fn(),
  },
}))

import { notesApi, tanksApi } from '../../api'

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderNotes() {
  return render(
    <BrowserRouter>
      <Notes />
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

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  content: 'Water parameters looking good today.',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks(notes: Note[] = [], tanks: Tank[] = []) {
  vi.mocked(notesApi.list).mockResolvedValue(notes)
  vi.mocked(tanksApi.list).mockResolvedValue(tanks)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notes Page', () => {
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
    vi.mocked(notesApi.list).mockReturnValue(new Promise(() => {}))
    vi.mocked(tanksApi.list).mockReturnValue(new Promise(() => {}))

    renderNotes()

    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('renders title and subtitle after loading', async () => {
    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('subtitle')).toBeInTheDocument()
    })
  })

  it('renders new-note button', async () => {
    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('newNote')).toBeInTheDocument()
    })
  })

  it('shows empty state when there are no notes', async () => {
    setupDefaultMocks([], [makeTank()])

    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('noNotes')).toBeInTheDocument()
      expect(screen.getByText('startDocumenting')).toBeInTheDocument()
      expect(screen.getByText('createFirst')).toBeInTheDocument()
    })
  })

  it('renders stats cards with correct totals', async () => {
    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('totalNotes')).toBeInTheDocument()
      expect(screen.getByText('thisMonth')).toBeInTheDocument()
      expect(screen.getByText('avgPerWeek')).toBeInTheDocument()
    })
  })

  it('calls API methods on mount', async () => {
    renderNotes()

    await waitFor(() => {
      expect(notesApi.list).toHaveBeenCalledTimes(1)
      expect(tanksApi.list).toHaveBeenCalledTimes(1)
    })
  })

  it('renders note cards when notes exist', async () => {
    const note = makeNote({ content: 'Added new coral frag today' })
    setupDefaultMocks([note], [makeTank()])

    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('Added new coral frag today')).toBeInTheDocument()
    })
  })

  it('opens editor when new-note button is clicked', async () => {
    setupDefaultMocks([], [makeTank()])

    renderNotes()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('newNote')).toBeInTheDocument()
    })

    await user.click(screen.getByText('newNote'))

    // NoteEditor is rendered when showEditor becomes true
    await waitFor(() => {
      // The NoteEditor component should now be in the DOM
      // It will render some form elements; we check for the overlay or form content
      const editorElements = document.querySelectorAll('textarea, [role="textbox"]')
      expect(editorElements.length).toBeGreaterThan(0)
    })
  })

  it('shows correct note count in stats', async () => {
    const notes = [
      makeNote({ id: 'note-1' }),
      makeNote({ id: 'note-2' }),
      makeNote({ id: 'note-3' }),
    ]
    setupDefaultMocks(notes, [makeTank()])

    renderNotes()

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })
})
