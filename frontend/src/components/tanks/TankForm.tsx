/**
 * Tank Form Component
 *
 * Form for creating and editing tanks
 */

import { useState, useEffect } from 'react'
import { Tank, TankCreate } from '../../types'

interface TankFormProps {
  tank?: Tank
  onSubmit: (data: TankCreate) => void
  onCancel: () => void
}

export default function TankForm({ tank, onSubmit, onCancel }: TankFormProps) {
  const [name, setName] = useState('')
  const [displayVolume, setDisplayVolume] = useState('')
  const [sumpVolume, setSumpVolume] = useState('')
  const [description, setDescription] = useState('')
  const [setupDate, setSetupDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (tank) {
      setName(tank.name)
      setDisplayVolume(tank.display_volume_liters?.toString() || '')
      setSumpVolume(tank.sump_volume_liters?.toString() || '')
      setDescription(tank.description || '')
      setSetupDate(tank.setup_date || '')
    }
  }, [tank])

  const getTotalVolume = () => {
    const display = parseFloat(displayVolume) || 0
    const sump = parseFloat(sumpVolume) || 0
    return display + sump
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: TankCreate = {
        name,
        display_volume_liters: displayVolume ? parseFloat(displayVolume) : null,
        sump_volume_liters: sumpVolume ? parseFloat(sumpVolume) : null,
        description: description || null,
        setup_date: setupDate || null,
      }

      await onSubmit(data)

      // Reset form if creating new tank
      if (!tank) {
        setName('')
        setDisplayVolume('')
        setSumpVolume('')
        setDescription('')
        setSetupDate('')
      }
    } catch (error) {
      console.error('Error submitting tank:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {tank ? 'Edit Tank' : 'Create New Tank'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tank Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Main Display Tank"
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
              placeholder="e.g., Mixed reef with SPS and LPS corals, heavy feeding schedule..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Volume Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">System Volume (Liters)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Volume */}
              <div>
                <label
                  htmlFor="displayVolume"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Display Tank
                </label>
                <input
                  type="number"
                  id="displayVolume"
                  value={displayVolume}
                  onChange={(e) => setDisplayVolume(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 400"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>

              {/* Sump Volume */}
              <div>
                <label
                  htmlFor="sumpVolume"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sump
                </label>
                <input
                  type="number"
                  id="sumpVolume"
                  value={sumpVolume}
                  onChange={(e) => setSumpVolume(e.target.value)}
                  step="0.1"
                  min="0"
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </div>

            {/* Total Volume Display */}
            {(displayVolume || sumpVolume) && (
              <div className="bg-ocean-50 border border-ocean-200 rounded-md p-3">
                <p className="text-sm text-ocean-900">
                  <span className="font-medium">Total System Volume:</span>{' '}
                  <span className="text-lg font-semibold">{getTotalVolume().toFixed(1)} L</span>
                </p>
              </div>
            )}
          </div>

          {/* Setup Date */}
          <div>
            <label
              htmlFor="setupDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Setup Date
            </label>
            <input
              type="date"
              id="setupDate"
              value={setupDate}
              onChange={(e) => setSetupDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              When did you first set up this tank?
            </p>
          </div>

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
              disabled={isSubmitting || !name}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : tank ? 'Update Tank' : 'Create Tank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
