/**
 * Local Finances API (stub)
 *
 * TODO: Full SQLite implementation in Phase 6.
 * For now, returns empty data so the app builds in local mode.
 */

import type {
  FinanceSummary,
  MonthlySpending,
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetStatus,
  ExpenseDetailList,
} from '../../types'

const emptySummary: FinanceSummary = {
  total_spent: 0,
  total_equipment: 0,
  total_consumables: 0,
  total_livestock: 0,
  total_icp_tests: 0,
  by_category: [],
  by_tank: [],
  monthly: [],
}

export const financesApi = {
  getSummary: async (_tankId?: string): Promise<FinanceSummary> => emptySummary,
  getMonthly: async (_params?: { tank_id?: string; year?: number }): Promise<MonthlySpending[]> => [],
  listBudgets: async (_params?: { tank_id?: string; active_only?: boolean }): Promise<Budget[]> => [],
  createBudget: async (data: BudgetCreate): Promise<Budget> => ({
    id: crypto.randomUUID(),
    user_id: '',
    tank_id: null,
    name: data.name,
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    period: data.period ?? 'monthly',
    category: data.category ?? null,
    is_active: data.is_active ?? true,
    notes: data.notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  updateBudget: async (_id: string, _data: BudgetUpdate): Promise<Budget> => { throw new Error('Not implemented in local mode') },
  deleteBudget: async (_id: string): Promise<void> => {},
  getBudgetStatuses: async (_tankId?: string): Promise<BudgetStatus[]> => [],
  getDetails: async (_params?: { tank_id?: string; category?: string; page?: number; page_size?: number }): Promise<ExpenseDetailList> => ({
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  }),
  updateExpenseDetail: async (_itemId: string, _category: string, _updates: Record<string, string | null>): Promise<void> => {},
}
