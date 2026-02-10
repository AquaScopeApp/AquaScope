/**
 * Tests for DefaultTankAnimation component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import DefaultTankAnimation from '../tanks/DefaultTankAnimation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'waterType.saltwater': 'Saltwater',
        'waterType.freshwater': 'Freshwater',
        'waterType.brackish': 'Brackish',
      }
      return translations[key] || key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('DefaultTankAnimation Component', () => {
  it('renders with default saltwater type', () => {
    renderWithProviders(<DefaultTankAnimation />)
    const img = screen.getByAltText('Saltwater')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/defaults/saltwater.png')
  })

  it('renders saltwater badge', () => {
    renderWithProviders(<DefaultTankAnimation waterType="saltwater" />)
    expect(screen.getByText('Saltwater')).toBeInTheDocument()
  })

  it('renders freshwater image and badge', () => {
    renderWithProviders(<DefaultTankAnimation waterType="freshwater" />)
    const img = screen.getByAltText('Freshwater')
    expect(img).toHaveAttribute('src', '/images/defaults/freshwater.png')
    expect(screen.getByText('Freshwater')).toBeInTheDocument()
  })

  it('renders brackish image and badge', () => {
    renderWithProviders(<DefaultTankAnimation waterType="brackish" />)
    const img = screen.getByAltText('Brackish')
    expect(img).toHaveAttribute('src', '/images/defaults/brackish.png')
    expect(screen.getByText('Brackish')).toBeInTheDocument()
  })

  it('falls back to saltwater for unknown water type', () => {
    renderWithProviders(<DefaultTankAnimation waterType="unknown" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/images/defaults/saltwater.png')
  })
})
