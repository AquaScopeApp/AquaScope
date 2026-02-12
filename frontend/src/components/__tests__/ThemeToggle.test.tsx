/**
 * Tests for ThemeToggle component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from '../ThemeToggle'

const mockSetTheme = vi.fn()
let mockTheme = 'light'

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    resolvedTheme: mockTheme === 'system' ? 'light' : mockTheme,
    setTheme: mockSetTheme,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTheme = 'light'
  })

  it('renders a button with aria-label', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument()
  })

  it('shows sun icon for light theme', () => {
    mockTheme = 'light'
    const { container } = render(<ThemeToggle />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
  })

  it('shows monitor icon for system theme', () => {
    mockTheme = 'system'
    const { container } = render(<ThemeToggle />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
  })

  it('shows moon icon for dark theme', () => {
    mockTheme = 'dark'
    const { container } = render(<ThemeToggle />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
  })

  it('cycles light -> system on click', async () => {
    mockTheme = 'light'
    render(<ThemeToggle />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('cycles system -> dark on click', async () => {
    mockTheme = 'system'
    render(<ThemeToggle />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('cycles dark -> light on click', async () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('has correct title attribute', () => {
    mockTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('title', 'dark')
  })
})
