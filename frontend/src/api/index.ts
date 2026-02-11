/**
 * API Routing Layer
 *
 * The core architecture for supporting multiple deployment modes:
 * - Web/PWA mode: routes to REST API client (backend server)
 * - Local/Native mode: routes to local SQLite implementations
 *
 * IMPORTANT: initializeApi() must be called before React renders.
 * All page/component code imports from this file, never directly from client.ts.
 */

import { isLocalMode } from '../platform'

// Re-export types so consumers don't need to change type imports
export type { default as ApiClient } from './client'

// ---------------------------------------------------------------------------
// Mutable API bindings — populated by initializeApi() before React renders
// ---------------------------------------------------------------------------

export let authApi: typeof import('./client').authApi
export let tanksApi: typeof import('./client').tanksApi
export let parametersApi: typeof import('./client').parametersApi
export let notesApi: typeof import('./client').notesApi
export let photosApi: typeof import('./client').photosApi
export let maintenanceApi: typeof import('./client').maintenanceApi
export let livestockApi: typeof import('./client').livestockApi
export let equipmentApi: typeof import('./client').equipmentApi
export let consumablesApi: typeof import('./client').consumablesApi
export let icpTestsApi: typeof import('./client').icpTestsApi
export let parameterRangesApi: typeof import('./client').parameterRangesApi
export let adminApi: typeof import('./client').adminApi

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let initialized = false

/**
 * Initialize the API layer. Must be called once before React renders.
 * Dynamically imports the correct backend based on platform detection.
 */
export async function initializeApi(): Promise<void> {
  if (initialized) return

  if (isLocalMode()) {
    const local = await import('./local')
    authApi = local.authApi
    tanksApi = local.tanksApi
    parametersApi = local.parametersApi
    notesApi = local.notesApi
    photosApi = local.photosApi
    maintenanceApi = local.maintenanceApi
    livestockApi = local.livestockApi
    equipmentApi = local.equipmentApi
    consumablesApi = local.consumablesApi
    icpTestsApi = local.icpTestsApi
    parameterRangesApi = local.parameterRangesApi
    adminApi = local.adminApi
  } else {
    const remote = await import('./client')
    authApi = remote.authApi
    tanksApi = remote.tanksApi
    parametersApi = remote.parametersApi
    notesApi = remote.notesApi
    photosApi = remote.photosApi
    maintenanceApi = remote.maintenanceApi
    livestockApi = remote.livestockApi
    equipmentApi = remote.equipmentApi
    consumablesApi = remote.consumablesApi
    icpTestsApi = remote.icpTestsApi
    parameterRangesApi = remote.parameterRangesApi
    adminApi = remote.adminApi
  }

  initialized = true
}
