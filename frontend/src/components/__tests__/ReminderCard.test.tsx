/**
 * Tests for ReminderCard component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReminderCard from '../maintenance/ReminderCard'
import type { MaintenanceReminder, Tank } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.count !== undefined) return `${opts.count} days`
      if (opts?.defaultValue) return opts.defaultValue
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

const tanks: Tank[] = [{
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
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  events: [],
}]

const makeReminder = (overrides: Partial<MaintenanceReminder> = {}): MaintenanceReminder => ({
  id: 'rem-1',
  user_id: 'user-1',
  tank_id: 'tank-1',
  title: 'Water Change',
  description: 'Weekly water change',
  reminder_type: 'water_change',
  frequency_days: 7,
  next_due: new Date(Date.now() + 86400000 * 3).toISOString(),
  last_completed: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('ReminderCard', () => {
  const mockComplete = vi.fn()
  const mockEdit = vi.fn()
  const mockDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders reminder title', () => {
    render(
      <ReminderCard
        reminder={makeReminder()}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('Water Change')).toBeInTheDocument()
  })

  it('shows description when present', () => {
    render(
      <ReminderCard
        reminder={makeReminder({ description: 'Test description' })}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('applies red styling for overdue reminders', () => {
    const overdue = makeReminder({
      next_due: new Date(Date.now() - 86400000 * 5).toISOString(),
    })
    const { container } = render(
      <ReminderCard
        reminder={overdue}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-red-300')
    expect(card.className).toContain('bg-red-50')
  })

  it('applies yellow styling for due soon reminders', () => {
    const dueSoon = makeReminder({
      next_due: new Date(Date.now() + 86400000 * 2).toISOString(),
    })
    const { container } = render(
      <ReminderCard
        reminder={dueSoon}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-yellow-300')
  })

  it('applies green styling for upcoming reminders', () => {
    const upcoming = makeReminder({
      next_due: new Date(Date.now() + 86400000 * 30).toISOString(),
    })
    const { container } = render(
      <ReminderCard
        reminder={upcoming}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-green-300')
  })

  it('applies gray styling for inactive reminders', () => {
    const inactive = makeReminder({ is_active: false })
    const { container } = render(
      <ReminderCard
        reminder={inactive}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-gray-300')
    expect(card.className).toContain('opacity-60')
  })

  it('includes dark mode classes on card', () => {
    const overdue = makeReminder({
      next_due: new Date(Date.now() - 86400000 * 5).toISOString(),
    })
    const { container } = render(
      <ReminderCard
        reminder={overdue}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('dark:border-red-700')
    expect(card.className).toContain('dark:bg-red-900/30')
  })

  it('calls onComplete when check button is clicked', async () => {
    render(
      <ReminderCard
        reminder={makeReminder()}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()
    const completeBtn = screen.getByTitle('Mark complete')
    await user.click(completeBtn)
    expect(mockComplete).toHaveBeenCalledWith('rem-1')
  })

  it('calls onEdit when edit button is clicked', async () => {
    const reminder = makeReminder()
    render(
      <ReminderCard
        reminder={reminder}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()
    const editBtn = screen.getByTitle('actions.edit')
    await user.click(editBtn)
    expect(mockEdit).toHaveBeenCalledWith(reminder)
  })

  it('calls onDelete when delete button is clicked', async () => {
    render(
      <ReminderCard
        reminder={makeReminder()}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    const user = userEvent.setup()
    const deleteBtn = screen.getByTitle('actions.delete')
    await user.click(deleteBtn)
    expect(mockDelete).toHaveBeenCalledWith('rem-1')
  })

  it('shows water emoji for water change type', () => {
    render(
      <ReminderCard
        reminder={makeReminder({ reminder_type: 'water_change' })}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('💧')).toBeInTheDocument()
  })

  it('shows gear emoji for equipment type', () => {
    render(
      <ReminderCard
        reminder={makeReminder({ reminder_type: 'equipment_check' })}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.getByText('⚙️')).toBeInTheDocument()
  })

  it('hides complete button for inactive reminders', () => {
    render(
      <ReminderCard
        reminder={makeReminder({ is_active: false })}
        tanks={tanks}
        onComplete={mockComplete}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    )
    expect(screen.queryByTitle('Mark complete')).not.toBeInTheDocument()
  })
})
