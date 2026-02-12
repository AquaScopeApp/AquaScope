/**
 * Local Export API stub
 *
 * CSV export is not supported in local/offline mode.
 * These methods are no-ops that log a warning.
 */

export const exportApi = {
  downloadParametersCSV: async (_tankId?: string, _start?: string): Promise<void> => {
    console.warn('CSV export is not available in local mode')
  },

  downloadLivestockCSV: async (_tankId?: string): Promise<void> => {
    console.warn('CSV export is not available in local mode')
  },

  downloadMaintenanceCSV: async (_tankId?: string): Promise<void> => {
    console.warn('CSV export is not available in local mode')
  },
}
