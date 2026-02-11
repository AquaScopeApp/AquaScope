/**
 * Local Equipment API
 */

import type { Equipment, EquipmentCreate, EquipmentUpdate, Consumable } from '../../types'
import { db, generateId, now, getLocalUserId, parseJSON } from './helpers'

function rowToEquipment(row: any): Equipment {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    name: row.name,
    equipment_type: row.equipment_type,
    manufacturer: row.manufacturer || null,
    model: row.model || null,
    specs: parseJSON(row.specs),
    purchase_date: row.purchase_date || null,
    purchase_price: row.purchase_price || null,
    condition: row.condition || null,
    status: row.status,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_archived: !!row.is_archived,
  }
}

export const equipmentApi = {
  list: async (params?: { tank_id?: string; equipment_type?: string; status?: string; include_archived?: boolean }): Promise<Equipment[]> => {
    const userId = getLocalUserId()
    const conditions = ['user_id = ?']
    const values: any[] = [userId]

    if (!params?.include_archived) { conditions.push('(is_archived = 0 OR is_archived IS NULL)') }
    if (params?.tank_id) { conditions.push('tank_id = ?'); values.push(params.tank_id) }
    if (params?.equipment_type) { conditions.push('equipment_type = ?'); values.push(params.equipment_type) }
    if (params?.status) { conditions.push('status = ?'); values.push(params.status) }

    const rows = await db.query(
      `SELECT * FROM equipment WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    )
    return rows.map(rowToEquipment)
  },

  get: async (id: string): Promise<Equipment> => {
    const row = await db.queryOne('SELECT * FROM equipment WHERE id = ?', [id])
    if (!row) throw new Error('Equipment not found')
    return rowToEquipment(row)
  },

  create: async (data: EquipmentCreate): Promise<Equipment> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO equipment (id, tank_id, user_id, name, equipment_type, manufacturer, model,
       specs, purchase_date, purchase_price, condition, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.tank_id, userId, data.name, data.equipment_type,
       data.manufacturer ?? null, data.model ?? null,
       data.specs ? JSON.stringify(data.specs) : null,
       data.purchase_date ?? null, data.purchase_price ?? null,
       data.condition ?? null, data.status ?? 'active',
       data.notes ?? null, timestamp, timestamp]
    )

    return rowToEquipment({
      id, tank_id: data.tank_id, user_id: userId, name: data.name,
      equipment_type: data.equipment_type, manufacturer: data.manufacturer,
      model: data.model, specs: data.specs ? JSON.stringify(data.specs) : null,
      purchase_date: data.purchase_date, purchase_price: data.purchase_price,
      condition: data.condition, status: data.status ?? 'active',
      notes: data.notes, created_at: timestamp, updated_at: timestamp,
    })
  },

  update: async (id: string, data: EquipmentUpdate): Promise<Equipment> => {
    const existing = await db.queryOne('SELECT * FROM equipment WHERE id = ?', [id])
    if (!existing) throw new Error('Equipment not found')

    const fields = ['name', 'equipment_type', 'manufacturer', 'model', 'purchase_date',
      'purchase_price', 'condition', 'status', 'notes']
    const sets: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }
    if (data.specs !== undefined) {
      sets.push('specs = ?')
      values.push(data.specs ? JSON.stringify(data.specs) : null)
    }

    sets.push('updated_at = ?')
    values.push(now())
    values.push(id)

    await db.execute(`UPDATE equipment SET ${sets.join(', ')} WHERE id = ?`, values)
    return equipmentApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM equipment WHERE id = ?', [id])
  },

  convertToConsumable: async (id: string, consumableType = 'other'): Promise<Consumable> => {
    const equipment = await db.queryOne('SELECT * FROM equipment WHERE id = ?', [id])
    if (!equipment) throw new Error('Equipment not found')

    const cId = generateId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO consumables (id, tank_id, user_id, name, consumable_type, brand, product_name,
       purchase_date, purchase_price, status, notes, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [cId, equipment.tank_id, equipment.user_id, equipment.name, consumableType,
       equipment.manufacturer, equipment.model,
       equipment.purchase_date, equipment.purchase_price,
       'active', equipment.notes, timestamp, timestamp]
    )

    await db.execute('DELETE FROM equipment WHERE id = ?', [id])

    const row = await db.queryOne('SELECT * FROM consumables WHERE id = ?', [cId])
    return row as Consumable
  },

  archive: async (id: string): Promise<Equipment> => {
    await db.execute('UPDATE equipment SET is_archived = 1, updated_at = ? WHERE id = ?', [now(), id])
    return equipmentApi.get(id)
  },

  unarchive: async (id: string): Promise<Equipment> => {
    await db.execute('UPDATE equipment SET is_archived = 0, updated_at = ? WHERE id = ?', [now(), id])
    return equipmentApi.get(id)
  },
}
