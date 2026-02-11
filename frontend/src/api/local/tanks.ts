/**
 * Local Tanks API — SQLite CRUD for tanks and tank events
 */

import type {
  Tank, TankCreate, TankUpdate,
  TankEvent, TankEventCreate, TankEventUpdate,
} from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function computeTotalVolume(display: number | null | undefined, sump: number | null | undefined): number {
  return (display || 0) + (sump || 0)
}

function rowToTank(row: any, events: TankEvent[] = []): Tank {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    water_type: row.water_type,
    aquarium_subtype: row.aquarium_subtype || null,
    display_volume_liters: row.display_volume_liters ?? null,
    sump_volume_liters: row.sump_volume_liters ?? null,
    total_volume_liters: row.total_volume_liters,
    description: row.description || null,
    image_url: row.image_url || null,
    setup_date: row.setup_date || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_archived: !!row.is_archived,
    events,
  }
}

function rowToEvent(row: any): TankEvent {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || null,
    event_date: row.event_date,
    event_type: row.event_type || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export const tanksApi = {
  list: async (params?: { include_archived?: boolean }): Promise<Tank[]> => {
    const userId = getLocalUserId()
    const archiveFilter = params?.include_archived ? '' : ' AND (is_archived = 0 OR is_archived IS NULL)'
    const rows = await db.query(`SELECT * FROM tanks WHERE user_id = ?${archiveFilter} ORDER BY created_at DESC`, [userId])
    const tanks: Tank[] = []
    for (const row of rows) {
      const eventRows = await db.query('SELECT * FROM tank_events WHERE tank_id = ? ORDER BY event_date DESC', [row.id])
      tanks.push(rowToTank(row, eventRows.map(rowToEvent)))
    }
    return tanks
  },

  get: async (id: string): Promise<Tank> => {
    const row = await db.queryOne('SELECT * FROM tanks WHERE id = ?', [id])
    if (!row) throw new Error('Tank not found')
    const eventRows = await db.query('SELECT * FROM tank_events WHERE tank_id = ? ORDER BY event_date DESC', [id])
    return rowToTank(row, eventRows.map(rowToEvent))
  },

  create: async (data: TankCreate): Promise<Tank> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()
    const totalVolume = computeTotalVolume(data.display_volume_liters, data.sump_volume_liters)

    await db.execute(
      `INSERT INTO tanks (id, user_id, name, water_type, aquarium_subtype, display_volume_liters,
       sump_volume_liters, total_volume_liters, description, image_url, setup_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, data.name, data.water_type || 'saltwater', data.aquarium_subtype ?? null,
       data.display_volume_liters ?? null, data.sump_volume_liters ?? null, totalVolume,
       data.description ?? null, data.image_url ?? null, data.setup_date ?? null, timestamp, timestamp]
    )

    return rowToTank({
      id, user_id: userId, name: data.name, water_type: data.water_type || 'saltwater',
      aquarium_subtype: data.aquarium_subtype, display_volume_liters: data.display_volume_liters,
      sump_volume_liters: data.sump_volume_liters, total_volume_liters: totalVolume,
      description: data.description, image_url: data.image_url, setup_date: data.setup_date,
      created_at: timestamp, updated_at: timestamp,
    })
  },

  update: async (id: string, data: TankUpdate): Promise<Tank> => {
    const existing = await db.queryOne('SELECT * FROM tanks WHERE id = ?', [id])
    if (!existing) throw new Error('Tank not found')

    const updated: any = { ...existing, ...data }
    updated.total_volume_liters = computeTotalVolume(updated.display_volume_liters, updated.sump_volume_liters)
    updated.updated_at = now()

    await db.execute(
      `UPDATE tanks SET name=?, water_type=?, aquarium_subtype=?, display_volume_liters=?,
       sump_volume_liters=?, total_volume_liters=?, description=?, image_url=?, setup_date=?, updated_at=?
       WHERE id=?`,
      [updated.name, updated.water_type, updated.aquarium_subtype, updated.display_volume_liters,
       updated.sump_volume_liters, updated.total_volume_liters, updated.description,
       updated.image_url, updated.setup_date, updated.updated_at, id]
    )

    const eventRows = await db.query('SELECT * FROM tank_events WHERE tank_id = ? ORDER BY event_date DESC', [id])
    return rowToTank(updated, eventRows.map(rowToEvent))
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM tanks WHERE id = ?', [id])
  },

  // Tank Events
  listEvents: async (tankId: string): Promise<TankEvent[]> => {
    const rows = await db.query('SELECT * FROM tank_events WHERE tank_id = ? ORDER BY event_date DESC', [tankId])
    return rows.map(rowToEvent)
  },

  createEvent: async (tankId: string, data: TankEventCreate): Promise<TankEvent> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO tank_events (id, tank_id, user_id, title, description, event_date, event_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tankId, userId, data.title, data.description ?? null, data.event_date, data.event_type ?? null, timestamp, timestamp]
    )

    return {
      id, tank_id: tankId, user_id: userId, title: data.title,
      description: data.description ?? null, event_date: data.event_date,
      event_type: data.event_type ?? null, created_at: timestamp, updated_at: timestamp,
    }
  },

  updateEvent: async (tankId: string, eventId: string, data: TankEventUpdate): Promise<TankEvent> => {
    const existing = await db.queryOne('SELECT * FROM tank_events WHERE id = ? AND tank_id = ?', [eventId, tankId])
    if (!existing) throw new Error('Event not found')

    const updated = { ...existing, ...data, updated_at: now() }
    await db.execute(
      `UPDATE tank_events SET title=?, description=?, event_date=?, event_type=?, updated_at=? WHERE id=?`,
      [updated.title, updated.description, updated.event_date, updated.event_type, updated.updated_at, eventId]
    )

    return rowToEvent(updated)
  },

  deleteEvent: async (tankId: string, eventId: string): Promise<void> => {
    await db.execute('DELETE FROM tank_events WHERE id = ? AND tank_id = ?', [eventId, tankId])
  },

  uploadImage: async (tankId: string, file: File): Promise<Tank> => {
    // In local mode, save the image via Capacitor Filesystem
    const { savePhoto } = await import('../../services/photoStorage')
    const savedPath = await savePhoto(file, `tank_${tankId}_${Date.now()}`)
    const timestamp = now()
    await db.execute('UPDATE tanks SET image_url = ?, updated_at = ? WHERE id = ?', [savedPath, timestamp, tankId])
    return tanksApi.get(tankId)
  },

  getImageBlobUrl: async (tankId: string): Promise<string> => {
    const tank = await db.queryOne<any>('SELECT image_url FROM tanks WHERE id = ?', [tankId])
    if (!tank?.image_url) return ''
    const { readPhoto } = await import('../../services/photoStorage')
    return readPhoto(tank.image_url)
  },

  archive: async (id: string): Promise<Tank> => {
    await db.execute('UPDATE tanks SET is_archived = 1, updated_at = ? WHERE id = ?', [now(), id])
    return tanksApi.get(id)
  },

  unarchive: async (id: string): Promise<Tank> => {
    await db.execute('UPDATE tanks SET is_archived = 0, updated_at = ? WHERE id = ?', [now(), id])
    return tanksApi.get(id)
  },
}
