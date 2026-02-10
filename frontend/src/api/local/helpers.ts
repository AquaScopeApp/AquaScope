/**
 * Shared utilities for local API implementations
 */

import { db } from '../../services/database'
import { generateId, now } from '../../services/idgen'

export { db, generateId, now }

const LOCAL_USER_ID_KEY = 'aquascope_local_user_id'

/**
 * Get or create the local user ID.
 * In local mode there's a single user — no multi-user support.
 */
export function getLocalUserId(): string {
  let userId = localStorage.getItem(LOCAL_USER_ID_KEY)
  if (!userId) {
    userId = generateId()
    localStorage.setItem(LOCAL_USER_ID_KEY, userId)
  }
  return userId
}

/**
 * Parse a JSON TEXT column, returning null if empty/invalid.
 */
export function parseJSON<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Convert SQLite integer (0/1) to boolean.
 */
export function toBool(value: number | null | undefined): boolean {
  return value === 1
}

/**
 * Convert boolean to SQLite integer.
 */
export function fromBool(value: boolean | undefined | null): number {
  return value ? 1 : 0
}
