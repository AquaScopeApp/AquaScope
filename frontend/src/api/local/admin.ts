/**
 * Local Admin API
 *
 * Most admin functions are stubs in local mode (single user, no server).
 * Data export/import is functional for data portability.
 */

import type { User, UserUpdate, UserWithStats, SystemStats, UserDataSummary, StorageStats, StorageFile } from '../../types'
import { db, now, getLocalUserId } from './helpers'

export const adminApi = {
  listUsers: async (): Promise<User[]> => {
    const rows = await db.query('SELECT * FROM users')
    return rows.map((r: any) => ({
      id: r.id, email: r.email, username: r.username,
      is_admin: r.is_admin === 1, created_at: r.created_at, updated_at: r.updated_at,
    }))
  },

  getUser: async (userId: string): Promise<User> => {
    const r = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [userId])
    if (!r) throw new Error('User not found')
    return { id: r.id, email: r.email, username: r.username, is_admin: r.is_admin === 1, created_at: r.created_at, updated_at: r.updated_at }
  },

  updateUser: async (userId: string, data: UserUpdate): Promise<User> => {
    const sets: string[] = []
    const values: any[] = []
    if (data.username !== undefined) { sets.push('username = ?'); values.push(data.username) }
    if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email) }
    sets.push('updated_at = ?'); values.push(now()); values.push(userId)
    await db.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values)
    return adminApi.getUser(userId)
  },

  deleteUser: async (_userId: string): Promise<void> => {
    // No-op in local mode
  },

  getSystemStats: async (): Promise<SystemStats> => {
    const userId = getLocalUserId()
    const tanks = await db.queryOne<any>('SELECT COUNT(*) as c FROM tanks WHERE user_id = ?', [userId])
    const params = await db.queryOne<any>('SELECT COUNT(*) as c FROM parameter_readings WHERE user_id = ?', [userId])
    const photos = await db.queryOne<any>('SELECT COUNT(*) as c FROM photos WHERE user_id = ?', [userId])
    const notes = await db.queryOne<any>('SELECT COUNT(*) as c FROM notes WHERE user_id = ?', [userId])
    const livestock = await db.queryOne<any>('SELECT COUNT(*) as c FROM livestock WHERE user_id = ?', [userId])
    const reminders = await db.queryOne<any>('SELECT COUNT(*) as c FROM maintenance_reminders WHERE user_id = ?', [userId])
    const equipment = await db.queryOne<any>('SELECT COUNT(*) as c FROM equipment WHERE user_id = ?', [userId])

    return {
      total_users: 1,
      total_tanks: tanks?.c || 0,
      total_parameters: params?.c || 0,
      total_photos: photos?.c || 0,
      total_notes: notes?.c || 0,
      total_livestock: livestock?.c || 0,
      total_reminders: reminders?.c || 0,
      total_equipment: equipment?.c || 0,
      database_size_mb: null,
      active_users_last_30_days: 1,
    }
  },

  getUserDataSummary: async (userId: string): Promise<UserDataSummary> => {
    const user = await adminApi.getUser(userId)
    const tanks = await db.queryOne<any>('SELECT COUNT(*) as c FROM tanks WHERE user_id = ?', [userId])
    const photos = await db.queryOne<any>('SELECT COUNT(*) as c FROM photos WHERE user_id = ?', [userId])
    const notes = await db.queryOne<any>('SELECT COUNT(*) as c FROM notes WHERE user_id = ?', [userId])
    const livestock = await db.queryOne<any>('SELECT COUNT(*) as c FROM livestock WHERE user_id = ?', [userId])
    const reminders = await db.queryOne<any>('SELECT COUNT(*) as c FROM maintenance_reminders WHERE user_id = ?', [userId])
    const total = (tanks?.c || 0) + (photos?.c || 0) + (notes?.c || 0) + (livestock?.c || 0) + (reminders?.c || 0)

    return {
      user_id: userId, email: user.email, username: user.username,
      tanks: tanks?.c || 0, photos: photos?.c || 0, notes: notes?.c || 0,
      livestock: livestock?.c || 0, reminders: reminders?.c || 0, total_items: total,
    }
  },

  exportUserData: async (_userId: string): Promise<any> => {
    const { exportAllData } = await import('./dataTransfer')
    return exportAllData()
  },

  importUserData: async (_userId: string, data: any): Promise<any> => {
    const { importAllData } = await import('./dataTransfer')
    return importAllData(data)
  },

  exportDatabase: async (): Promise<any> => {
    const { exportAllData } = await import('./dataTransfer')
    return exportAllData()
  },

  importDatabase: async (data: any, _replace = false): Promise<any> => {
    const { importAllData } = await import('./dataTransfer')
    return importAllData(data)
  },

  listUsersWithStats: async (): Promise<UserWithStats[]> => {
    const userId = getLocalUserId()
    const user = await adminApi.getUser(userId)
    const summary = await adminApi.getUserDataSummary(userId)
    return [{
      ...user,
      tank_count: summary.tanks,
      livestock_count: summary.livestock,
      equipment_count: 0,
      photo_count: summary.photos,
      note_count: summary.notes,
      reminder_count: summary.reminders,
      total_records: summary.total_items,
      data_size_mb: 0,
    }]
  },

  exportTankData: async (_userId: string, tankId: string): Promise<any> => {
    const { exportTankData } = await import('./dataTransfer')
    return exportTankData(tankId)
  },

  getStorageStats: async (): Promise<StorageStats> => {
    return {
      total_size_bytes: 0, total_files: 0, files_on_disk: 0, missing_count: 0,
      categories: {}, per_user: [], orphan_count: 0, orphan_size_bytes: 0,
    }
  },

  getStorageFiles: async (): Promise<StorageFile[]> => {
    return []
  },

  deleteOrphans: async (): Promise<{ deleted: number; freed_bytes: number }> => {
    return { deleted: 0, freed_bytes: 0 }
  },

  downloadAllFiles: async (): Promise<void> => {
    // Not applicable in local mode
  },
}
