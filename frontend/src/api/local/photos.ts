/**
 * Local Photos API — Uses Capacitor Filesystem for storage
 */

import type { Photo, PhotoUpdate } from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function rowToPhoto(row: any): Photo {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    filename: row.filename,
    file_path: row.file_path,
    thumbnail_path: row.thumbnail_path || null,
    description: row.description || null,
    taken_at: row.taken_at,
    is_tank_display: row.is_tank_display === 1,
    created_at: row.created_at,
  }
}

export const photosApi = {
  list: async (tank_id?: string): Promise<Photo[]> => {
    const userId = getLocalUserId()
    if (tank_id) {
      const rows = await db.query(
        'SELECT * FROM photos WHERE user_id = ? AND tank_id = ? ORDER BY taken_at DESC',
        [userId, tank_id]
      )
      return rows.map(rowToPhoto)
    }
    const rows = await db.query(
      'SELECT * FROM photos WHERE user_id = ? ORDER BY taken_at DESC',
      [userId]
    )
    return rows.map(rowToPhoto)
  },

  get: async (id: string): Promise<Photo> => {
    const row = await db.queryOne('SELECT * FROM photos WHERE id = ?', [id])
    if (!row) throw new Error('Photo not found')
    return rowToPhoto(row)
  },

  upload: async (formData: FormData): Promise<Photo> => {
    const file = formData.get('file') as File
    const tankId = formData.get('tank_id') as string
    const description = formData.get('description') as string | null
    const takenAt = (formData.get('taken_at') as string) || now()

    if (!file || !tankId) throw new Error('File and tank_id are required')

    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    // Save to filesystem
    const { savePhoto } = await import('../../services/photoStorage')
    const filename = `${id}_${file.name}`
    const filePath = await savePhoto(file, filename)

    // Generate thumbnail
    let thumbnailPath: string | null = null
    try {
      const { saveThumbnail } = await import('../../services/photoStorage')
      thumbnailPath = await saveThumbnail(file, `thumb_${filename}`)
    } catch {
      // Thumbnail generation failed — not critical
    }

    await db.execute(
      `INSERT INTO photos (id, tank_id, user_id, filename, file_path, thumbnail_path, description, taken_at, is_tank_display, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, tankId, userId, file.name, filePath, thumbnailPath, description, takenAt, timestamp]
    )

    return {
      id, tank_id: tankId, user_id: userId, filename: file.name,
      file_path: filePath, thumbnail_path: thumbnailPath,
      description: description || null, taken_at: takenAt,
      is_tank_display: false, created_at: timestamp,
    }
  },

  getFileUrl: (id: string, thumbnail = false): string => {
    // For local mode, we'll resolve this at render time via getFileBlobUrl
    return `local://photos/${id}${thumbnail ? '?thumb=1' : ''}`
  },

  getFileBlobUrl: async (id: string, thumbnail = false): Promise<string> => {
    const photo = await db.queryOne<any>('SELECT * FROM photos WHERE id = ?', [id])
    if (!photo) return ''
    const path = thumbnail && photo.thumbnail_path ? photo.thumbnail_path : photo.file_path
    const { readPhoto } = await import('../../services/photoStorage')
    return readPhoto(path)
  },

  update: async (id: string, data: PhotoUpdate): Promise<Photo> => {
    const sets: string[] = []
    const values: any[] = []

    if (data.description !== undefined) {
      sets.push('description = ?')
      values.push(data.description)
    }
    if (data.taken_at !== undefined) {
      sets.push('taken_at = ?')
      values.push(data.taken_at)
    }

    if (sets.length > 0) {
      values.push(id)
      await db.execute(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`, values)
    }

    return photosApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    const photo = await db.queryOne<any>('SELECT * FROM photos WHERE id = ?', [id])
    if (photo) {
      const { deletePhoto } = await import('../../services/photoStorage')
      await deletePhoto(photo.file_path, photo.thumbnail_path)
    }
    await db.execute('DELETE FROM photos WHERE id = ?', [id])
  },

  pin: async (id: string): Promise<Photo> => {
    const photo = await db.queryOne<any>('SELECT * FROM photos WHERE id = ?', [id])
    if (!photo) throw new Error('Photo not found')
    // Unpin all photos for this tank first
    await db.execute('UPDATE photos SET is_tank_display = 0 WHERE tank_id = ?', [photo.tank_id])
    await db.execute('UPDATE photos SET is_tank_display = 1 WHERE id = ?', [id])
    return photosApi.get(id)
  },

  unpin: async (id: string): Promise<Photo> => {
    await db.execute('UPDATE photos SET is_tank_display = 0 WHERE id = ?', [id])
    return photosApi.get(id)
  },
}
