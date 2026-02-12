/**
 * Tests for NoteCard component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import NoteCard from '../notes/NoteCard'
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
  content: 'Short observation about the tank.',
  created_at: '2024-06-15T10:30:00Z',
  updated_at: '2024-06-15T10:30:00Z',
  ...overrides,
})

describe('NoteCard', () => {
  const mockEdit = vi.fn()
  const mockDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------- Rendering ----------

  it('renders note content', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.getByText('Short observation about the tank.')).toBeInTheDocument()
  })

  it('renders the date badge with day, month, and year', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Jun')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
  })

  it('renders the formatted time', () => {
    const note = makeNote()
    render(
      <NoteCard note={note} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    // Use the same format function as the component so the test is timezone-agnostic
    const expectedTime = format(new Date(note.created_at), 'h:mm a')
    expect(screen.getByText(expectedTime)).toBeInTheDocument()
  })

  it('shows tank name when multiple tanks are provided', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.getByText('My Reef')).toBeInTheDocument()
  })

  it('does not show tank name when only one tank is provided', () => {
    render(
      <NoteCard
        note={makeNote()}
        tanks={[tanks[0]]}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.queryByText('My Reef')).not.toBeInTheDocument()
  })

  it('shows "Unknown" when note tank_id does not match any tank and multiple tanks exist', () => {
    render(
      <NoteCard
        note={makeNote({ tank_id: 'nonexistent' })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  // ---------- Edited indicator ----------

  it('shows "edited" label when updated_at differs from created_at', () => {
    const editedNote = makeNote({
      created_at: '2024-06-15T10:30:00Z',
      updated_at: '2024-06-16T12:00:00Z',
    })
    render(
      <NoteCard note={editedNote} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.getByText('edited')).toBeInTheDocument()
  })

  it('does not show "edited" label when updated_at equals created_at', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.queryByText('edited')).not.toBeInTheDocument()
  })

  // ---------- Long content expand/collapse ----------

  it('shows "Show more..." button for long content (>250 chars)', () => {
    const longContent = 'A'.repeat(300)
    render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('Show more...')).toBeInTheDocument()
  })

  it('shows "Show more..." button for content with more than 4 lines', () => {
    const multiLineContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    render(
      <NoteCard
        note={makeNote({ content: multiLineContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('Show more...')).toBeInTheDocument()
  })

  it('does not show "Show more..." for short content', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.queryByText('Show more...')).not.toBeInTheDocument()
  })

  it('applies line-clamp-3 class when long content is collapsed', () => {
    const longContent = 'A'.repeat(300)
    render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const contentEl = screen.getByText(longContent)
    expect(contentEl.className).toContain('line-clamp-3')
  })

  it('expands long content when "Show more..." button is clicked', async () => {
    const longContent = 'A'.repeat(300)
    render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByText('Show more...'))

    const contentEl = screen.getByText(longContent)
    expect(contentEl.className).not.toContain('line-clamp-3')
    expect(screen.queryByText('Show more...')).not.toBeInTheDocument()
  })

  it('toggles expanded state when clicking the card with long content', async () => {
    const longContent = 'A'.repeat(300)
    const { container } = render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()
    const card = container.firstChild as HTMLElement

    // Click card to expand
    await user.click(card)
    const contentEl = screen.getByText(longContent)
    expect(contentEl.className).not.toContain('line-clamp-3')

    // Click card again to collapse
    await user.click(card)
    expect(contentEl.className).toContain('line-clamp-3')
  })

  it('does not toggle expanded state when clicking the card with short content', async () => {
    const { container } = render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    const user = userEvent.setup()
    const card = container.firstChild as HTMLElement

    // Clicking should not cause any change; "Show more..." should still be absent
    await user.click(card)
    expect(screen.queryByText('Show more...')).not.toBeInTheDocument()
  })

  // ---------- User interactions ----------

  it('calls onEdit with the note when edit button is clicked', async () => {
    const note = makeNote()
    render(
      <NoteCard note={note} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    const user = userEvent.setup()
    const editBtn = screen.getByTitle('Edit')
    await user.click(editBtn)
    expect(mockEdit).toHaveBeenCalledTimes(1)
    expect(mockEdit).toHaveBeenCalledWith(note)
  })

  it('calls onDelete with the note id when delete button is clicked', async () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    const user = userEvent.setup()
    const deleteBtn = screen.getByTitle('Delete')
    await user.click(deleteBtn)
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockDelete).toHaveBeenCalledWith('note-1')
  })

  it('edit button click does not propagate to the card (stopPropagation)', async () => {
    const longContent = 'A'.repeat(300)
    render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()

    // Content should start collapsed
    const contentEl = screen.getByText(longContent)
    expect(contentEl.className).toContain('line-clamp-3')

    // Click edit -- should NOT toggle the expand state
    await user.click(screen.getByTitle('Edit'))
    expect(contentEl.className).toContain('line-clamp-3')
  })

  it('delete button click does not propagate to the card (stopPropagation)', async () => {
    const longContent = 'A'.repeat(300)
    render(
      <NoteCard
        note={makeNote({ content: longContent })}
        tanks={tanks}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()

    const contentEl = screen.getByText(longContent)
    expect(contentEl.className).toContain('line-clamp-3')

    // Click delete -- should NOT toggle the expand state
    await user.click(screen.getByTitle('Delete'))
    expect(contentEl.className).toContain('line-clamp-3')
  })

  // ---------- Action button presence ----------

  it('renders edit and delete buttons', () => {
    render(
      <NoteCard note={makeNote()} tanks={tanks} onEdit={mockEdit} onDelete={mockDelete} />
    )
    expect(screen.getByTitle('Edit')).toBeInTheDocument()
    expect(screen.getByTitle('Delete')).toBeInTheDocument()
  })
})
