/**
 * Finances Page
 *
 * Aggregated spending insights from equipment, consumables, livestock, and ICP tests.
 * Features:
 * - Summary stats cards
 * - Category breakdown pie chart
 * - Monthly spending bar chart with cumulative line
 * - Budget management with progress tracking
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { financesApi, tanksApi } from '../api'
import type {
  FinanceSummary,
  MonthlySpending,
  Tank,
  Budget,
  BudgetCreate,
  BudgetUpdate,
  BudgetStatus,
  ExpenseDetail,
  ExpenseDetailList,
} from '../types'
import { formatPrice } from '../utils/price'
import { useCurrency } from '../hooks/useCurrency'
import SpendingPieChart from '../components/finances/SpendingPieChart'
import MonthlyBarChart from '../components/finances/MonthlyBarChart'
import BudgetProgressBar from '../components/finances/BudgetProgressBar'
import BudgetForm from '../components/finances/BudgetForm'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import Pagination from '../components/common/Pagination'

type Tab = 'summary' | 'details' | 'budgets'

const CATEGORY_COLORS: Record<string, string> = {
  equipment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  consumables: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  livestock: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  icp_tests: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  electricity: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
}

const DETAILS_PAGE_SIZE = 20

export default function Finances() {
  const { t } = useTranslation('finances')
  const { t: tc } = useTranslation('common')
  const { currency } = useCurrency()
  const { user } = useAuth()
  const fp = (amount: number) => formatPrice(amount, currency)

  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [isLoading, setIsLoading] = useState(true)

  // Summary data
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [monthly, setMonthly] = useState<MonthlySpending[]>([])

  // Budget data
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  // Details tab data
  const [details, setDetails] = useState<ExpenseDetailList | null>(null)
  const [detailsPage, setDetailsPage] = useState(1)
  const [detailsCategory, setDetailsCategory] = useState('')
  const [editingItem, setEditingItem] = useState<ExpenseDetail | null>(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', date: '', purchase_url: '', tank_id: '' })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const tankId = selectedTank || undefined

      const [tanksData, summaryData, monthlyData] = await Promise.all([
        tanksApi.list(),
        financesApi.getSummary(tankId),
        financesApi.getMonthly({ tank_id: tankId }),
      ])

      setTanks(tanksData)
      setSummary(summaryData)
      setMonthly(monthlyData)

      if (activeTab === 'budgets') {
        const statuses = await financesApi.getBudgetStatuses(tankId)
        setBudgetStatuses(statuses)
      }

      if (activeTab === 'details') {
        const detailsData = await financesApi.getDetails({
          tank_id: tankId,
          category: detailsCategory || undefined,
          page: detailsPage,
          page_size: DETAILS_PAGE_SIZE,
        })
        setDetails(detailsData)
      }
    } catch (err) {
      console.error('Failed to load finance data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTank, activeTab, detailsPage, detailsCategory])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadBudgets = useCallback(async () => {
    try {
      const statuses = await financesApi.getBudgetStatuses(selectedTank || undefined)
      setBudgetStatuses(statuses)
    } catch (err) {
      console.error('Failed to load budgets:', err)
    }
  }, [selectedTank])

  useEffect(() => {
    if (activeTab === 'budgets') {
      loadBudgets()
    }
  }, [activeTab, loadBudgets])

  const handleCreateBudget = async (data: BudgetCreate | BudgetUpdate) => {
    await financesApi.createBudget(data as BudgetCreate)
    await loadBudgets()
  }

  const handleUpdateBudget = async (data: BudgetCreate | BudgetUpdate) => {
    if (editingBudget) {
      await financesApi.updateBudget(editingBudget.id, data as BudgetUpdate)
      setEditingBudget(null)
      await loadBudgets()
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm(t('budget.confirmDelete'))) {
      await financesApi.deleteBudget(id)
      await loadBudgets()
    }
  }

  const openEditModal = (item: ExpenseDetail) => {
    setEditingItem(item)
    setEditForm({
      name: item.name,
      price: item.price !== null ? String(item.price) : '',
      date: item.date || '',
      purchase_url: item.purchase_url || '',
      tank_id: item.tank_id,
    })
  }

  const handleSaveDetail = async () => {
    if (!editingItem) return
    try {
      await financesApi.updateExpenseDetail(editingItem.id, editingItem.category, {
        name: editForm.name,
        price: editForm.price || null,
        date: editForm.date || null,
        purchase_url: editForm.purchase_url || null,
        tank_id: editForm.tank_id,
      })
      setEditingItem(null)
      loadData()
    } catch (err) {
      console.error('Failed to update expense:', err)
    }
  }

  const handleDeleteDetail = async () => {
    if (!editingItem) return
    if (!window.confirm(t('details.confirmDelete', { defaultValue: 'Delete this expense? This cannot be undone.' }))) return
    try {
      await financesApi.deleteExpenseDetail(editingItem.id, editingItem.category)
      setEditingItem(null)
      loadData()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  const statCards = summary
    ? [
        { label: t('stats.totalSpent'), value: summary.total_spent, icon: '💰' },
        { label: t('stats.equipment'), value: summary.total_equipment, icon: '⚙️' },
        { label: t('stats.consumables'), value: summary.total_consumables, icon: '🧪' },
        { label: t('stats.livestock'), value: summary.total_livestock, icon: '🐟' },
        { label: t('stats.icpTests'), value: summary.total_icp_tests, icon: '🔬' },
        { label: t('stats.electricity'), value: summary.total_electricity, icon: '⚡' },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Tank filter */}
        <TankSelector
          tanks={tanks}
          value={selectedTank}
          onChange={setSelectedTank}
          allLabel={t('allTanks')}
          defaultTankId={user?.default_tank_id || undefined}
        />
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          {(['summary', 'details', 'budgets'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-ocean-600 text-ocean-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {isLoading && !details ? (
        <div className="text-center py-12 text-gray-400">{tc('common.loading')}</div>
      ) : activeTab === 'summary' ? (
        /* ============== Summary Tab ============== */
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{card.icon}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {fp(card.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('charts.categoryBreakdown')}
              </h3>
              <SpendingPieChart data={summary?.by_category ?? []} currency={currency} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('charts.monthlySpending')}
              </h3>
              <MonthlyBarChart data={monthly} currency={currency} />
            </div>
          </div>

          {/* Per-tank breakdown */}
          {(summary?.by_tank?.length ?? 0) > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('charts.byTank')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                      <th className="pb-2 font-medium">{t('table.tank')}</th>
                      <th className="pb-2 font-medium text-right">{t('categories.equipment')}</th>
                      <th className="pb-2 font-medium text-right">{t('categories.consumables')}</th>
                      <th className="pb-2 font-medium text-right">{t('categories.livestock')}</th>
                      <th className="pb-2 font-medium text-right">{t('categories.icp_tests')}</th>
                      <th className="pb-2 font-medium text-right">{t('categories.electricity')}</th>
                      <th className="pb-2 font-medium text-right">{t('table.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary!.by_tank.map((row) => (
                      <tr key={row.tank_id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{row.tank_name}</td>
                        <td className="py-2 text-right">{fp(row.equipment)}</td>
                        <td className="py-2 text-right">{fp(row.consumables)}</td>
                        <td className="py-2 text-right">{fp(row.livestock)}</td>
                        <td className="py-2 text-right">{fp(row.icp_tests)}</td>
                        <td className="py-2 text-right">{fp(row.electricity)}</td>
                        <td className="py-2 text-right font-semibold">{fp(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'details' ? (
        /* ============== Details Tab ============== */
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex items-center gap-4">
            <select
              value={detailsCategory}
              onChange={(e) => { setDetailsCategory(e.target.value); setDetailsPage(1) }}
              className="border rounded-md px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">{t('details.allCategories', { defaultValue: 'All Categories' })}</option>
              <option value="equipment">{t('categories.equipment')}</option>
              <option value="consumables">{t('categories.consumables')}</option>
              <option value="livestock">{t('categories.livestock')}</option>
              <option value="icp_tests">{t('categories.icp_tests')}</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {details?.total ?? 0} {t('details.items', { defaultValue: 'items' })}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 font-medium">{t('details.date', { defaultValue: 'Date' })}</th>
                  <th className="px-4 py-3 font-medium">{t('details.name', { defaultValue: 'Name' })}</th>
                  <th className="px-4 py-3 font-medium">{t('details.category', { defaultValue: 'Category' })}</th>
                  <th className="px-4 py-3 font-medium">{t('details.tank', { defaultValue: 'Tank' })}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('details.price', { defaultValue: 'Price' })}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('details.url', { defaultValue: 'URL' })}</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(details?.items ?? []).map((item) => (
                  <tr key={`${item.category}-${item.id}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                      {item.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {t(`categories.${item.category}`, item.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">
                      {item.tank_name}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-gray-900 dark:text-gray-100">
                      {item.price !== null ? fp(item.price) : (item.price_raw || '—')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.purchase_url ? (
                        <a
                          href={item.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ocean-600 hover:text-ocean-700"
                          title={item.purchase_url}
                        >
                          <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-gray-400 hover:text-ocean-600 transition-colors"
                        title={t('details.edit', { defaultValue: 'Edit' })}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {(details?.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      {t('details.noItems', { defaultValue: 'No expenses found' })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {details && (
            <Pagination
              currentPage={details.page}
              totalPages={details.total_pages}
              totalItems={details.total}
              itemsPerPage={DETAILS_PAGE_SIZE}
              onPageChange={setDetailsPage}
            />
          )}
        </div>
      ) : (
        /* ============== Budgets Tab ============== */
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingBudget(null)
                setShowBudgetForm(true)
              }}
              className="px-4 py-2 bg-ocean-600 text-white text-sm rounded-md hover:bg-ocean-700"
            >
              {t('budget.create')}
            </button>
          </div>

          {budgetStatuses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t('budget.noBudgets')}
            </div>
          ) : (
            <div className="space-y-3">
              {budgetStatuses.map((status) => (
                <BudgetProgressBar
                  key={status.budget.id}
                  status={status}
                  onEdit={() => {
                    setEditingBudget(status.budget)
                    setShowBudgetForm(true)
                  }}
                  onDelete={() => handleDeleteBudget(status.budget.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budget form modal */}
      {showBudgetForm && (
        <BudgetForm
          tanks={tanks}
          budget={editingBudget}
          onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget}
          onClose={() => {
            setShowBudgetForm(false)
            setEditingBudget(null)
          }}
        />
      )}

      {/* Edit expense detail modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('details.editTitle', { defaultValue: 'Edit Expense' })}
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[editingItem.category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                {t(`categories.${editingItem.category}`, editingItem.category)}
              </span>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('details.name', { defaultValue: 'Name' })}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-ocean-500 focus:border-ocean-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('details.price', { defaultValue: 'Price' })} ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-ocean-500 focus:border-ocean-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="0.00"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('details.date', { defaultValue: 'Date' })}
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-ocean-500 focus:border-ocean-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Tank */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('details.tank', { defaultValue: 'Tank' })}
                </label>
                <select
                  value={editForm.tank_id}
                  onChange={(e) => setEditForm({ ...editForm, tank_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-ocean-500 focus:border-ocean-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {tanks.map((tank) => (
                    <option key={tank.id} value={tank.id}>{tank.name}</option>
                  ))}
                </select>
              </div>

              {/* Purchase URL */}
              {editingItem.category !== 'icp_tests' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('details.purchaseUrl', { defaultValue: 'Purchase URL' })}
                  </label>
                  <input
                    type="url"
                    value={editForm.purchase_url}
                    onChange={(e) => setEditForm({ ...editForm, purchase_url: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-ocean-500 focus:border-ocean-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={handleDeleteDetail}
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  {tc('actions.delete')}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    onClick={handleSaveDetail}
                    className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-md hover:bg-ocean-700"
                  >
                    {tc('actions.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
