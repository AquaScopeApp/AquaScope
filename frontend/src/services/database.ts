/**
 * SQLite Database Service
 *
 * Wraps @capacitor-community/sqlite for local-first data storage.
 * Used only in native (Capacitor) and local modes — web/PWA mode
 * talks to the backend API instead.
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { SCHEMA_VERSION, getSchemaSQL } from './schema'

const DB_NAME = 'aquascope'

class Database {
  private sqlite: SQLiteConnection
  private db: SQLiteDBConnection | null = null
  private initialized = false

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    const platform = Capacitor.getPlatform()

    // For web platform, ensure jeep-sqlite web component is available
    if (platform === 'web') {
      const jeepEl = document.querySelector('jeep-sqlite')
      if (jeepEl) {
        await customElements.whenDefined('jeep-sqlite')
        await this.sqlite.initWebStore()
      }
    }

    // Check connection consistency
    const retCC = await this.sqlite.checkConnectionsConsistency()
    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result

    if (retCC.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false)
    } else {
      this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false)
    }

    await this.db.open()
    await this.runMigrations()
    this.initialized = true
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not open')

    // Check current schema version
    let currentVersion = 0
    try {
      const result = await this.db.query('SELECT value FROM _meta WHERE key = ?', ['schema_version'])
      if (result.values && result.values.length > 0) {
        currentVersion = parseInt(result.values[0].value, 10)
      }
    } catch {
      // _meta table doesn't exist yet — fresh install
      currentVersion = 0
    }

    if (currentVersion < SCHEMA_VERSION) {
      const sql = getSchemaSQL()
      await this.db.execute(sql)

      // Upsert schema version
      await this.db.run(
        `INSERT INTO _meta (key, value) VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(SCHEMA_VERSION)]
      )
    }
  }

  /**
   * Execute a write statement (INSERT, UPDATE, DELETE)
   * Returns the number of rows affected and last insert id.
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastId: number }> {
    if (!this.db) throw new Error('Database not initialized')
    const result = await this.db.run(sql, params)
    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId ?? -1,
    }
  }

  /**
   * Execute multiple statements in a single transaction.
   */
  async executeSet(statements: Array<{ statement: string; values: any[] }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.executeSet(statements)
  }

  /**
   * Query rows from the database.
   */
  async query<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')
    const result = await this.db.query(sql, params)
    return (result.values ?? []) as T[]
  }

  /**
   * Query a single row. Returns null if not found.
   */
  async queryOne<T = Record<string, any>>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
  }

  /**
   * Begin a transaction, execute a callback, then commit or rollback.
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')
    await this.db.execute('BEGIN TRANSACTION')
    try {
      const result = await fn()
      await this.db.execute('COMMIT')
      return result
    } catch (error) {
      await this.db.execute('ROLLBACK')
      throw error
    }
  }

  /**
   * Check if the database is initialized and ready.
   */
  isReady(): boolean {
    return this.initialized
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(DB_NAME, false)
      this.db = null
      this.initialized = false
    }
  }
}

/** Singleton database instance */
export const db = new Database()
