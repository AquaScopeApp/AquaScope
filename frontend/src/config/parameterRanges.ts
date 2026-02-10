/**
 * Parameter ranges configuration
 *
 * Default ranges (fallback) and utilities for working with
 * dynamic per-tank parameter ranges from the API.
 */

import type { ParameterRangeResponse } from '../types'

export interface ParameterRange {
  name: string
  unit: string
  min: number
  max: number
  ideal?: number
  color: string
  description: string
}

/**
 * Round a number to specified decimal places to avoid floating point precision issues
 */
export function roundValue(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Color palette for parameters (assigned by parameter_type key)
 */
const PARAMETER_COLORS: Record<string, string> = {
  calcium: '#3b82f6',      // blue
  magnesium: '#8b5cf6',    // purple
  alkalinity_kh: '#10b981', // green
  nitrate: '#f59e0b',      // amber
  phosphate: '#ef4444',    // red
  salinity: '#06b6d4',     // cyan
  temperature: '#f97316',  // orange
  ph: '#ec4899',           // pink
  gh: '#14b8a6',           // teal
  ammonia: '#dc2626',      // red-600
  nitrite: '#e11d48',      // rose-600
  no3_po4_ratio: '#6366f1', // indigo
  mg_ca_ratio: '#a855f7',  // violet
}

/**
 * Default descriptions for parameters
 */
const PARAMETER_DESCRIPTIONS: Record<string, string> = {
  calcium: 'Essential for coral skeleton growth',
  magnesium: 'Maintains alkalinity and calcium levels',
  alkalinity_kh: 'pH buffer and carbonate hardness',
  nitrate: 'Nitrogen waste product',
  phosphate: 'Nutrient - keep in check for coral health',
  salinity: 'Specific gravity (density)',
  temperature: 'Stable temperature is critical',
  ph: 'Acidity/alkalinity of water',
  gh: 'General hardness (calcium + magnesium ions)',
  ammonia: 'Toxic waste - must be zero in cycled tanks',
  nitrite: 'Toxic intermediate - must be zero in cycled tanks',
  no3_po4_ratio: 'Redfield ratio for nutrient balance',
  mg_ca_ratio: 'Magnesium to calcium ratio',
}

/**
 * Default saltwater parameter ranges (fallback when API ranges not available)
 */
export const PARAMETER_RANGES: Record<string, ParameterRange> = {
  calcium: {
    name: 'Calcium',
    unit: 'ppm',
    min: 400,
    max: 450,
    ideal: 430,
    color: '#3b82f6',
    description: 'Essential for coral skeleton growth',
  },
  magnesium: {
    name: 'Magnesium',
    unit: 'ppm',
    min: 1250,
    max: 1450,
    ideal: 1350,
    color: '#8b5cf6',
    description: 'Maintains alkalinity and calcium levels',
  },
  alkalinity_kh: {
    name: 'Alkalinity (KH)',
    unit: 'dKH',
    min: 7,
    max: 10,
    ideal: 8.5,
    color: '#10b981',
    description: 'pH buffer and coral calcification',
  },
  nitrate: {
    name: 'Nitrate (NO₃)',
    unit: 'ppm',
    min: 0,
    max: 10,
    ideal: 3,
    color: '#f59e0b',
    description: 'Keep low for SPS corals (< 5 ppm)',
  },
  phosphate: {
    name: 'Phosphate (PO₄)',
    unit: 'ppm',
    min: 0.01,
    max: 0.08,
    ideal: 0.03,
    color: '#ef4444',
    description: 'Keep very low for SPS corals (< 0.05 ppm)',
  },
  salinity: {
    name: 'Salinity',
    unit: 'SG',
    min: 1.024,
    max: 1.027,
    ideal: 1.026,
    color: '#06b6d4',
    description: 'Specific gravity (density)',
  },
  temperature: {
    name: 'Temperature',
    unit: '°C',
    min: 24,
    max: 27,
    ideal: 25.5,
    color: '#f97316',
    description: 'Stable temperature critical for SPS',
  },
  ph: {
    name: 'pH',
    unit: '',
    min: 8.0,
    max: 8.4,
    ideal: 8.2,
    color: '#ec4899',
    description: 'Stable pH critical for SPS growth',
  },
  no3_po4_ratio: {
    name: 'NO₃/PO₄ Ratio',
    unit: '',
    min: 10,
    max: 150,
    ideal: 100,
    color: '#6366f1',
    description: 'Redfield ratio for nutrient balance',
  },
  mg_ca_ratio: {
    name: 'Mg/Ca Ratio',
    unit: '',
    min: 3.0,
    max: 3.5,
    ideal: 3.2,
    color: '#a855f7',
    description: 'Magnesium to calcium ratio',
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
  'gh',
  'ammonia',
  'nitrite',
]

export const RATIO_ORDER = [
  'no3_po4_ratio',
  'mg_ca_ratio',
]

/**
 * Build a ParameterRange map from API response data.
 * This converts the API format to the frontend format used by components.
 */
export function buildParameterRangesMap(
  apiRanges: ParameterRangeResponse[]
): Record<string, ParameterRange> {
  const map: Record<string, ParameterRange> = {}

  for (const range of apiRanges) {
    map[range.parameter_type] = {
      name: range.name,
      unit: range.unit,
      min: range.min_value,
      max: range.max_value,
      ideal: range.ideal_value ?? undefined,
      color: PARAMETER_COLORS[range.parameter_type] || '#6b7280',
      description: PARAMETER_DESCRIPTIONS[range.parameter_type] || '',
    }
  }

  return map
}

/**
 * Get the parameter order filtered to only include parameters that have ranges.
 */
export function getActiveParameterOrder(
  ranges: Record<string, ParameterRange>
): string[] {
  return PARAMETER_ORDER.filter((p) => p in ranges)
}

/**
 * Get status of a parameter value against given ranges.
 * If customRanges is provided, uses those; otherwise falls back to PARAMETER_RANGES.
 */
export function getParameterStatus(
  parameterType: string,
  value: number,
  customRanges?: Record<string, ParameterRange>
): 'optimal' | 'warning' | 'critical' {
  const ranges = customRanges || PARAMETER_RANGES
  const range = ranges[parameterType]
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

/**
 * Aquarium type/subtype definitions for the UI
 */
export const WATER_TYPES = ['freshwater', 'saltwater', 'brackish'] as const

export const AQUARIUM_SUBTYPES: Record<string, { key: string; label: string }[]> = {
  saltwater: [
    { key: 'sps_dominant', label: 'SPS Dominant' },
    { key: 'lps_dominant', label: 'LPS Dominant' },
    { key: 'soft_coral', label: 'Soft Coral' },
    { key: 'mixed_reef', label: 'Mixed Reef' },
    { key: 'fish_only', label: 'Fish Only' },
    { key: 'fowlr', label: 'FOWLR' },
  ],
  freshwater: [
    { key: 'amazonian', label: 'Amazonian' },
    { key: 'tanganyika', label: 'Tanganyika' },
    { key: 'malawi', label: 'Malawi' },
    { key: 'planted', label: 'Planted' },
    { key: 'community', label: 'Community' },
    { key: 'discus', label: 'Discus' },
    { key: 'shrimp', label: 'Shrimp' },
    { key: 'goldfish', label: 'Goldfish' },
    { key: 'axolotl', label: 'Axolotl' },
  ],
  brackish: [
    { key: 'mangrove', label: 'Mangrove' },
    { key: 'brackish_community', label: 'Brackish Community' },
  ],
}
