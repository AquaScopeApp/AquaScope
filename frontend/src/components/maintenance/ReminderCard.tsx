/**
 * Reminder Card Component
 *
 * Compact horizontal card for maintenance reminders (similar to LivestockCard).
 */

import { useTranslation } from 'react-i18next'
import { MaintenanceReminder, Tank } from '../../types'
import { formatDistanceToNow, format } from 'date-fns'

interface ReminderCardProps {
  reminder: MaintenanceReminder
  tanks: Tank[]
  onComplete: (id: string) => void
  onEdit: (reminder: MaintenanceReminder) => void
  onDelete: (id: string) => void
}

export default function ReminderCard({
  reminder,
  tanks: _tanks,
  onComplete,
  onEdit,
  onDelete,
}: ReminderCardProps) {
  const { t } = useTranslation('maintenance')
  const { t: tc } = useTranslation('common')
  const dueDate = new Date(reminder.next_due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const getStatusColor = () => {
    if (!reminder.is_active) return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
    if (daysDiff < 0) return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
    if (daysDiff <= 7) return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30'
    return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
  }

  const getStatusBadge = () => {
    if (!reminder.is_active) {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 rounded">{t('inactive')}</span>
    }
    if (daysDiff < 0) {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-900/50 rounded">{t('overdue')} {Math.abs(daysDiff)}d</span>
    }
    if (daysDiff === 0) {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900/50 rounded">{t('dueSoon').replace(/\s*\(.*\)/, '')} today</span>
    }
    if (daysDiff <= 7) {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-200 dark:bg-yellow-900/50 rounded">{daysDiff}d</span>
    }
    return <span className="px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-900/50 rounded">{daysDiff}d</span>
  }

  const getReminderTypeEmoji = () => {
    const type = reminder.reminder_type
    if (type.includes('water')) return '💧'
    if (type.includes('pump') || type.includes('equipment')) return '⚙️'
    if (type.includes('glass') || type.includes('clean')) return '🧽'
    if (type.includes('skimmer')) return '🌀'
    if (type.includes('filter')) return '🔄'
    if (type.includes('dosing')) return '💉'
    if (type.includes('test') || type.includes('calibrat')) return '🧪'
    return '🔧'
  }

  return (
    <div className={`rounded-lg shadow border-2 ${getStatusColor()} overflow-hidden ${!reminder.is_active ? 'opacity-60' : ''}`}>
      {/* Top row: emoji + title + badge + actions */}
      <div className="flex items-start p-3 gap-2">
        {/* Type emoji */}
        <div className="w-10 h-10 flex-shrink-0 rounded-md flex items-center justify-center bg-white/50 dark:bg-gray-700/50 text-xl">
          {getReminderTypeEmoji()}
        </div>

        {/* Title + badge */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
            {reminder.title}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            {getStatusBadge()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-0.5 flex-shrink-0">
          {reminder.is_active && (
            <button
              onClick={() => onComplete(reminder.id)}
              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
              title={tc('actions.markComplete', { defaultValue: 'Mark complete' })}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEdit(reminder)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title={tc('actions.edit')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            title={tc('actions.delete')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Condensed info row */}
      <div className="px-3 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {/* Frequency */}
        <span className="inline-flex items-center gap-0.5">
          <span className="text-gray-400">🔁</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('frequency.days', { count: reminder.frequency_days })}</span>
        </span>

        {/* Next due */}
        <span className="inline-flex items-center gap-0.5">
          <span className="text-gray-400">📅</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{format(dueDate, 'MMM d, yyyy')}</span>
        </span>

        {/* Last completed */}
        {reminder.last_completed && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">✅</span>
            <span>{formatDistanceToNow(new Date(reminder.last_completed), { addSuffix: true })}</span>
          </span>
        )}
      </div>

      {/* Description - compact */}
      {reminder.description && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 italic">{reminder.description}</p>
        </div>
      )}
    </div>
  )
}
