/**
 * Tests for NoteEditor component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteEditor from '../notes/NoteEditor'
import type { Note, Tank } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

const tanks: Tank[] = [
  {
    id: 'tank-1',
    user_id: 'user-1',
    name: 'My Reef',
    water_type: 'saltwater',
    aquarium_subtype: null,
    display_volume_liters: 300,
    sump_volume_liters: 0,
    total_volume_liters: 300,
    description: null,
    image_url: null,
    setup_date: null,
    electricity_cost_per_day: null,
    is_archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    events: [],
  },
  {
    id: 'tank-2',
    user_id: 'user-1',
    name: 'Freshwater',
    water_type: 'freshwater',
    aquarium_subtype: null,
    display_volume_liters: 100,
    sump_volume_liters: 0,
    total_volume_liters: 100,
    description: null,
    image_url: null,
    setup_date: null,
    electricity_cost_per_day: null,
    is_archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    events: [],
  },
]

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  tank_id: 'tank-1',
  user_id: 'user-1',
  content: 'Existing note content',
  created_at: '2024-06-15T10:30:00Z',
  updated_at: '2024-06-15T10:30:00Z',
  ...overrides,
})

describe('NoteEditor', () => {
  const mockSave = vi.fn()
  const mockCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- Rendering: new note mode (note = null) ----------

  it('renders "New Note" heading when note is null', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('New Note')).toBeInTheDocument()
  })

  it('renders tank selector when creating a new note', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const select = screen.getByLabelText(/Tank/)
    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe('SELECT')
  })

  it('lists all tanks in the selector', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('My Reef')
    expect(options[1]).toHaveTextContent('Freshwater')
  })

  it('defaults to the first tank when creating a new note', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const select = screen.getByLabelText(/Tank/) as HTMLSelectElement
    expect(select.value).toBe('tank-1')
  })

  it('renders an empty textarea for new note', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const textarea = screen.getByLabelText(/Note Content/) as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })

  it('renders "Create Note" on the submit button for new note', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('Create Note')).toBeInTheDocument()
  })

  it('shows character count as 0 for new note', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('0 characters')).toBeInTheDocument()
  })

  it('renders formatting tips section', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('Formatting Tips')).toBeInTheDocument()
    expect(screen.getByText(/Press Enter twice/)).toBeInTheDocument()
  })

  // ---------- Rendering: edit mode (note provided) ----------

  it('renders "Edit Note" heading when a note is provided', () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('Edit Note')).toBeInTheDocument()
  })

  it('does not render tank selector when editing', () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.queryByLabelText(/Tank/)).not.toBeInTheDocument()
  })

  it('pre-fills the textarea with existing note content', () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const textarea = screen.getByLabelText(/Note Content/) as HTMLTextAreaElement
    expect(textarea.value).toBe('Existing note content')
  })

  it('renders "Update Note" on the submit button for existing note', () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    expect(screen.getByText('Update Note')).toBeInTheDocument()
  })

  it('shows correct character count for existing note', () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    // 'Existing note content' is 21 characters
    expect(screen.getByText('21 characters')).toBeInTheDocument()
  })

  // ---------- User interactions: typing ----------

  it('updates character count as user types', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, 'Hello')

    expect(screen.getByText('5 characters')).toBeInTheDocument()
  })

  it('allows changing the selected tank', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const select = screen.getByLabelText(/Tank/) as HTMLSelectElement

    await user.selectOptions(select, 'tank-2')
    expect(select.value).toBe('tank-2')
  })

  // ---------- Submit / validation ----------

  it('submit button is disabled when content is empty', () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const submitBtn = screen.getByText('Create Note')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button is disabled when content is only whitespace', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, '   ')

    const submitBtn = screen.getByText('Create Note')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button is enabled when content is non-empty', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, 'Some content')

    const submitBtn = screen.getByText('Create Note')
    expect(submitBtn).not.toBeDisabled()
  })

  it('calls onSave with tankId and content on form submit', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, 'New note text')

    const submitBtn = screen.getByText('Create Note')
    await user.click(submitBtn)

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith('tank-1', 'New note text')
  })

  it('calls onSave with selected tank when a different tank is chosen', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const select = screen.getByLabelText(/Tank/)
    await user.selectOptions(select, 'tank-2')

    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, 'Note for freshwater')

    await user.click(screen.getByText('Create Note'))

    expect(mockSave).toHaveBeenCalledWith('tank-2', 'Note for freshwater')
  })

  it('calls onSave with existing tank_id and updated content when editing', async () => {
    render(
      <NoteEditor note={makeNote()} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/) as HTMLTextAreaElement

    // Clear existing content and type new content
    await user.clear(textarea)
    await user.type(textarea, 'Updated content')

    await user.click(screen.getByText('Update Note'))

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith('tank-1', 'Updated content')
  })

  it('does not call onSave when content is empty on submit attempt', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    // The submit button is disabled, so we cannot click it effectively
    const submitBtn = screen.getByText('Create Note')
    expect(submitBtn).toBeDisabled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  // ---------- Cancel ----------

  it('calls onCancel when Cancel button is clicked', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    await user.click(screen.getByText('Cancel'))

    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel without calling onSave', async () => {
    render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/Note Content/)
    await user.type(textarea, 'Typed but not saved')

    await user.click(screen.getByText('Cancel'))

    expect(mockCancel).toHaveBeenCalledTimes(1)
    expect(mockSave).not.toHaveBeenCalled()
  })

  // ---------- Edge cases ----------

  it('handles empty tanks array gracefully for new note', () => {
    render(
      <NoteEditor note={null} tanks={[]} onSave={mockSave} onCancel={mockCancel} />
    )
    // Should still render the form without crashing
    expect(screen.getByText('New Note')).toBeInTheDocument()
    // Submit should be disabled since tankId will be empty string
    expect(screen.getByText('Create Note')).toBeDisabled()
  })

  it('renders the modal overlay', () => {
    const { container } = render(
      <NoteEditor note={null} tanks={tanks} onSave={mockSave} onCancel={mockCancel} />
    )
    const overlay = container.firstChild as HTMLElement
    expect(overlay.className).toContain('fixed')
    expect(overlay.className).toContain('inset-0')
    expect(overlay.className).toContain('z-50')
  })
})
