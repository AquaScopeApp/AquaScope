/**
 * Budget Form
 *
 * Modal form for creating or editing budgets.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Budget, BudgetCreate, BudgetUpdate, Tank } from '../../types'

interface Props {
  tanks: Tank[]
  budget?: Budget | null
  onSubmit: (data: BudgetCreate | BudgetUpdate) => Promise<void>
  onClose: () => void
}

const CATEGORIES = ['equipment', 'consumables', 'livestock', 'icp_tests']
const PERIODS = ['monthly', 'yearly']

export default function BudgetForm({ tanks, budget, onSubmit, onClose }: Props) {
  const { t } = useTranslation('finances')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(budget?.name ?? '')
  const [amount, setAmount] = useState(budget?.amount?.toString() ?? '')
  const [currency, setCurrency] = useState(budget?.currency ?? 'EUR')
  const [period, setPeriod] = useState(budget?.period ?? 'monthly')
  const [category, setCategory] = useState(budget?.category ?? '')
  const [tankId, setTankId] = useState(budget?.tank_id ?? '')
  const [notes, setNotes] = useState(budget?.notes ?? '')

  useEffect(() => {
    if (budget) {
      setName(budget.name)
      setAmount(budget.amount.toString())
      setCurrency(budget.currency)
      setPeriod(budget.period)
      setCategory(budget.category ?? '')
      setTankId(budget.tank_id ?? '')
      setNotes(budget.notes ?? '')
    }
  }, [budget])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name,
        amount: parseFloat(amount),
        currency,
        period,
        category: category || null,
        tank_id: tankId || null,
        notes: notes || null,
      }
      await onSubmit(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">
          {budget ? t('budget.edit') : t('budget.create')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budget.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('budget.amount')}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                step="0.01"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('budget.currency')}
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={5}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budget.period')}
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {t(`budget.${p}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budget.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            >
              <option value="">{t('budget.allCategories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budget.tank')}
            </label>
            <select
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            >
              <option value="">{t('budget.allTanks')}</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budget.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              {t('budget.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name || !amount}
              className="px-4 py-2 bg-ocean-600 text-white text-sm rounded-md hover:bg-ocean-700 disabled:opacity-50"
            >
              {saving ? '...' : budget ? t('budget.save') : t('budget.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
