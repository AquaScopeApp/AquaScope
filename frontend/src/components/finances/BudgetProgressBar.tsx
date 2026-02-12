/**
 * Budget Progress Bar
 *
 * Shows budget utilization with a colored progress bar.
 */

import { useTranslation } from 'react-i18next'
import type { BudgetStatus } from '../../types'
import { formatPrice } from '../../utils/price'

interface Props {
  status: BudgetStatus
  onEdit: () => void
  onDelete: () => void
}

export default function BudgetProgressBar({ status, onEdit, onDelete }: Props) {
  const { t } = useTranslation('finances')
  const { budget, spent, remaining, percentage_used, is_over_budget } = status

  const barColor = is_over_budget
    ? 'bg-red-500'
    : percentage_used > 80
      ? 'bg-amber-500'
      : 'bg-green-500'

  const barWidth = Math.min(percentage_used, 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{budget.name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {budget.category ? t(`categories.${budget.category}`) : t('budget.allCategories')}
            {' · '}
            {t(`budget.${budget.period}`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            title={t('budget.edit')}
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 text-sm"
            title={t('budget.delete')}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className={is_over_budget ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
          {formatPrice(spent, budget.currency)} / {formatPrice(budget.amount, budget.currency)}
        </span>
        <span className={is_over_budget ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}>
          {is_over_budget
            ? t('budget.overBy', { amount: formatPrice(Math.abs(remaining), budget.currency) })
            : t('budget.remaining', { amount: formatPrice(remaining, budget.currency) })
          }
        </span>
      </div>
    </div>
  )
}
