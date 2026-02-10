/**
 * Tests for parameterRanges configuration utilities
 */
import { describe, it, expect } from 'vitest'
import {
  PARAMETER_RANGES,
  PARAMETER_ORDER,
  RATIO_ORDER,
  WATER_TYPES,
  AQUARIUM_SUBTYPES,
  roundValue,
  buildParameterRangesMap,
  getActiveParameterOrder,
  getParameterStatus,
  getStatusColor,
} from '../parameterRanges'

describe('parameterRanges configuration', () => {
  describe('Constants', () => {
    it('WATER_TYPES contains all three types', () => {
      expect(WATER_TYPES).toContain('freshwater')
      expect(WATER_TYPES).toContain('saltwater')
      expect(WATER_TYPES).toContain('brackish')
      expect(WATER_TYPES).toHaveLength(3)
    })

    it('AQUARIUM_SUBTYPES has entries for all water types', () => {
      expect(AQUARIUM_SUBTYPES.saltwater).toBeDefined()
      expect(AQUARIUM_SUBTYPES.freshwater).toBeDefined()
      expect(AQUARIUM_SUBTYPES.brackish).toBeDefined()
    })

    it('saltwater has expected subtypes', () => {
      const keys = AQUARIUM_SUBTYPES.saltwater.map((s) => s.key)
      expect(keys).toContain('sps_dominant')
      expect(keys).toContain('mixed_reef')
      expect(keys).toContain('fowlr')
    })

    it('freshwater has expected subtypes', () => {
      const keys = AQUARIUM_SUBTYPES.freshwater.map((s) => s.key)
      expect(keys).toContain('planted')
      expect(keys).toContain('discus')
      expect(keys).toContain('shrimp')
    })

    it('PARAMETER_ORDER contains core parameters', () => {
      expect(PARAMETER_ORDER).toContain('temperature')
      expect(PARAMETER_ORDER).toContain('salinity')
      expect(PARAMETER_ORDER).toContain('ph')
      expect(PARAMETER_ORDER).toContain('calcium')
      expect(PARAMETER_ORDER).toContain('nitrate')
    })

    it('RATIO_ORDER contains ratio parameters', () => {
      expect(RATIO_ORDER).toContain('no3_po4_ratio')
      expect(RATIO_ORDER).toContain('mg_ca_ratio')
    })

    it('PARAMETER_RANGES has default saltwater ranges', () => {
      expect(PARAMETER_RANGES.calcium).toBeDefined()
      expect(PARAMETER_RANGES.calcium.min).toBe(400)
      expect(PARAMETER_RANGES.calcium.max).toBe(450)
      expect(PARAMETER_RANGES.calcium.unit).toBe('ppm')

      expect(PARAMETER_RANGES.temperature).toBeDefined()
      expect(PARAMETER_RANGES.temperature.min).toBe(24)
      expect(PARAMETER_RANGES.temperature.max).toBe(27)
      expect(PARAMETER_RANGES.temperature.unit).toBe('°C')
    })
  })

  describe('roundValue', () => {
    it('rounds to 2 decimal places by default', () => {
      expect(roundValue(3.14159)).toBe(3.14)
    })

    it('rounds to specified decimal places', () => {
      expect(roundValue(3.14159, 3)).toBe(3.142)
      expect(roundValue(3.14159, 0)).toBe(3)
      expect(roundValue(3.14159, 1)).toBe(3.1)
    })

    it('handles whole numbers', () => {
      expect(roundValue(5, 2)).toBe(5)
    })

    it('handles negative numbers', () => {
      expect(roundValue(-3.456, 1)).toBe(-3.5)
    })
  })

  describe('buildParameterRangesMap', () => {
    it('converts API response to frontend format', () => {
      const apiRanges = [
        {
          id: '1',
          tank_id: 'tank-1',
          parameter_type: 'calcium',
          name: 'Calcium',
          unit: 'ppm',
          min_value: 400,
          max_value: 460,
          ideal_value: 430,
        },
        {
          id: '2',
          tank_id: 'tank-1',
          parameter_type: 'temperature',
          name: 'Temperature',
          unit: '°C',
          min_value: 24,
          max_value: 27,
          ideal_value: 25.5,
        },
      ]

      const result = buildParameterRangesMap(apiRanges)

      expect(result.calcium).toBeDefined()
      expect(result.calcium.min).toBe(400)
      expect(result.calcium.max).toBe(460)
      expect(result.calcium.ideal).toBe(430)
      expect(result.calcium.name).toBe('Calcium')
      expect(result.calcium.unit).toBe('ppm')

      expect(result.temperature).toBeDefined()
      expect(result.temperature.min).toBe(24)
    })

    it('handles empty array', () => {
      const result = buildParameterRangesMap([])
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('assigns colors based on parameter type', () => {
      const apiRanges = [
        {
          id: '1',
          tank_id: 'tank-1',
          parameter_type: 'calcium',
          name: 'Calcium',
          unit: 'ppm',
          min_value: 400,
          max_value: 460,
          ideal_value: 430,
        },
      ]

      const result = buildParameterRangesMap(apiRanges)
      expect(result.calcium.color).toBe('#3b82f6') // blue
    })

    it('uses fallback color for unknown types', () => {
      const apiRanges = [
        {
          id: '1',
          tank_id: 'tank-1',
          parameter_type: 'unknown_param',
          name: 'Unknown',
          unit: 'units',
          min_value: 0,
          max_value: 100,
          ideal_value: null,
        },
      ]

      const result = buildParameterRangesMap(apiRanges)
      expect(result.unknown_param.color).toBe('#6b7280') // gray fallback
      expect(result.unknown_param.ideal).toBeUndefined()
    })
  })

  describe('getActiveParameterOrder', () => {
    it('filters order to only include parameters with ranges', () => {
      const ranges = {
        temperature: PARAMETER_RANGES.temperature,
        calcium: PARAMETER_RANGES.calcium,
      }
      const result = getActiveParameterOrder(ranges)
      expect(result).toContain('temperature')
      expect(result).toContain('calcium')
      expect(result).not.toContain('salinity')
    })

    it('returns empty array when no ranges match', () => {
      const result = getActiveParameterOrder({})
      expect(result).toHaveLength(0)
    })

    it('preserves the original order', () => {
      const ranges = {
        calcium: PARAMETER_RANGES.calcium,
        temperature: PARAMETER_RANGES.temperature,
      }
      const result = getActiveParameterOrder(ranges)
      // temperature comes before calcium in PARAMETER_ORDER
      expect(result.indexOf('temperature')).toBeLessThan(result.indexOf('calcium'))
    })
  })

  describe('getParameterStatus', () => {
    it('returns optimal for values in the middle 50% of range', () => {
      // Calcium range: 400-450, middle 50% is 412.5-437.5
      expect(getParameterStatus('calcium', 425)).toBe('optimal')
    })

    it('returns warning for values in the outer range', () => {
      // Calcium range: 400-450, outer zone is 400-412.5 and 437.5-450
      expect(getParameterStatus('calcium', 405)).toBe('warning')
      expect(getParameterStatus('calcium', 445)).toBe('warning')
    })

    it('returns critical for values outside range', () => {
      expect(getParameterStatus('calcium', 350)).toBe('critical')
      expect(getParameterStatus('calcium', 500)).toBe('critical')
    })

    it('returns optimal for unknown parameter types', () => {
      expect(getParameterStatus('unknown', 50)).toBe('optimal')
    })

    it('uses custom ranges when provided', () => {
      const customRanges = {
        calcium: {
          name: 'Calcium',
          unit: 'ppm',
          min: 380,
          max: 500,
          color: '#3b82f6',
          description: 'Custom range',
        },
      }
      // With range 380-500, middle 50% is 410-470
      expect(getParameterStatus('calcium', 440, customRanges)).toBe('optimal')
      // Below min
      expect(getParameterStatus('calcium', 370, customRanges)).toBe('critical')
    })
  })

  describe('getStatusColor', () => {
    it('returns green classes for optimal', () => {
      expect(getStatusColor('optimal')).toContain('green')
    })

    it('returns yellow classes for warning', () => {
      expect(getStatusColor('warning')).toContain('yellow')
    })

    it('returns red classes for critical', () => {
      expect(getStatusColor('critical')).toContain('red')
    })
  })
})
