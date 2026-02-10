/**
 * Local Parameter Ranges API
 */

import type { ParameterRangeConfig, ParameterRangeResponse } from '../../types'
import { db, generateId, now } from './helpers'

function rowToRange(row: any): ParameterRangeResponse {
  return {
    id: row.id,
    tank_id: row.tank_id,
    parameter_type: row.parameter_type,
    name: row.name,
    unit: row.unit,
    min_value: row.min_value,
    max_value: row.max_value,
    ideal_value: row.ideal_value ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Default ranges by water type
const DEFAULT_RANGES: Record<string, ParameterRangeConfig[]> = {
  saltwater: [
    { parameter_type: 'calcium', name: 'Calcium', unit: 'ppm', min_value: 380, max_value: 450, ideal_value: 420 },
    { parameter_type: 'magnesium', name: 'Magnesium', unit: 'ppm', min_value: 1250, max_value: 1400, ideal_value: 1350 },
    { parameter_type: 'alkalinity_kh', name: 'Alkalinity (KH)', unit: 'dKH', min_value: 7, max_value: 11, ideal_value: 8.5 },
    { parameter_type: 'nitrate', name: 'Nitrate', unit: 'ppm', min_value: 0, max_value: 20, ideal_value: 5 },
    { parameter_type: 'phosphate', name: 'Phosphate', unit: 'ppm', min_value: 0, max_value: 0.1, ideal_value: 0.03 },
    { parameter_type: 'salinity', name: 'Salinity', unit: 'ppt', min_value: 34, max_value: 36, ideal_value: 35 },
    { parameter_type: 'temperature', name: 'Temperature', unit: '°C', min_value: 24, max_value: 27, ideal_value: 25.5 },
    { parameter_type: 'ph', name: 'pH', unit: '', min_value: 7.8, max_value: 8.4, ideal_value: 8.1 },
  ],
  freshwater: [
    { parameter_type: 'temperature', name: 'Temperature', unit: '°C', min_value: 22, max_value: 28, ideal_value: 25 },
    { parameter_type: 'ph', name: 'pH', unit: '', min_value: 6.0, max_value: 8.0, ideal_value: 7.0 },
    { parameter_type: 'gh', name: 'General Hardness', unit: 'dGH', min_value: 4, max_value: 12, ideal_value: 8 },
    { parameter_type: 'alkalinity_kh', name: 'Carbonate Hardness', unit: 'dKH', min_value: 3, max_value: 10, ideal_value: 6 },
    { parameter_type: 'ammonia', name: 'Ammonia', unit: 'ppm', min_value: 0, max_value: 0.25, ideal_value: 0 },
    { parameter_type: 'nitrite', name: 'Nitrite', unit: 'ppm', min_value: 0, max_value: 0.25, ideal_value: 0 },
    { parameter_type: 'nitrate', name: 'Nitrate', unit: 'ppm', min_value: 0, max_value: 40, ideal_value: 10 },
  ],
  brackish: [
    { parameter_type: 'salinity', name: 'Salinity', unit: 'ppt', min_value: 5, max_value: 20, ideal_value: 12 },
    { parameter_type: 'temperature', name: 'Temperature', unit: '°C', min_value: 23, max_value: 28, ideal_value: 26 },
    { parameter_type: 'ph', name: 'pH', unit: '', min_value: 7.5, max_value: 8.5, ideal_value: 8.0 },
    { parameter_type: 'alkalinity_kh', name: 'Carbonate Hardness', unit: 'dKH', min_value: 8, max_value: 15, ideal_value: 12 },
    { parameter_type: 'ammonia', name: 'Ammonia', unit: 'ppm', min_value: 0, max_value: 0.25, ideal_value: 0 },
    { parameter_type: 'nitrite', name: 'Nitrite', unit: 'ppm', min_value: 0, max_value: 0.25, ideal_value: 0 },
    { parameter_type: 'nitrate', name: 'Nitrate', unit: 'ppm', min_value: 0, max_value: 30, ideal_value: 10 },
  ],
}

export const parameterRangesApi = {
  getForTank: async (tankId: string): Promise<ParameterRangeResponse[]> => {
    const rows = await db.query(
      'SELECT * FROM parameter_ranges WHERE tank_id = ? ORDER BY parameter_type',
      [tankId]
    )

    // If no ranges exist yet, create defaults based on tank water type
    if (rows.length === 0) {
      const tank = await db.queryOne<any>('SELECT water_type FROM tanks WHERE id = ?', [tankId])
      const waterType = tank?.water_type || 'saltwater'
      const defaults = DEFAULT_RANGES[waterType] || DEFAULT_RANGES.saltwater
      return parameterRangesApi.updateForTank(tankId, defaults)
    }

    return rows.map(rowToRange)
  },

  updateForTank: async (tankId: string, ranges: ParameterRangeConfig[]): Promise<ParameterRangeResponse[]> => {
    const timestamp = now()

    // Delete existing ranges
    await db.execute('DELETE FROM parameter_ranges WHERE tank_id = ?', [tankId])

    const results: ParameterRangeResponse[] = []
    for (const range of ranges) {
      const id = generateId()
      await db.execute(
        `INSERT INTO parameter_ranges (id, tank_id, parameter_type, name, unit, min_value, max_value, ideal_value, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tankId, range.parameter_type, range.name, range.unit, range.min_value, range.max_value, range.ideal_value ?? null, timestamp, timestamp]
      )
      results.push({
        id, tank_id: tankId, ...range, ideal_value: range.ideal_value ?? null,
        created_at: timestamp, updated_at: timestamp,
      })
    }

    return results
  },

  resetDefaults: async (tankId: string): Promise<ParameterRangeResponse[]> => {
    const tank = await db.queryOne<any>('SELECT water_type FROM tanks WHERE id = ?', [tankId])
    const waterType = tank?.water_type || 'saltwater'
    const defaults = DEFAULT_RANGES[waterType] || DEFAULT_RANGES.saltwater
    return parameterRangesApi.updateForTank(tankId, defaults)
  },
}
