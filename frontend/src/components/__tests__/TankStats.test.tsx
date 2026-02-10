/**
 * Tests for TankStats component
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import TankStats from '../tanks/TankStats'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('TankStats Component', () => {
  it('renders all 7 stat categories', () => {
    const stats = {
      event_count: 5,
      equipment_count: 3,
      livestock_count: 12,
      photo_count: 8,
      note_count: 4,
      maintenance_count: 2,
      icp_test_count: 1,
    }

    renderWithProviders(<TankStats stats={stats} />)

    expect(screen.getByText('stats.eventCount')).toBeInTheDocument()
    expect(screen.getByText('stats.equipmentCount')).toBeInTheDocument()
    expect(screen.getByText('stats.livestockCount')).toBeInTheDocument()
    expect(screen.getByText('stats.photoCount')).toBeInTheDocument()
    expect(screen.getByText('stats.noteCount')).toBeInTheDocument()
    expect(screen.getByText('stats.maintenanceCount')).toBeInTheDocument()
    expect(screen.getByText('stats.icpTestCount')).toBeInTheDocument()
  })

  it('displays correct count values', () => {
    const stats = {
      event_count: 5,
      equipment_count: 3,
      livestock_count: 12,
      photo_count: 8,
      note_count: 4,
      maintenance_count: 2,
      icp_test_count: 1,
    }

    renderWithProviders(<TankStats stats={stats} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('handles undefined/missing stat values by defaulting to 0', () => {
    const stats = {}

    renderWithProviders(<TankStats stats={stats} />)

    // All 7 labels should still render
    expect(screen.getByText('stats.eventCount')).toBeInTheDocument()
    expect(screen.getByText('stats.equipmentCount')).toBeInTheDocument()
    expect(screen.getByText('stats.livestockCount')).toBeInTheDocument()
    expect(screen.getByText('stats.photoCount')).toBeInTheDocument()
    expect(screen.getByText('stats.noteCount')).toBeInTheDocument()
    expect(screen.getByText('stats.maintenanceCount')).toBeInTheDocument()
    expect(screen.getByText('stats.icpTestCount')).toBeInTheDocument()

    // All values should default to 0
    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(7)
  })

  it('handles all zero stats', () => {
    const stats = {
      event_count: 0,
      equipment_count: 0,
      livestock_count: 0,
      photo_count: 0,
      note_count: 0,
      maintenance_count: 0,
      icp_test_count: 0,
    }

    renderWithProviders(<TankStats stats={stats} />)

    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(7)
  })
})
