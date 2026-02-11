/**
 * Local Auth API
 *
 * In local mode, there's no real authentication. A single local user
 * is auto-created on first launch. Token is always 'local-mode'.
 */

import type { AuthToken, User, RegisterData, LoginCredentials } from '../../types'
import { db, now, getLocalUserId } from './helpers'

export const authApi = {
  register: async (_data: RegisterData): Promise<AuthToken> => {
    return { access_token: 'local-mode', token_type: 'bearer' }
  },

  login: async (_credentials: LoginCredentials): Promise<AuthToken> => {
    return { access_token: 'local-mode', token_type: 'bearer' }
  },

  getCurrentUser: async (): Promise<User> => {
    const userId = getLocalUserId()
    const existing = await db.queryOne<any>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        username: existing.username,
        is_admin: existing.is_admin === 1,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      }
    }

    // Auto-create the local user
    const timestamp = now()
    const user: User = {
      id: userId,
      email: 'local@aquascope.app',
      username: 'Aquarist',
      is_admin: false,
      created_at: timestamp,
      updated_at: timestamp,
    }

    await db.execute(
      `INSERT INTO users (id, email, username, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [user.id, user.email, user.username, timestamp, timestamp]
    )

    return user
  },
}
