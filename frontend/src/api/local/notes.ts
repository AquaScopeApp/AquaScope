/**
 * Local Notes API
 */

import type { Note, NoteCreate, NoteUpdate } from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function rowToNote(row: any): Note {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export const notesApi = {
  list: async (tank_id?: string): Promise<Note[]> => {
    const userId = getLocalUserId()
    if (tank_id) {
      const rows = await db.query(
        'SELECT * FROM notes WHERE user_id = ? AND tank_id = ? ORDER BY created_at DESC',
        [userId, tank_id]
      )
      return rows.map(rowToNote)
    }
    const rows = await db.query(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    return rows.map(rowToNote)
  },

  get: async (id: string): Promise<Note> => {
    const row = await db.queryOne('SELECT * FROM notes WHERE id = ?', [id])
    if (!row) throw new Error('Note not found')
    return rowToNote(row)
  },

  create: async (data: NoteCreate): Promise<Note> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO notes (id, tank_id, user_id, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.tank_id, userId, data.content, timestamp, timestamp]
    )

    return { id, tank_id: data.tank_id, user_id: userId, content: data.content, created_at: timestamp, updated_at: timestamp }
  },

  update: async (id: string, data: NoteUpdate): Promise<Note> => {
    const timestamp = now()
    await db.execute(
      'UPDATE notes SET content = ?, updated_at = ? WHERE id = ?',
      [data.content, timestamp, id]
    )
    return notesApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM notes WHERE id = ?', [id])
  },
}
