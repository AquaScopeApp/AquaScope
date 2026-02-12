/**
 * Tests for Pagination component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '../common/Pagination'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    itemsPerPage: 10,
    onPageChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Rendering / visibility
  // ---------------------------------------------------------------------------

  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={10} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when totalPages is 0', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={0} totalItems={0} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders pagination controls when totalPages > 1', () => {
    render(<Pagination {...defaultProps} />)
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Page info text (start-end of total)
  // ---------------------------------------------------------------------------

  it('shows correct page info for the first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    // "1-10 of 50"
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
    expect(screen.getByText(/50/)).toBeInTheDocument()
  })

  it('shows correct page info for a middle page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />)
    // start = (3-1)*10 + 1 = 21, end = 3*10 = 30
    const infoText = screen.getByText(/21/).closest('span')
    expect(infoText).toBeInTheDocument()
    expect(infoText!.textContent).toContain('30')
    expect(infoText!.textContent).toContain('50')
  })

  it('clamps end to totalItems on the last page', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalPages={5}
        totalItems={47}
        itemsPerPage={10}
      />
    )
    // start = (5-1)*10 + 1 = 41, end = min(50, 47) = 47
    const infoText = screen.getByText(/41/).closest('span')
    expect(infoText).toBeInTheDocument()
    expect(infoText!.textContent).toContain('47')
  })

  // ---------------------------------------------------------------------------
  // Disabled states
  // ---------------------------------------------------------------------------

  it('disables the Previous button on the first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    expect(screen.getByText('Previous')).toBeDisabled()
  })

  it('enables the Next button on the first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    expect(screen.getByText('Next')).toBeEnabled()
  })

  it('disables the Next button on the last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />)
    expect(screen.getByText('Next')).toBeDisabled()
  })

  it('enables the Previous button on the last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />)
    expect(screen.getByText('Previous')).toBeEnabled()
  })

  it('enables both buttons on a middle page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />)
    expect(screen.getByText('Previous')).toBeEnabled()
    expect(screen.getByText('Next')).toBeEnabled()
  })

  // ---------------------------------------------------------------------------
  // Click handlers
  // ---------------------------------------------------------------------------

  it('calls onPageChange with currentPage - 1 when Previous is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Previous'))
    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with currentPage + 1 when Next is clicked', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('does not call onPageChange when clicking disabled Previous button', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Previous'))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('does not call onPageChange when clicking disabled Next button', async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Next'))
    expect(onPageChange).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Two-page boundary case
  // ---------------------------------------------------------------------------

  it('works correctly with exactly 2 pages', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        totalItems={15}
        itemsPerPage={10}
        onPageChange={vi.fn()}
      />
    )
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).toBeEnabled()
    const infoText = screen.getByText(/1/).closest('span')
    expect(infoText!.textContent).toContain('10')
    expect(infoText!.textContent).toContain('15')
  })

  it('shows correct info on page 2 of 2', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={2}
        totalItems={15}
        itemsPerPage={10}
        onPageChange={vi.fn()}
      />
    )
    expect(screen.getByText('Previous')).toBeEnabled()
    expect(screen.getByText('Next')).toBeDisabled()
    // start = (2-1)*10 + 1 = 11, end = min(20, 15) = 15
    const infoText = screen.getByText(/11/).closest('span')
    expect(infoText!.textContent).toContain('15')
  })

  // ---------------------------------------------------------------------------
  // Translation key usage
  // ---------------------------------------------------------------------------

  it('renders the "of" separator using the defaultValue from translation', () => {
    render(<Pagination {...defaultProps} />)
    // The info span should contain the word "of" from the defaultValue
    const infoText = screen.getByText(/of/).closest('span')
    expect(infoText).toBeInTheDocument()
  })
})
