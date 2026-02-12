/**
 * TankEventForm Component
 *
 * Form for creating or editing tank events
 */

import { useState, useEffect } from 'react'
import type { TankEvent, TankEventCreate, TankEventUpdate } from '../../types'

interface TankEventFormProps {
  event?: TankEvent  // If provided, we're editing
  onSubmit: (data: TankEventCreate | TankEventUpdate) => Promise<void>
  onCancel: () => void
}

export default function TankEventForm({ event, onSubmit, onCancel }: TankEventFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setEventDate(event.event_date)
      setEventType(event.event_type || '')
    } else {
      // Default to today's date
      setEventDate(new Date().toISOString().split('T')[0])
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !eventDate) {
      alert('Please provide a title and date')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: eventDate,
        event_type: eventType.trim() || undefined,
      })
    } catch (error) {
      console.error('Failed to save event:', error)
      alert('Failed to save event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const eventTypeOptions = [
    { value: '', label: 'None' },
    { value: 'setup', label: '🏗️ Setup' },
    { value: 'water_change', label: '💧 Water Change' },
    { value: 'rescape', label: '🪨 Rescape' },
    { value: 'equipment_added', label: '⚙️ Equipment Added' },
    { value: 'equipment_removed', label: '⚙️ Equipment Removed' },
    { value: 'livestock_added', label: '🐟 Livestock Added' },
    { value: 'livestock_lost', label: '💔 Livestock Lost' },
    { value: 'cleaning', label: '🧹 Cleaning' },
    { value: 'upgrade', label: '⬆️ Upgrade' },
    { value: 'issue', label: '⚠️ Issue' },
    { value: 'crash', label: '💥 Crash' },
    { value: 'milestone', label: '🎉 Milestone' },
    { value: 'other', label: '📝 Other' },
  ]

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {event ? 'Edit Event' : 'Add Event'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-ocean-500 focus:border-ocean-500 dark:bg-gray-700 dark:text-gray-100"
          placeholder="e.g., Added new coral, Water change, Equipment upgrade"
        />
      </div>

      {/* Event Date */}
      <div>
        <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Event Date *
        </label>
        <input
          type="date"
          id="eventDate"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-ocean-500 focus:border-ocean-500 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {/* Event Type */}
      <div>
        <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Event Type
        </label>
        <select
          id="eventType"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-ocean-500 focus:border-ocean-500 dark:bg-gray-700 dark:text-gray-100"
        >
          {eventTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-ocean-500 focus:border-ocean-500 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Optional details about this event..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Add Event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
