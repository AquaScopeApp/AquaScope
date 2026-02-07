/**
 * Reminder Form Component
 *
 * Form for creating and editing maintenance reminders
 */

import { useState, useEffect } from 'react'
import { MaintenanceReminder, Tank, MaintenanceReminderCreate } from '../../types'

interface ReminderFormProps {
  tanks: Tank[]
  reminder?: MaintenanceReminder
  onSubmit: (data: MaintenanceReminderCreate) => void
  onCancel: () => void
}

const REMINDER_TYPES = [
  { value: 'water_change', label: 'Water Change', icon: '💧' },
  { value: 'pump_cleaning', label: 'Pump Cleaning', icon: '⚙️' },
  { value: 'skimmer_cleaning', label: 'Skimmer Cleaning', icon: '🫧' },
  { value: 'filter_media_change', label: 'Filter Media Change', icon: '🔄' },
  { value: 'glass_cleaning', label: 'Glass Cleaning', icon: '🪟' },
  { value: 'dosing_refill', label: 'Dosing Refill', icon: '💊' },
  { value: 'test_kit_calibration', label: 'Test Kit Calibration', icon: '🧪' },
  { value: 'equipment_check', label: 'Equipment Check', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📋' },
]

const FREQUENCY_PRESETS = [
  { days: 3, label: '3 days' },
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Bi-weekly' },
  { days: 30, label: 'Monthly' },
  { days: 60, label: 'Every 2 months' },
  { days: 90, label: 'Quarterly' },
  { days: 180, label: 'Every 6 months' },
]

export default function ReminderForm({
  tanks,
  reminder,
  onSubmit,
  onCancel,
}: ReminderFormProps) {
  const [tankId, setTankId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reminderType, setReminderType] = useState('water_change')
  const [frequencyDays, setFrequencyDays] = useState('7')
  const [nextDue, setNextDue] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (reminder) {
      setTankId(reminder.tank_id)
      setTitle(reminder.title)
      setDescription(reminder.description || '')
      setReminderType(reminder.reminder_type)
      setFrequencyDays(reminder.frequency_days.toString())
      setNextDue(reminder.next_due)
      setIsActive(reminder.is_active)
    } else {
      // Set default next due date to today
      const today = new Date().toISOString().split('T')[0]
      setNextDue(today)
    }
  }, [reminder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: MaintenanceReminderCreate = {
        tank_id: tankId,
        title,
        description: description || undefined,
        reminder_type: reminderType,
        frequency_days: parseInt(frequencyDays),
        next_due: nextDue,
      }

      await onSubmit(data)

      // Reset form if creating new reminder
      if (!reminder) {
        setTitle('')
        setDescription('')
        setReminderType('water_change')
        setFrequencyDays('7')
        const today = new Date().toISOString().split('T')[0]
        setNextDue(today)
      }
    } catch (error) {
      console.error('Error submitting reminder:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFrequencyPreset = (days: number) => {
    setFrequencyDays(days.toString())
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {reminder ? 'Edit Reminder' : 'Create New Reminder'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tank Selection */}
          <div>
            <label
              htmlFor="tank"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tank <span className="text-red-500">*</span>
            </label>
            <select
              id="tank"
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              required
              disabled={!!reminder}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 disabled:bg-gray-100"
            >
              <option value="">Select a tank</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {REMINDER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReminderType(type.value)}
                  className={`p-3 border-2 rounded-md text-left transition-colors ${
                    reminderType === type.value
                      ? 'border-ocean-500 bg-ocean-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Weekly 10% water change"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g., Change 50L of water, clean powerheads during change"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency <span className="text-red-500">*</span>
            </label>

            {/* Frequency Presets */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
              {FREQUENCY_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handleFrequencyPreset(preset.days)}
                  className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                    parseInt(frequencyDays) === preset.days
                      ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Frequency */}
            <div className="flex items-center space-x-2">
              <label htmlFor="frequency" className="text-sm text-gray-600">
                Every
              </label>
              <input
                type="number"
                id="frequency"
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(e.target.value)}
                required
                min="1"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          </div>

          {/* Next Due Date */}
          <div>
            <label
              htmlFor="nextDue"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Next Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="nextDue"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              When should this task be done next?
            </p>
          </div>

          {/* Active Status (only for editing) */}
          {reminder && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-ocean-600 border-gray-300 rounded focus:ring-ocean-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (uncheck to pause this reminder)
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tankId || !title}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : reminder ? 'Update Reminder' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
