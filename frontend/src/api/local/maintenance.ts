/**
 * Local Maintenance Reminders API
 */

import type {
  MaintenanceReminder, MaintenanceReminderCreate, MaintenanceReminderUpdate,
} from '../../types'
import { db, generateId, now, getLocalUserId, toBool, fromBool } from './helpers'

function rowToReminder(row: any): MaintenanceReminder {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    equipment_id: row.equipment_id || null,
    title: row.title,
    description: row.description || null,
    reminder_type: row.reminder_type,
    frequency_days: row.frequency_days,
    last_completed: row.last_completed || null,
    next_due: row.next_due,
    is_active: toBool(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export const maintenanceApi = {
  listReminders: async (params?: {
    tank_id?: string; active_only?: boolean; overdue_only?: boolean
  }): Promise<MaintenanceReminder[]> => {
    const userId = getLocalUserId()
    const conditions = ['user_id = ?']
    const values: any[] = [userId]

    if (params?.tank_id) { conditions.push('tank_id = ?'); values.push(params.tank_id) }
    if (params?.active_only) { conditions.push('is_active = 1') }
    if (params?.overdue_only) {
      conditions.push('next_due <= ? AND is_active = 1')
      values.push(now().split('T')[0])
    }

    const rows = await db.query(
      `SELECT * FROM maintenance_reminders WHERE ${conditions.join(' AND ')} ORDER BY next_due ASC`,
      values
    )
    return rows.map(rowToReminder)
  },

  getReminder: async (id: string): Promise<MaintenanceReminder> => {
    const row = await db.queryOne('SELECT * FROM maintenance_reminders WHERE id = ?', [id])
    if (!row) throw new Error('Reminder not found')
    return rowToReminder(row)
  },

  createReminder: async (data: MaintenanceReminderCreate): Promise<MaintenanceReminder> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO maintenance_reminders (id, tank_id, user_id, equipment_id, title, description,
       reminder_type, frequency_days, last_completed, next_due, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)`,
      [id, data.tank_id, userId, data.equipment_id ?? null, data.title,
       data.description ?? null, data.reminder_type, data.frequency_days,
       data.next_due, timestamp, timestamp]
    )

    return maintenanceApi.getReminder(id)
  },

  updateReminder: async (id: string, data: MaintenanceReminderUpdate): Promise<MaintenanceReminder> => {
    const fields = ['title', 'description', 'reminder_type', 'frequency_days', 'equipment_id']
    const sets: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }
    if (data.is_active !== undefined) {
      sets.push('is_active = ?')
      values.push(fromBool(data.is_active))
    }

    sets.push('updated_at = ?')
    values.push(now())
    values.push(id)

    await db.execute(`UPDATE maintenance_reminders SET ${sets.join(', ')} WHERE id = ?`, values)
    return maintenanceApi.getReminder(id)
  },

  completeReminder: async (id: string, completed_date?: string): Promise<MaintenanceReminder> => {
    const reminder = await db.queryOne<any>('SELECT * FROM maintenance_reminders WHERE id = ?', [id])
    if (!reminder) throw new Error('Reminder not found')

    const completedAt = completed_date || now().split('T')[0]
    const nextDue = new Date(completedAt)
    nextDue.setDate(nextDue.getDate() + reminder.frequency_days)
    const nextDueStr = nextDue.toISOString().split('T')[0]

    await db.execute(
      `UPDATE maintenance_reminders SET last_completed = ?, next_due = ?, updated_at = ? WHERE id = ?`,
      [completedAt, nextDueStr, now(), id]
    )

    return maintenanceApi.getReminder(id)
  },

  deleteReminder: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM maintenance_reminders WHERE id = ?', [id])
  },
}
