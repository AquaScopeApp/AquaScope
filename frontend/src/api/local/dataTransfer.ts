/**
 * Data Transfer — JSON export/import for data portability
 *
 * Allows users to export all their local data as JSON and import it
 * on another device or into the web version.
 */

import { db, getLocalUserId, now } from './helpers'

interface AquaScopeExport {
  version: 1
  exported_at: string
  user: any
  tanks: any[]
  tank_events: any[]
  parameter_readings: any[]
  parameter_ranges: any[]
  notes: any[]
  photos: any[]
  livestock: any[]
  equipment: any[]
  consumables: any[]
  consumable_usage: any[]
  maintenance_reminders: any[]
  icp_tests: any[]
}

export async function exportAllData(): Promise<AquaScopeExport> {
  const userId = getLocalUserId()

  const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId])
  const tanks = await db.query('SELECT * FROM tanks WHERE user_id = ?', [userId])
  const tankIds = tanks.map((t: any) => t.id)

  let tankEvents: any[] = []
  let parameterReadings: any[] = []
  let parameterRanges: any[] = []
  let notes: any[] = []
  let photos: any[] = []
  let livestock: any[] = []
  let equipment: any[] = []
  let consumables: any[] = []
  let consumableUsage: any[] = []
  let maintenanceReminders: any[] = []
  let icpTests: any[] = []

  for (const tankId of tankIds) {
    tankEvents.push(...await db.query('SELECT * FROM tank_events WHERE tank_id = ?', [tankId]))
    parameterReadings.push(...await db.query('SELECT * FROM parameter_readings WHERE tank_id = ?', [tankId]))
    parameterRanges.push(...await db.query('SELECT * FROM parameter_ranges WHERE tank_id = ?', [tankId]))
    notes.push(...await db.query('SELECT * FROM notes WHERE tank_id = ?', [tankId]))
    photos.push(...await db.query('SELECT * FROM photos WHERE tank_id = ?', [tankId]))
    livestock.push(...await db.query('SELECT * FROM livestock WHERE tank_id = ?', [tankId]))
    equipment.push(...await db.query('SELECT * FROM equipment WHERE tank_id = ?', [tankId]))
    consumables.push(...await db.query('SELECT * FROM consumables WHERE tank_id = ?', [tankId]))
    maintenanceReminders.push(...await db.query('SELECT * FROM maintenance_reminders WHERE tank_id = ?', [tankId]))
    icpTests.push(...await db.query('SELECT * FROM icp_tests WHERE tank_id = ?', [tankId]))
  }

  // Get all consumable usage for exported consumables
  const consumableIds = consumables.map((c: any) => c.id)
  for (const cId of consumableIds) {
    consumableUsage.push(...await db.query('SELECT * FROM consumable_usage WHERE consumable_id = ?', [cId]))
  }

  return {
    version: 1,
    exported_at: now(),
    user,
    tanks,
    tank_events: tankEvents,
    parameter_readings: parameterReadings,
    parameter_ranges: parameterRanges,
    notes,
    photos,
    livestock,
    equipment,
    consumables,
    consumable_usage: consumableUsage,
    maintenance_reminders: maintenanceReminders,
    icp_tests: icpTests,
  }
}

export async function exportTankData(tankId: string): Promise<any> {
  const tank = await db.queryOne('SELECT * FROM tanks WHERE id = ?', [tankId])
  if (!tank) throw new Error('Tank not found')

  return {
    version: 1,
    exported_at: now(),
    tank,
    tank_events: await db.query('SELECT * FROM tank_events WHERE tank_id = ?', [tankId]),
    parameter_readings: await db.query('SELECT * FROM parameter_readings WHERE tank_id = ?', [tankId]),
    parameter_ranges: await db.query('SELECT * FROM parameter_ranges WHERE tank_id = ?', [tankId]),
    notes: await db.query('SELECT * FROM notes WHERE tank_id = ?', [tankId]),
    photos: await db.query('SELECT * FROM photos WHERE tank_id = ?', [tankId]),
    livestock: await db.query('SELECT * FROM livestock WHERE tank_id = ?', [tankId]),
    equipment: await db.query('SELECT * FROM equipment WHERE tank_id = ?', [tankId]),
    consumables: await db.query('SELECT * FROM consumables WHERE tank_id = ?', [tankId]),
    maintenance_reminders: await db.query('SELECT * FROM maintenance_reminders WHERE tank_id = ?', [tankId]),
    icp_tests: await db.query('SELECT * FROM icp_tests WHERE tank_id = ?', [tankId]),
  }
}

export async function importAllData(data: AquaScopeExport): Promise<{ imported: number }> {
  let imported = 0

  const insertRows = async (table: string, rows: any[]) => {
    for (const row of rows) {
      const keys = Object.keys(row)
      const placeholders = keys.map(() => '?').join(', ')
      try {
        await db.execute(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
          keys.map(k => row[k])
        )
        imported++
      } catch {
        // Skip duplicates or invalid rows
      }
    }
  }

  // Import in dependency order
  if (data.user) await insertRows('users', [data.user])
  if (data.tanks) await insertRows('tanks', data.tanks)
  if (data.tank_events) await insertRows('tank_events', data.tank_events)
  if (data.parameter_readings) await insertRows('parameter_readings', data.parameter_readings)
  if (data.parameter_ranges) await insertRows('parameter_ranges', data.parameter_ranges)
  if (data.notes) await insertRows('notes', data.notes)
  if (data.photos) await insertRows('photos', data.photos)
  if (data.livestock) await insertRows('livestock', data.livestock)
  if (data.equipment) await insertRows('equipment', data.equipment)
  if (data.consumables) await insertRows('consumables', data.consumables)
  if (data.consumable_usage) await insertRows('consumable_usage', data.consumable_usage)
  if (data.maintenance_reminders) await insertRows('maintenance_reminders', data.maintenance_reminders)
  if (data.icp_tests) await insertRows('icp_tests', data.icp_tests)

  return { imported }
}
