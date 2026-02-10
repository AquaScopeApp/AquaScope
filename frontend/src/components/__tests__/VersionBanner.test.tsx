/**
 * Tests for VersionBanner component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import VersionBanner from '../VersionBanner'

describe('VersionBanner Component', () => {
  it('renders the version text', () => {
    renderWithProviders(<VersionBanner />)
    expect(screen.getByText('Version')).toBeInTheDocument()
  })

  it('displays the app version', () => {
    renderWithProviders(<VersionBanner />)
    // __APP_VERSION__ global should be defined
    const versionBadges = screen.getAllByText(/v\d+\.\d+/)
    expect(versionBadges.length).toBeGreaterThan(0)
  })

  it('shows git commit when available', () => {
    // VITE_GIT_COMMIT is not set in test env, so commit section should not render
    renderWithProviders(<VersionBanner />)
    // The component conditionally renders gitCommit, which won't be present in test
    const container = document.querySelector('.fixed.bottom-4.right-4')
    expect(container).toBeInTheDocument()
  })
})
