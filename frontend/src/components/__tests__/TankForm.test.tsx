/**
 * Tests for TankForm component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../test/test-utils'
import TankForm from '../tanks/TankForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      const translations: Record<string, string> = {
        'fields.name': 'Tank Name',
        'fields.waterType': 'Water Type',
        'fields.aquariumType': 'Aquarium Type',
        'fields.aquariumSubtype': 'Aquarium Subtype',
        'fields.selectSubtype': 'Select subtype...',
        'fields.description': 'Description',
        'fields.systemVolume': 'System Volume',
        'fields.displayVolume': 'Display Volume',
        'fields.sumpVolume': 'Sump Volume',
        'fields.totalSystem': 'Total System',
        'fields.setupDate': 'Setup Date',
        'fields.setupDateHint': 'When was the tank set up?',
        'waterType.saltwater': 'Saltwater',
        'waterType.freshwater': 'Freshwater',
        'waterType.brackish': 'Brackish',
        'subtype.sps_dominant': 'SPS Dominant',
        'subtype.mixed_reef': 'Mixed Reef',
        'subtype.planted': 'Planted',
        'createTank': 'Create Tank',
        'editTank': 'Edit Tank',
        'updateTank': 'Update Tank',
        'saving': 'Saving...',
        'parameterRanges.rangesNote': 'Parameter ranges will be set based on your selection',
        'actions.cancel': 'Cancel',
      }
      return translations[key] || opts?.defaultValue || key
    },
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

describe('TankForm Component', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  it('renders create form when no tank provided', () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Create Tank')
    expect(screen.getByLabelText(/tank name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/water type/i)).toBeInTheDocument()
  })

  it('renders edit form when tank is provided', () => {
    const tank = {
      id: '1',
      name: 'Test Tank',
      water_type: 'freshwater',
      aquarium_subtype: 'planted',
      display_volume_liters: 200,
      sump_volume_liters: 50,
      total_volume_liters: 250,
      description: 'A test tank',
      setup_date: '2024-01-01',
      image_url: null,
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      events: [],
    }

    renderWithProviders(
      <TankForm tank={tank} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    expect(screen.getByText('Edit Tank')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Tank')).toBeInTheDocument()
    expect(screen.getByDisplayValue('200')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A test tank')).toBeInTheDocument()
  })

  it('shows all water type options', () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    const waterTypeSelect = screen.getByLabelText(/water type/i)
    expect(waterTypeSelect).toBeInTheDocument()

    // Check all 3 water types are options
    const options = waterTypeSelect.querySelectorAll('option')
    const values = Array.from(options).map((o) => o.value)
    expect(values).toContain('freshwater')
    expect(values).toContain('saltwater')
    expect(values).toContain('brackish')
  })

  it('calls onCancel when cancel button is clicked', async () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const user = userEvent.setup()

    await user.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('submits form with correct data', async () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const user = userEvent.setup()

    const nameInput = screen.getByLabelText(/tank name/i)
    await user.type(nameInput, 'My New Reef')

    const displayVolume = screen.getByLabelText(/display volume/i)
    await user.type(displayVolume, '300')

    const submitButton = screen.getByRole('button', { name: /create tank/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My New Reef',
          water_type: 'saltwater',
          display_volume_liters: 300,
        })
      )
    })
  })

  it('disables submit when name is empty', () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )

    const submitButton = screen.getByRole('button', { name: /create tank/i })
    expect(submitButton).toBeDisabled()
  })

  it('shows total volume when volumes are entered', async () => {
    renderWithProviders(
      <TankForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    )
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/display volume/i), '200')
    await user.type(screen.getByLabelText(/sump volume/i), '50')

    expect(screen.getByText(/250\.0 L/)).toBeInTheDocument()
  })
})
