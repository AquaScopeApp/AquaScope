/**
 * Normal ranges for reef aquarium parameters
 */

export interface ParameterRange {
  name: string
  unit: string
  min: number
  max: number
  ideal?: number
  color: string
  description: string
}

export const PARAMETER_RANGES: Record<string, ParameterRange> = {
  calcium: {
    name: 'Calcium',
    unit: 'ppm',
    min: 380,
    max: 450,
    ideal: 420,
    color: '#3b82f6', // blue
    description: 'Essential for coral skeleton growth',
  },
  magnesium: {
    name: 'Magnesium',
    unit: 'ppm',
    min: 1250,
    max: 1350,
    ideal: 1300,
    color: '#8b5cf6', // purple
    description: 'Maintains alkalinity and calcium levels',
  },
  alkalinity_kh: {
    name: 'Alkalinity (KH)',
    unit: 'dKH',
    min: 7,
    max: 10,
    ideal: 8.5,
    color: '#10b981', // green
    description: 'pH buffer and coral calcification',
  },
  nitrate: {
    name: 'Nitrate (NO₃)',
    unit: 'ppm',
    min: 0,
    max: 10,
    ideal: 5,
    color: '#f59e0b', // amber
    description: 'Waste product, low levels preferred',
  },
  phosphate: {
    name: 'Phosphate (PO₄)',
    unit: 'ppm',
    min: 0.03,
    max: 0.1,
    ideal: 0.05,
    color: '#ef4444', // red
    description: 'Nutrient for algae, keep low',
  },
  salinity: {
    name: 'Salinity',
    unit: 'ppt',
    min: 33,
    max: 36,
    ideal: 35,
    color: '#06b6d4', // cyan
    description: 'Salt concentration',
  },
  temperature: {
    name: 'Temperature',
    unit: '°C',
    min: 24,
    max: 27,
    ideal: 25.5,
    color: '#f97316', // orange
    description: 'Optimal temperature range',
  },
  ph: {
    name: 'pH',
    unit: '',
    min: 7.8,
    max: 8.4,
    ideal: 8.1,
    color: '#ec4899', // pink
    description: 'Acidity/alkalinity balance',
  },
}

export const PARAMETER_ORDER = [
  'temperature',
  'salinity',
  'ph',
  'alkalinity_kh',
  'calcium',
  'magnesium',
  'nitrate',
  'phosphate',
]

/**
 * Get status of a parameter value
 */
export function getParameterStatus(
  parameterType: string,
  value: number
): 'optimal' | 'warning' | 'critical' {
  const range = PARAMETER_RANGES[parameterType]
  if (!range) return 'optimal'

  // Check if value is within ideal range (middle 50% of range)
  const rangeSize = range.max - range.min
  const idealMin = range.min + rangeSize * 0.25
  const idealMax = range.max - rangeSize * 0.25

  if (value >= idealMin && value <= idealMax) {
    return 'optimal'
  }

  // Check if value is within acceptable range
  if (value >= range.min && value <= range.max) {
    return 'warning'
  }

  // Value is outside acceptable range
  return 'critical'
}

/**
 * Get color for parameter status
 */
export function getStatusColor(status: 'optimal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'optimal':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200'
  }
}
