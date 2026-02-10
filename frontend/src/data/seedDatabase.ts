/**
 * Seed Database — First-launch data population
 *
 * Creates a demo saltwater reef tank and populates it with
 * consumables from the embedded seed data. Only runs once
 * (tracked via _meta table).
 */

import { db, generateId, now, getLocalUserId } from '../api/local/helpers'
import { getSeedConsumables } from './seedConsumables'

const SEED_FLAG = 'data_seeded'

/**
 * Check if seed data has already been inserted.
 */
export async function isSeeded(): Promise<boolean> {
  try {
    const row = await db.queryOne<{ value: string }>(
      'SELECT value FROM _meta WHERE key = ?',
      [SEED_FLAG]
    )
    return row?.value === '1'
  } catch {
    return false
  }
}

/**
 * Seed the database with a demo tank and consumables.
 * Safe to call multiple times — skips if already seeded.
 */
export async function seedDatabase(): Promise<void> {
  if (await isSeeded()) return

  const userId = getLocalUserId()
  const timestamp = now()

  // Create a demo saltwater reef tank
  const tankId = generateId()
  await db.execute(
    `INSERT INTO tanks (id, user_id, name, water_type, aquarium_subtype,
     display_volume_liters, sump_volume_liters, total_volume_liters,
     description, setup_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tankId, userId, 'My Reef Tank', 'saltwater', 'reef',
      500, 100, 600,
      'Demo reef aquarium created on first launch. Edit or delete this tank to get started with your own setup.',
      '2024-12-10', timestamp, timestamp,
    ]
  )

  // Seed consumables for the demo tank
  const consumables = getSeedConsumables(tankId)
  for (const c of consumables) {
    const id = generateId()
    await db.execute(
      `INSERT INTO consumables (id, tank_id, user_id, name, consumable_type, brand, product_name,
       quantity_on_hand, quantity_unit, purchase_price, purchase_url,
       status, notes, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id, c.tank_id, userId, c.name, c.consumable_type,
        c.brand ?? null, c.product_name ?? null,
        c.quantity_on_hand ?? null, c.quantity_unit ?? null,
        c.purchase_price ?? null, c.purchase_url ?? null,
        c.status ?? 'active', c.notes ?? null,
        timestamp, timestamp,
      ]
    )
  }

  // Mark as seeded
  await db.execute(
    `INSERT INTO _meta (key, value) VALUES (?, '1')
     ON CONFLICT(key) DO UPDATE SET value = '1'`,
    [SEED_FLAG]
  )
}
