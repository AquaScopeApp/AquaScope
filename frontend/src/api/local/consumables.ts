/**
 * Local Consumables API
 */

import type {
  Consumable, ConsumableCreate, ConsumableUpdate,
  ConsumableUsage, ConsumableUsageCreate,
  Equipment,
} from '../../types'
import { db, generateId, now, getLocalUserId } from './helpers'

function rowToConsumable(row: any): Consumable {
  return {
    id: row.id,
    tank_id: row.tank_id,
    user_id: row.user_id,
    name: row.name,
    consumable_type: row.consumable_type,
    brand: row.brand || null,
    product_name: row.product_name || null,
    quantity_on_hand: row.quantity_on_hand ?? null,
    quantity_unit: row.quantity_unit || null,
    purchase_date: row.purchase_date || null,
    purchase_price: row.purchase_price || null,
    purchase_url: row.purchase_url || null,
    expiration_date: row.expiration_date || null,
    status: row.status,
    notes: row.notes || null,
    usage_count: row.usage_count || 0,
    total_used: row.total_used || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_archived: !!row.is_archived,
  }
}

function rowToUsage(row: any): ConsumableUsage {
  return {
    id: row.id,
    consumable_id: row.consumable_id,
    user_id: row.user_id,
    usage_date: row.usage_date,
    quantity_used: row.quantity_used,
    quantity_unit: row.quantity_unit || null,
    notes: row.notes || null,
    created_at: row.created_at,
  }
}

export const consumablesApi = {
  list: async (params?: { tank_id?: string; consumable_type?: string; status?: string; include_archived?: boolean }): Promise<Consumable[]> => {
    const userId = getLocalUserId()
    const conditions = ['c.user_id = ?']
    const values: any[] = [userId]

    if (!params?.include_archived) { conditions.push('(c.is_archived = 0 OR c.is_archived IS NULL)') }
    if (params?.tank_id) { conditions.push('c.tank_id = ?'); values.push(params.tank_id) }
    if (params?.consumable_type) { conditions.push('c.consumable_type = ?'); values.push(params.consumable_type) }
    if (params?.status) { conditions.push('c.status = ?'); values.push(params.status) }

    const rows = await db.query(
      `SELECT c.*, COALESCE((SELECT SUM(quantity_used) FROM consumable_usage WHERE consumable_id = c.id), 0) as total_used
       FROM consumables c WHERE ${conditions.join(' AND ')} ORDER BY c.created_at DESC`,
      values
    )
    return rows.map(rowToConsumable)
  },

  get: async (id: string): Promise<Consumable> => {
    const row = await db.queryOne(
      `SELECT c.*, COALESCE((SELECT SUM(quantity_used) FROM consumable_usage WHERE consumable_id = c.id), 0) as total_used
       FROM consumables c WHERE c.id = ?`, [id])
    if (!row) throw new Error('Consumable not found')
    return rowToConsumable(row)
  },

  create: async (data: ConsumableCreate): Promise<Consumable> => {
    const id = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO consumables (id, tank_id, user_id, name, consumable_type, brand, product_name,
       quantity_on_hand, quantity_unit, purchase_date, purchase_price, purchase_url,
       expiration_date, status, notes, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, data.tank_id, userId, data.name, data.consumable_type,
       data.brand ?? null, data.product_name ?? null,
       data.quantity_on_hand ?? null, data.quantity_unit ?? null,
       data.purchase_date ?? null, data.purchase_price ?? null,
       data.purchase_url ?? null, data.expiration_date ?? null,
       data.status ?? 'active', data.notes ?? null, timestamp, timestamp]
    )

    return consumablesApi.get(id)
  },

  update: async (id: string, data: ConsumableUpdate): Promise<Consumable> => {
    const fields = ['name', 'consumable_type', 'brand', 'product_name', 'quantity_on_hand',
      'quantity_unit', 'purchase_date', 'purchase_price', 'purchase_url',
      'expiration_date', 'status', 'notes']
    const sets: string[] = []
    const values: any[] = []

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        sets.push(`${field} = ?`)
        values.push((data as any)[field])
      }
    }

    sets.push('updated_at = ?')
    values.push(now())
    values.push(id)

    await db.execute(`UPDATE consumables SET ${sets.join(', ')} WHERE id = ?`, values)
    return consumablesApi.get(id)
  },

  delete: async (id: string): Promise<void> => {
    await db.execute('DELETE FROM consumable_usage WHERE consumable_id = ?', [id])
    await db.execute('DELETE FROM consumables WHERE id = ?', [id])
  },

  logUsage: async (id: string, data: ConsumableUsageCreate): Promise<ConsumableUsage> => {
    const usageId = generateId()
    const userId = getLocalUserId()
    const timestamp = now()

    await db.execute(
      `INSERT INTO consumable_usage (id, consumable_id, user_id, usage_date, quantity_used, quantity_unit, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usageId, id, userId, data.usage_date, data.quantity_used, data.quantity_unit ?? null, data.notes ?? null, timestamp]
    )

    // Auto-deduct from quantity_on_hand and increment usage_count
    await db.execute(
      `UPDATE consumables SET
       quantity_on_hand = CASE WHEN quantity_on_hand IS NOT NULL THEN MAX(0, quantity_on_hand - ?) ELSE NULL END,
       usage_count = usage_count + 1,
       updated_at = ?
       WHERE id = ?`,
      [data.quantity_used, timestamp, id]
    )

    return { id: usageId, consumable_id: id, user_id: userId, ...data, quantity_unit: data.quantity_unit ?? null, notes: data.notes ?? null, created_at: timestamp }
  },

  listUsage: async (id: string): Promise<ConsumableUsage[]> => {
    const rows = await db.query(
      'SELECT * FROM consumable_usage WHERE consumable_id = ? ORDER BY usage_date DESC',
      [id]
    )
    return rows.map(rowToUsage)
  },

  convertToEquipment: async (id: string, equipmentType?: string): Promise<Equipment> => {
    const consumable = await db.queryOne('SELECT * FROM consumables WHERE id = ?', [id])
    if (!consumable) throw new Error('Consumable not found')

    const eqId = generateId()
    const timestamp = now()
    const eqType = equipmentType || 'other'

    await db.execute(
      `INSERT INTO equipment (id, tank_id, user_id, name, equipment_type, manufacturer, model,
       purchase_date, purchase_price, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eqId, consumable.tank_id, consumable.user_id, consumable.name, eqType,
       consumable.brand, consumable.product_name,
       consumable.purchase_date, consumable.purchase_price,
       consumable.status === 'active' || consumable.status === 'stock' ? consumable.status : 'active',
       consumable.notes, timestamp, timestamp]
    )

    await db.execute('DELETE FROM consumable_usage WHERE consumable_id = ?', [id])
    await db.execute('DELETE FROM consumables WHERE id = ?', [id])

    const row = await db.queryOne('SELECT * FROM equipment WHERE id = ?', [eqId])
    return row as Equipment
  },

  archive: async (id: string): Promise<Consumable> => {
    await db.execute('UPDATE consumables SET is_archived = 1, updated_at = ? WHERE id = ?', [now(), id])
    return consumablesApi.get(id)
  },

  unarchive: async (id: string): Promise<Consumable> => {
    await db.execute('UPDATE consumables SET is_archived = 0, updated_at = ? WHERE id = ?', [now(), id])
    return consumablesApi.get(id)
  },
}
