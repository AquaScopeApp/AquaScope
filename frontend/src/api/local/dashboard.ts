/**
 * Local Dashboard API stub
 *
 * In local mode the dashboard falls back to individual API calls,
 * so this just returns an empty response.
 */
import type { DashboardResponse } from '../../types'

export const dashboardApi = {
  getSummary: async (): Promise<DashboardResponse> => {
    return { tanks: [], total_overdue: 0 }
  },
}
