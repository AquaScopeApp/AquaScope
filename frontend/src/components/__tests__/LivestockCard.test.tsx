/**
 * Tests for LivestockCard component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LivestockCard from '../livestock/LivestockCard'
import type { Livestock, Tank } from '../../types'

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: any) => {
      if (opts?.defaultValue) return opts.defaultValue
      if (ns === 'livestock') {
        if (key === 'split.title') return 'Split'
        if (key === 'split.description') return `Split ${opts?.total} ${opts?.name}`
        if (key === 'split.remaining') return `${opts?.count} remaining`
        if (key === 'split.confirm') return 'Confirm'
        if (key === 'status.dead') return 'Dead'
        if (key === 'status.removed') return 'Removed'
        if (key === 'card.viewStore') return 'View store'
        if (key === 'card.total') return 'Total'
      }
      return key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

vi.mock('../../api', () => ({
  livestockApi: {
    getINaturalistSpecies: vi.fn(),
    getFishBaseSpeciesImages: vi.fn(),
  },
}))

vi.mock('../../utils/price', () => ({
  parsePrice: (p: string) => {
    const n = parseFloat(p.replace(/[^0-9.]/g, ''))
    return isNaN(n) ? null : n
  },
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

const makeLivestock = (overrides: Partial<Livestock> = {}): Livestock => ({
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
  quantity: 1,
  status: 'alive',
  added_date: '2024-06-01T00:00:00Z',
  removed_date: null,
  notes: null,
  purchase_price: null,
  purchase_url: null,
  is_archived: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('LivestockCard', () => {
  const mockEdit = vi.fn()
  const mockDelete = vi.fn()
  const mockSplit = vi.fn()
  const mockArchive = vi.fn()
  const mockUnarchive = vi.fn()

  const defaultProps = {
    tanks,
    onEdit: mockEdit,
    onDelete: mockDelete,
    onSplit: mockSplit,
    onArchive: mockArchive,
    onUnarchive: mockUnarchive,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders common name and species name', () => {
    render(<LivestockCard livestock={makeLivestock()} {...defaultProps} />)
    expect(screen.getByText('Clownfish')).toBeInTheDocument()
    expect(screen.getByText('Amphiprion ocellaris')).toBeInTheDocument()
  })

  it('renders species name as title when no common name', () => {
    render(<LivestockCard livestock={makeLivestock({ common_name: null })} {...defaultProps} />)
    expect(screen.getByText('Amphiprion ocellaris')).toBeInTheDocument()
  })

  it('shows fish emoji for fish type', () => {
    render(<LivestockCard livestock={makeLivestock({ type: 'fish' })} {...defaultProps} />)
    expect(screen.getByText('🐠')).toBeInTheDocument()
  })

  it('shows coral emoji for coral type', () => {
    render(<LivestockCard livestock={makeLivestock({ type: 'coral' })} {...defaultProps} />)
    expect(screen.getByText('🪸')).toBeInTheDocument()
  })

  it('shows shrimp emoji for invertebrate type', () => {
    render(<LivestockCard livestock={makeLivestock({ type: 'invertebrate' })} {...defaultProps} />)
    expect(screen.getByText('🦐')).toBeInTheDocument()
  })

  it('applies blue border for fish type', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ type: 'fish' })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-blue-300')
    expect(card.className).toContain('dark:border-blue-700')
  })

  it('applies purple border for coral type', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ type: 'coral' })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-purple-300')
    expect(card.className).toContain('dark:border-purple-700')
  })

  it('applies orange border for invertebrate type', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ type: 'invertebrate' })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-orange-300')
    expect(card.className).toContain('dark:border-orange-700')
  })

  it('applies gray styling for dead livestock', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ status: 'dead' })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-gray-300')
    expect(card.className).toContain('opacity-75')
  })

  it('applies gray styling for removed livestock', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ status: 'removed' })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-gray-300')
    expect(card.className).toContain('opacity-75')
  })

  it('applies reduced opacity for archived livestock', () => {
    const { container } = render(<LivestockCard livestock={makeLivestock({ is_archived: true })} {...defaultProps} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('opacity-60')
  })

  it('shows quantity badge when quantity > 1', () => {
    render(<LivestockCard livestock={makeLivestock({ quantity: 3 })} {...defaultProps} />)
    expect(screen.getByText('x3')).toBeInTheDocument()
  })

  it('does not show quantity badge when quantity is 1', () => {
    render(<LivestockCard livestock={makeLivestock({ quantity: 1 })} {...defaultProps} />)
    expect(screen.queryByText('x1')).not.toBeInTheDocument()
  })

  it('shows dead badge for dead livestock', () => {
    render(<LivestockCard livestock={makeLivestock({ status: 'dead' })} {...defaultProps} />)
    expect(screen.getByText('Dead')).toBeInTheDocument()
  })

  it('shows removed badge for removed livestock', () => {
    render(<LivestockCard livestock={makeLivestock({ status: 'removed' })} {...defaultProps} />)
    expect(screen.getByText('Removed')).toBeInTheDocument()
  })

  it('shows archived badge', () => {
    render(<LivestockCard livestock={makeLivestock({ is_archived: true })} {...defaultProps} />)
    expect(screen.getByText('archivedStatus')).toBeInTheDocument()
  })

  it('shows purchase price', () => {
    render(<LivestockCard livestock={makeLivestock({ purchase_price: '29.99' })} {...defaultProps} />)
    expect(screen.getByText('29.99')).toBeInTheDocument()
  })

  it('shows total price for multi-quantity', () => {
    render(<LivestockCard livestock={makeLivestock({ purchase_price: '10.00', quantity: 3 })} {...defaultProps} />)
    expect(screen.getByText('(30.00)')).toBeInTheDocument()
  })

  it('shows notes when present', () => {
    render(<LivestockCard livestock={makeLivestock({ notes: 'Healthy and active' })} {...defaultProps} />)
    expect(screen.getByText('Healthy and active')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const livestock = makeLivestock()
    render(<LivestockCard livestock={livestock} {...defaultProps} />)
    const user = userEvent.setup()
    await user.click(screen.getByTitle('actions.edit'))
    expect(mockEdit).toHaveBeenCalledWith(livestock)
  })

  it('calls onDelete when delete button is clicked', async () => {
    render(<LivestockCard livestock={makeLivestock()} {...defaultProps} />)
    const user = userEvent.setup()
    await user.click(screen.getByTitle('actions.delete'))
    expect(mockDelete).toHaveBeenCalledWith('ls-1')
  })

  it('calls onArchive when archive button is clicked', async () => {
    render(<LivestockCard livestock={makeLivestock()} {...defaultProps} />)
    const user = userEvent.setup()
    await user.click(screen.getByTitle('actions.archive'))
    expect(mockArchive).toHaveBeenCalledWith('ls-1')
  })

  it('calls onUnarchive for archived livestock', async () => {
    render(<LivestockCard livestock={makeLivestock({ is_archived: true })} {...defaultProps} />)
    const user = userEvent.setup()
    await user.click(screen.getByTitle('actions.unarchive'))
    expect(mockUnarchive).toHaveBeenCalledWith('ls-1')
  })

  it('shows split button for multi-quantity alive livestock', () => {
    render(<LivestockCard livestock={makeLivestock({ quantity: 3, status: 'alive' })} {...defaultProps} />)
    expect(screen.getByTitle('Split')).toBeInTheDocument()
  })

  it('hides split button for single quantity', () => {
    render(<LivestockCard livestock={makeLivestock({ quantity: 1 })} {...defaultProps} />)
    expect(screen.queryByTitle('Split')).not.toBeInTheDocument()
  })

  it('opens split dialog on split button click', async () => {
    render(<LivestockCard livestock={makeLivestock({ quantity: 5, status: 'alive' })} {...defaultProps} />)
    const user = userEvent.setup()
    await user.click(screen.getByTitle('Split'))
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('shows WoRMS link when worms_id is present', () => {
    render(<LivestockCard livestock={makeLivestock({ worms_id: '12345' })} {...defaultProps} />)
    const link = screen.getByText('WoRMS')
    expect(link).toHaveAttribute('href', 'https://www.marinespecies.org/aphia.php?p=taxdetails&id=12345')
  })

  it('shows iNaturalist link when inaturalist_id is present', () => {
    render(<LivestockCard livestock={makeLivestock({ inaturalist_id: '67890' })} {...defaultProps} />)
    const link = screen.getByText('iNaturalist')
    expect(link).toHaveAttribute('href', 'https://www.inaturalist.org/taxa/67890')
  })

  it('shows FishBase link when fishbase_species_id is present', () => {
    render(<LivestockCard livestock={makeLivestock({ fishbase_species_id: '100' })} {...defaultProps} />)
    const link = screen.getByText('FishBase')
    expect(link).toHaveAttribute('href', 'https://www.fishbase.se/summary/100')
  })

  it('shows purchase URL link', () => {
    render(<LivestockCard livestock={makeLivestock({ purchase_url: 'https://shop.example.com' })} {...defaultProps} />)
    const link = screen.getByText('View store').closest('a')
    expect(link).toHaveAttribute('href', 'https://shop.example.com')
  })
})
