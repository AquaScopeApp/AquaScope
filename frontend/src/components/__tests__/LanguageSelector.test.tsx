/**
 * Tests for LanguageSelector component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import LanguageSelector from '../LanguageSelector'

const mockChangeLanguage = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      language: 'en',
    },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('LanguageSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a select element', () => {
    renderWithProviders(<LanguageSelector />)
    const select = screen.getByTitle('Select Language')
    expect(select).toBeInTheDocument()
    expect(select.tagName).toBe('SELECT')
  })

  it('renders all 15 language options', () => {
    renderWithProviders(<LanguageSelector />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(15)
  })

  it('renders English option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/English/)).toBeInTheDocument()
  })

  it('renders French option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/Français/)).toBeInTheDocument()
  })

  it('renders Spanish option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/Español/)).toBeInTheDocument()
  })

  it('renders German option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/Deutsch/)).toBeInTheDocument()
  })

  it('renders Italian option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/Italiano/)).toBeInTheDocument()
  })

  it('renders Portuguese option', () => {
    renderWithProviders(<LanguageSelector />)
    expect(screen.getByText(/Português/)).toBeInTheDocument()
  })

  it('calls changeLanguage and stores in localStorage when changed', async () => {
    renderWithProviders(<LanguageSelector />)
    const user = userEvent.setup()
    const select = screen.getByTitle('Select Language')

    await user.selectOptions(select, 'fr')

    expect(mockChangeLanguage).toHaveBeenCalledWith('fr')
    expect(localStorage.getItem('aquascope_language')).toBe('fr')
  })
})
