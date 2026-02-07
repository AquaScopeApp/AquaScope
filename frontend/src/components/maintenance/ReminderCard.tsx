/**
 * Reminder Card Component
 *
 * Displays a maintenance reminder with status and actions
 */

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
  tanks,
  onComplete,
  onEdit,
  onDelete,
}: ReminderCardProps) {
  const tank = tanks.find((t) => t.id === reminder.tank_id)
  const dueDate = new Date(reminder.next_due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const getStatusColor = () => {
    if (!reminder.is_active) return 'border-gray-300 bg-gray-50'
    if (daysDiff < 0) return 'border-red-300 bg-red-50'
    if (daysDiff <= 7) return 'border-yellow-300 bg-yellow-50'
    return 'border-green-300 bg-green-50'
  }

  const getStatusBadge = () => {
    if (!reminder.is_active) {
      return <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded">Inactive</span>
    }
    if (daysDiff < 0) {
      return <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-200 rounded">Overdue {Math.abs(daysDiff)}d</span>
    }
    if (daysDiff === 0) {
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-600 bg-yellow-200 rounded">Due Today</span>
    }
    if (daysDiff <= 7) {
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-600 bg-yellow-200 rounded">Due in {daysDiff}d</span>
    }
    return <span className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-200 rounded">In {daysDiff}d</span>
  }

  const getReminderTypeIcon = () => {
    const type = reminder.reminder_type
    if (type.includes('water')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v9A2.5 2.5 0 005.5 17h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0014.5 3h-9z" clipRule="evenodd" />
        </svg>
      )
    }
    if (type.includes('pump') || type.includes('equipment')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
        </svg>
      )
    }
    if (type.includes('glass') || type.includes('clean')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div className={`rounded-lg shadow border-2 ${getStatusColor()} ${!reminder.is_active ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="text-gray-600">{getReminderTypeIcon()}</div>
            <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => onEdit(reminder)}
              className="p-1 text-gray-600 hover:bg-gray-200 rounded"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(reminder.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {getStatusBadge()}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Tank */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Tank</span>
          <span className="font-medium text-gray-900">{tank?.name || 'Unknown'}</span>
        </div>

        {/* Frequency */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Every</span>
          <span className="font-medium text-gray-900">{reminder.frequency_days} days</span>
        </div>

        {/* Next Due */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Next Due</span>
          <span className="font-medium text-gray-900">
            {format(dueDate, 'MMM d, yyyy')}
          </span>
        </div>

        {/* Last Completed */}
        {reminder.last_completed && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Done</span>
            <span className="text-gray-700">
              {formatDistanceToNow(new Date(reminder.last_completed), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Description */}
        {reminder.description && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">{reminder.description}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {reminder.is_active && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={() => onComplete(reminder.id)}
            className="w-full px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 text-sm font-medium"
          >
            Mark as Complete
          </button>
        </div>
      )}
    </div>
  )
}
