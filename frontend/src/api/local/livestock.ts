/**
 * Local Livestock API — with direct species search via public APIs
 */

import type {
  Livestock, LivestockCreate, LivestockUpdate,
  LivestockSplitResponse,
} from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function rowToLivestock(row: any): Livestock {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    species_name: row.species_name,
    common_name: row.common_name || null,
    type: row.type,
    fishbase_species_id: row.fishbase_species_id || null,
    worms_id: row.worms_id || null,
    inaturalist_id: row.inaturalist_id || null,
    cached_photo_url: row.cached_photo_url || null,
    quantity: row.quantity,
    status: row.status,
    added_date: row.added_date || null,
    removed_date: row.removed_date || null,
    notes: row.notes || null,
    created_at: row.created_at,
  }
}

export const livestockApi = {
  list: async (params?: { tank_id?: string; type?: string }): Promise<Livestock[]> => {
    const userId = getLocalUserId()
    const conditions = ['user_id = ?']
    const values: any[] = [userId]

    if (params?.tank_id) {
      conditions.push('tank_id = ?')
      values.push(params.tank_id)
    }
    if (params?.type) {
      conditions.push('type = ?')
      values.push(params.type)
    }

    const rows = await db.query(
      `SELECT * FROM livestock WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    )
    return rows.map(rowToLivestock)
  },

  get: async (id: string): Promise<Livestock> => {
    const row = await db.queryOne('SELECT * FROM livestock WHERE id = ?', [id])
    if (!row) throw new Error('Livestock not found')
    return rowToLivestock(row)
  },

  create: async (data: LivestockCreate): Promise<Livestock> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO livestock (id, tank_id, user_id, species_name, common_name, type,
       fishbase_species_id, worms_id, inaturalist_id, cached_photo_url,
       quantity, status, added_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.tank_id, userId, data.species_name, data.common_name ?? null, data.type,
       data.fishbase_species_id ?? null, data.worms_id ?? null, data.inaturalist_id ?? null,
       data.cached_photo_url ?? null, data.quantity ?? 1, data.status ?? 'alive',
       data.added_date ?? null, data.notes ?? null, timestamp]
    )

    return rowToLivestock({
      id, tank_id: data.tank_id, user_id: userId, species_name: data.species_name,
      common_name: data.common_name, type: data.type,
      fishbase_species_id: data.fishbase_species_id, worms_id: data.worms_id,
      inaturalist_id: data.inaturalist_id, cached_photo_url: data.cached_photo_url,
      quantity: data.quantity ?? 1, status: data.status ?? 'alive',
      added_date: data.added_date, notes: data.notes, created_at: timestamp,
    })
  },

  update: async (id: string, data: LivestockUpdate): Promise<Livestock> => {
    const existing = await db.queryOne('SELECT * FROM livestock WHERE id = ?', [id])
    if (!existing) throw new Error('Livestock not found')

    const fields = [
      'species_name', 'common_name', 'type', 'fishbase_species_id', 'worms_id',
      'inaturalist_id', 'cached_photo_url', 'quantity', 'status', 'added_date',
      'removed_date', 'notes',
    ]

    const sets: string[] = []
    const values: any[] = []
    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }

    if (sets.length > 0) {
      values.push(id)
      await db.execute(`UPDATE livestock SET ${sets.join(', ')} WHERE id = ?`, values)
    }

    return livestockApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM livestock WHERE id = ?', [id])
  },

  split: async (id: string, data: { split_quantity: number; new_status: 'dead' | 'removed' }): Promise<LivestockSplitResponse> => {
    const original = await db.queryOne<any>('SELECT * FROM livestock WHERE id = ?', [id])
    if (!original) throw new Error('Livestock not found')

    const newQuantity = original.quantity - data.split_quantity
    if (newQuantity < 0) throw new Error('Cannot split more than available')

    const timestamp = now()
    await db.execute('UPDATE livestock SET quantity = ? WHERE id = ?', [newQuantity, id])

    const splitId = generateId()
    await db.execute(
      `INSERT INTO livestock (id, tank_id, user_id, species_name, common_name, type,
       fishbase_species_id, worms_id, inaturalist_id, cached_photo_url,
       quantity, status, added_date, removed_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [splitId, original.tank_id, original.user_id, original.species_name,
       original.common_name, original.type, original.fishbase_species_id,
       original.worms_id, original.inaturalist_id, original.cached_photo_url,
       data.split_quantity, data.new_status, original.added_date,
       timestamp.split('T')[0], original.notes, timestamp]
    )

    return {
      original: rowToLivestock({ ...original, quantity: newQuantity }),
      split: rowToLivestock({
        ...original, id: splitId, quantity: data.split_quantity,
        status: data.new_status, removed_date: timestamp.split('T')[0],
        created_at: timestamp,
      }),
    }
  },

  // Species search — direct calls to public APIs (Capacitor handles CORS)
  searchFishBase: async (_query: string, _limit = 10): Promise<any[]> => {
    // FishBase search not available in local mode — use unified search
    return []
  },

  getFishBaseSpecies: async (_species_id: string, _include_images = false): Promise<any> => {
    return null
  },

  getFishBaseSpeciesImages: async (_species_id: string): Promise<any[]> => {
    return []
  },

  searchWoRMS: async (query: string, limit = 10): Promise<any[]> => {
    try {
      const response = await fetch(
        `https://www.marinespecies.org/rest/AphiaRecordsByVernacular/${encodeURIComponent(query)}?like=true&offset=1`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok) {
        // Try scientific name
        const resp2 = await fetch(
          `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(query)}?like=true&marine_only=false&offset=1`,
          { signal: AbortSignal.timeout(10000) }
        )
        if (!resp2.ok) return []
        const data = await resp2.json()
        return Array.isArray(data) ? data.slice(0, limit) : []
      }
      const data = await response.json()
      return Array.isArray(data) ? data.slice(0, limit) : []
    } catch {
      return []
    }
  },

  getWoRMSSpecies: async (aphiaId: string, _includeVernacular = false): Promise<any> => {
    try {
      const response = await fetch(
        `https://www.marinespecies.org/rest/AphiaRecordByAphiaID/${aphiaId}`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok) return null
      return response.json()
    } catch {
      return null
    }
  },

  searchINaturalist: async (query: string, limit = 10): Promise<any[]> => {
    try {
      const response = await fetch(
        `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=${limit}&is_active=true`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok) return []
      const data = await response.json()
      return data.results || []
    } catch {
      return []
    }
  },

  getINaturalistSpecies: async (taxonId: string): Promise<any> => {
    try {
      const response = await fetch(
        `https://api.inaturalist.org/v1/taxa/${taxonId}`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok) return null
      const data = await response.json()
      return data.results?.[0] || null
    } catch {
      return null
    }
  },

  getINaturalistPhotos: async (taxonId: string, limit = 10): Promise<any[]> => {
    try {
      const response = await fetch(
        `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&photos=true&per_page=${limit}&quality_grade=research`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!response.ok) return []
      const data = await response.json()
      return (data.results || []).flatMap((obs: any) =>
        (obs.photos || []).map((p: any) => ({ url: p.url?.replace('square', 'medium'), attribution: p.attribution }))
      )
    } catch {
      return []
    }
  },

  unifiedSearch: async (query: string, sources = 'worms,inaturalist', limit = 5): Promise<any> => {
    const results: any = {}
    const sourceList = sources.split(',')

    if (sourceList.includes('worms')) {
      results.worms = await livestockApi.searchWoRMS(query, limit)
    }
    if (sourceList.includes('inaturalist')) {
      results.inaturalist = await livestockApi.searchINaturalist(query, limit)
    }

    return results
  },
}
