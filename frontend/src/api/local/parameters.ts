/**
 * Local Parameters API — SQLite replacement for InfluxDB
 */

import type {
  ParameterSubmission, ParameterSubmissionResponse,
  ParameterReading, LatestParameters,
} from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

const PARAMETER_FIELDS = [
  'calcium', 'magnesium', 'alkalinity_kh', 'nitrate', 'phosphate',
  'salinity', 'temperature', 'ph', 'gh', 'ammonia', 'nitrite',
] as const

export const parametersApi = {
  submit: async (data: ParameterSubmission): Promise<ParameterSubmissionResponse> => {
    const userId = getLocalUserId()
    const timestamp = data.timestamp || now()
    const createdAt = now()
    const parameters: string[] = []

    for (const field of PARAMETER_FIELDS) {
      const value = (data as any)[field]
      if (value != null) {
        const id = generateId()
        await db.execute(
          `INSERT INTO parameter_readings (id, tank_id, user_id, parameter_type, value, timestamp, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, data.tank_id, userId, field, value, timestamp, createdAt]
        )
        parameters.push(field)
      }
    }

    return {
      message: `Submitted ${parameters.length} parameters`,
      count: parameters.length,
      parameters,
    }
  },

  query: async (params: {
    tank_id?: string
    parameter_type?: string
    start?: string
    stop?: string
  }): Promise<ParameterReading[]> => {
    const conditions: string[] = []
    const values: any[] = []

    if (params.tank_id) {
      conditions.push('tank_id = ?')
      values.push(params.tank_id)
    }
    if (params.parameter_type) {
      conditions.push('parameter_type = ?')
      values.push(params.parameter_type)
    }
    if (params.start) {
      conditions.push('timestamp >= ?')
      values.push(params.start)
    }
    if (params.stop) {
      conditions.push('timestamp <= ?')
      values.push(params.stop)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await db.query(
      `SELECT * FROM parameter_readings ${where} ORDER BY timestamp ASC`,
      values
    )

    return rows.map((row: any) => ({
      time: row.timestamp,
      timestamp: row.timestamp,
      tank_id: row.tank_id,
      parameter_type: row.parameter_type,
      value: row.value,
    }))
  },

  latest: async (tank_id: string): Promise<LatestParameters> => {
    const latestRows = await db.query(
      `SELECT pr.parameter_type, pr.value, pr.timestamp
       FROM parameter_readings pr
       INNER JOIN (
         SELECT parameter_type, MAX(timestamp) as max_ts
         FROM parameter_readings
         WHERE tank_id = ?
         GROUP BY parameter_type
       ) latest ON pr.parameter_type = latest.parameter_type
         AND pr.timestamp = latest.max_ts
         AND pr.tank_id = ?`,
      [tank_id, tank_id]
    )

    const result: LatestParameters = {}
    for (const row of latestRows) {
      result[row.parameter_type] = {
        value: row.value,
        time: row.timestamp,
      }
    }
    return result
  },

  delete: async (params: {
    tank_id: string
    parameter_type: string
    timestamp: string
  }): Promise<void> => {
    await db.execute(
      'DELETE FROM parameter_readings WHERE tank_id = ? AND parameter_type = ? AND timestamp = ?',
      [params.tank_id, params.parameter_type, params.timestamp]
    )
  },
}
