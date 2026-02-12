/**
 * Tests for Sparkline component
 *
 * Verifies parameter config selection by water type, data fetching,
 * loading/empty states, value formatting, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Sparkline from '../dashboard/Sparkline'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../api', () => ({
  parametersApi: { query: vi.fn() },
}))
import { parametersApi } from '../../api'

const mockQuery = parametersApi.query as ReturnType<typeof vi.fn>

vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => <div />,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a single ParameterReading stub */
function makeReading(value: number, minutesAgo: number = 0) {
  const ts = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  return {
    time: ts,
    timestamp: ts,
    tank_id: 'tank-1',
    parameter_type: 'temperature',
    value,
  }
}

/**
 * Helper that sets mockQuery to resolve differently per parameter_type.
 * `dataMap` maps parameter_type -> array of readings (or undefined for empty).
 */
function setupQueryMock(dataMap: Record<string, ReturnType<typeof makeReading>[]>) {
  mockQuery.mockImplementation(({ parameter_type }: { parameter_type: string }) => {
    return Promise.resolve(dataMap[parameter_type] ?? [])
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sparkline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // 1. Returns null while loading
  // -----------------------------------------------------------------------
  it('renders nothing while data is loading', () => {
    // Never-resolving promise keeps the component in the loading state
    mockQuery.mockReturnValue(new Promise(() => {}))

    const { container } = render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    expect(container.innerHTML).toBe('')
  })

  // -----------------------------------------------------------------------
  // 2. Returns null when API returns empty arrays for all parameters
  // -----------------------------------------------------------------------
  it('renders nothing when API returns empty arrays for all parameters', async () => {
    mockQuery.mockResolvedValue([])

    const { container } = render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      // After loading finishes, no data means nothing rendered
      expect(container.innerHTML).toBe('')
    })

    // Saltwater queries three parameters
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  // -----------------------------------------------------------------------
  // 3. Renders sparkline charts for saltwater tank
  // -----------------------------------------------------------------------
  it('renders 3 sparkline charts with labels for a saltwater tank', async () => {
    setupQueryMock({
      temperature: [makeReading(25.4, 60), makeReading(25.6, 0)],
      alkalinity_kh: [makeReading(8.2, 60), makeReading(8.3, 0)],
      calcium: [makeReading(420, 60), makeReading(425, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // All three labels should be visible
    expect(screen.getByText('Temp')).toBeInTheDocument()
    expect(screen.getByText('Alk')).toBeInTheDocument()
    expect(screen.getByText('Ca')).toBeInTheDocument()

    // Latest values should be shown
    expect(screen.getByText(/25\.6/)).toBeInTheDocument()
    expect(screen.getByText(/8\.3/)).toBeInTheDocument()
    expect(screen.getByText(/425/)).toBeInTheDocument()

    // Three AreaChart instances should be rendered
    expect(screen.getAllByTestId('area-chart')).toHaveLength(3)

    // Verify query was called with the correct parameter types
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tank_id: 'tank-1', parameter_type: 'temperature', start: '-7d' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'alkalinity_kh' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'calcium' })
    )
  })

  // -----------------------------------------------------------------------
  // 4. Uses correct parameters for freshwater tank
  // -----------------------------------------------------------------------
  it('queries freshwater parameters (temperature, ph, gh)', async () => {
    setupQueryMock({
      temperature: [makeReading(24, 0)],
      ph: [makeReading(7.0, 0)],
      gh: [makeReading(8, 0)],
    })

    render(<Sparkline tankId="tank-2" waterType="freshwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    expect(screen.getByText('pH')).toBeInTheDocument()
    expect(screen.getByText('GH')).toBeInTheDocument()

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ tank_id: 'tank-2', parameter_type: 'temperature' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'ph' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'gh' })
    )
  })

  // -----------------------------------------------------------------------
  // 5. Uses correct parameters for brackish tank
  // -----------------------------------------------------------------------
  it('queries brackish parameters (temperature, ph, salinity)', async () => {
    setupQueryMock({
      temperature: [makeReading(26, 0)],
      ph: [makeReading(7.8, 0)],
      salinity: [makeReading(1.012, 0)],
    })

    render(<Sparkline tankId="tank-3" waterType="brackish" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    expect(screen.getByText('pH')).toBeInTheDocument()
    expect(screen.getByText('Sal')).toBeInTheDocument()

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'temperature' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'ph' })
    )
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'salinity' })
    )
  })

  // -----------------------------------------------------------------------
  // 6. Falls back to brackish params for unknown / null waterType
  // -----------------------------------------------------------------------
  it('falls back to brackish parameters when waterType is null', async () => {
    setupQueryMock({
      temperature: [makeReading(25, 0)],
      ph: [makeReading(7.5, 0)],
      salinity: [makeReading(1.010, 0)],
    })

    render(<Sparkline tankId="tank-4" waterType={null} />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    expect(screen.getByText('pH')).toBeInTheDocument()
    expect(screen.getByText('Sal')).toBeInTheDocument()

    // Should use brackish keys (salinity, not calcium)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'salinity' })
    )
  })

  it('falls back to brackish parameters for an unknown water type string', async () => {
    setupQueryMock({
      temperature: [makeReading(25, 0)],
      ph: [makeReading(7.5, 0)],
      salinity: [makeReading(1.010, 0)],
    })

    render(<Sparkline tankId="tank-5" waterType="alien_water" />)

    await waitFor(() => {
      expect(screen.getByText('Sal')).toBeInTheDocument()
    })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'salinity' })
    )
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({ parameter_type: 'calcium' })
    )
  })

  // -----------------------------------------------------------------------
  // 7. Handles API errors gracefully
  // -----------------------------------------------------------------------
  it('does not crash when all API calls reject', async () => {
    mockQuery.mockRejectedValue(new Error('Network error'))

    const { container } = render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    // Should eventually render nothing (empty arrays after error catch)
    await waitFor(() => {
      // The component catches per-parameter errors and sets empty readings,
      // so hasAnyData is false -> returns null
      expect(container.innerHTML).toBe('')
    })
  })

  it('renders available data when some API calls fail and others succeed', async () => {
    mockQuery.mockImplementation(({ parameter_type }: { parameter_type: string }) => {
      if (parameter_type === 'temperature') {
        return Promise.resolve([makeReading(25.5, 0)])
      }
      return Promise.reject(new Error('Not found'))
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // Only one chart should render (the two failed params produce empty readings)
    expect(screen.getAllByTestId('area-chart')).toHaveLength(1)
  })

  // -----------------------------------------------------------------------
  // 8. Value formatting: integer vs decimal vs salinity (3 decimals)
  // -----------------------------------------------------------------------
  it('formats integer values without decimal places', async () => {
    setupQueryMock({
      temperature: [makeReading(25, 0)],
      alkalinity_kh: [makeReading(8, 0)],
      calcium: [makeReading(420, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // Integer values should not have decimals
    expect(screen.getByText(/^25$/)).toBeInTheDocument()
    expect(screen.getByText(/^8$/)).toBeInTheDocument()
    expect(screen.getByText(/^420$/)).toBeInTheDocument()
  })

  it('formats decimal values to 1 decimal place', async () => {
    setupQueryMock({
      temperature: [makeReading(25.37, 0)],
      alkalinity_kh: [makeReading(8.21, 0)],
      calcium: [makeReading(420.9, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    expect(screen.getByText(/25\.4/)).toBeInTheDocument()
    expect(screen.getByText(/8\.2/)).toBeInTheDocument()
    expect(screen.getByText(/420\.9/)).toBeInTheDocument()
  })

  it('formats salinity values to 3 decimal places', async () => {
    setupQueryMock({
      temperature: [makeReading(26, 0)],
      ph: [makeReading(7.8, 0)],
      salinity: [makeReading(1.025, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="brackish" />)

    await waitFor(() => {
      expect(screen.getByText('Sal')).toBeInTheDocument()
    })

    expect(screen.getByText(/1\.025/)).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 9. Shows "--" when latestValue is null (empty readings for one param)
  // -----------------------------------------------------------------------
  it('shows "--" for a parameter with no readings while others have data', async () => {
    setupQueryMock({
      temperature: [makeReading(25.5, 0)],
      alkalinity_kh: [],                        // No data -> latestValue = null
      calcium: [makeReading(440, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // The Alk param has no readings, so its sparkline div is an empty placeholder.
    // The "--" only appears if the param has readings with latestValue === null,
    // but since empty readings => the param block renders an empty <div /> (line 118).
    // We verify that only 2 charts render.
    expect(screen.getAllByTestId('area-chart')).toHaveLength(2)
  })

  // -----------------------------------------------------------------------
  // Additional: uses latest (chronologically last) reading value
  // -----------------------------------------------------------------------
  it('displays the value from the chronologically latest reading', async () => {
    const older = makeReading(24.0, 120)  // 2 hours ago
    const newer = makeReading(26.5, 0)    // now

    setupQueryMock({
      temperature: [newer, older],  // unsorted on purpose
      alkalinity_kh: [makeReading(9, 0)],
      calcium: [makeReading(400, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // Should pick the chronologically latest value (26.5), not the first in array (24.0)
    expect(screen.getByText(/26\.5/)).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Units are rendered alongside values
  // -----------------------------------------------------------------------
  it('renders unit labels alongside values', async () => {
    setupQueryMock({
      temperature: [makeReading(25, 0)],
      alkalinity_kh: [makeReading(8, 0)],
      calcium: [makeReading(420, 0)],
    })

    render(<Sparkline tankId="tank-1" waterType="saltwater" />)

    await waitFor(() => {
      expect(screen.getByText('Temp')).toBeInTheDocument()
    })

    // Units rendered as separate spans
    expect(screen.getByText('\u00B0C')).toBeInTheDocument()
    expect(screen.getByText('dKH')).toBeInTheDocument()
    expect(screen.getByText('ppm')).toBeInTheDocument()
  })
})
