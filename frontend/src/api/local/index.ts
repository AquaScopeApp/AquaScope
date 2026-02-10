/**
 * Local API Barrel Export
 *
 * Re-exports all local SQLite API implementations.
 * This module is dynamically imported by api/index.ts in local mode.
 */

export { authApi } from './auth'
export { tanksApi } from './tanks'
export { parametersApi } from './parameters'
export { parameterRangesApi } from './parameterRanges'
export { notesApi } from './notes'
export { photosApi } from './photos'
export { livestockApi } from './livestock'
export { equipmentApi } from './equipment'
export { consumablesApi } from './consumables'
export { maintenanceApi } from './maintenance'
export { icpTestsApi } from './icpTests'
export { adminApi } from './admin'
