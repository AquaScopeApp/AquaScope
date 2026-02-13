/**
 * Tests for Footer component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import Footer from '../Footer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'footer.reefDescription': 'Open-source aquarium management platform',
        'footer.createdBy': 'Created by',
        'footer.withLove': 'Made with',
        'footer.links': 'Links',
        'footer.githubRepository': 'GitHub Repository',
        'footer.reportIssues': 'Report Issues',
        'footer.documentation': 'Documentation',
        'footer.supportProject': 'Support the Project',
        'footer.helpKeepGoing': 'Help keep this project going',
        'footer.githubSponsors': 'GitHub Sponsors',
        'footer.buyMeCoffee': 'Buy me a coffee',
        'footer.openSource': 'Open source',
      }
      return translations[key] || key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('Footer Component', () => {
  it('renders the app name', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByText('AquaScope')).toBeInTheDocument()
  })

  it('displays the creator name', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByText('Edi Prifti')).toBeInTheDocument()
  })

  it('renders GitHub repository link', () => {
    renderWithProviders(<Footer />)
    const link = screen.getByText('GitHub Repository')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/AquaScopeApp/AquaScope')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('renders Report Issues link', () => {
    renderWithProviders(<Footer />)
    const link = screen.getByText('Report Issues')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/AquaScopeApp/AquaScope/issues')
  })

  it('renders Documentation link', () => {
    renderWithProviders(<Footer />)
    const link = screen.getByText('Documentation')
    expect(link.closest('a')).toHaveAttribute('href', 'https://github.com/AquaScopeApp/AquaScope/blob/main/README.md')
  })

  it('renders sponsor links', () => {
    renderWithProviders(<Footer />)
    const sponsorLink = screen.getByText('GitHub Sponsors')
    expect(sponsorLink.closest('a')).toHaveAttribute('href', 'https://github.com/sponsors/eprifti')

    const coffeeLink = screen.getByText(/Buy me a coffee/i)
    expect(coffeeLink.closest('a')).toHaveAttribute('href', 'https://ko-fi.com/aquascope')
  })

  it('displays the current year in copyright', () => {
    renderWithProviders(<Footer />)
    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument()
  })

  it('displays the version from __APP_VERSION__', () => {
    renderWithProviders(<Footer />)
    // __APP_VERSION__ is defined in vite config, in test it resolves to the global
    const versionElements = screen.getAllByText(/v\d+\.\d+/)
    expect(versionElements.length).toBeGreaterThan(0)
  })
})
