/**
 * Offline Queue Service
 *
 * Stores failed write operations (POST/PUT/DELETE) in IndexedDB
 * and replays them when the app regains connectivity.
 */

interface QueuedRequest {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  timestamp: number
}

const DB_NAME = 'aquascope-offline'
const STORE_NAME = 'pending-requests'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function enqueueRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const entry: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
  }
  store.add(entry)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function flushQueue(): Promise<{ succeeded: number; failed: number }> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const allRequest = store.getAll()

  const items: QueuedRequest[] = await new Promise((resolve, reject) => {
    allRequest.onsuccess = () => resolve(allRequest.result)
    allRequest.onerror = () => reject(allRequest.error)
  })

  let succeeded = 0
  let failed = 0

  for (const item of items.sort((a, b) => a.timestamp - b.timestamp)) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      })
      if (response.ok || response.status < 500) {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite')
        deleteTx.objectStore(STORE_NAME).delete(item.id)
        await new Promise<void>((res) => { deleteTx.oncomplete = () => res() })
        succeeded++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { succeeded, failed }
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const countReq = store.count()
  return new Promise((resolve, reject) => {
    countReq.onsuccess = () => resolve(countReq.result)
    countReq.onerror = () => reject(countReq.error)
  })
}
