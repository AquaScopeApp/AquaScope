/**
 * Parameter Form Component
 *
 * Form for logging new water test parameters
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PARAMETER_RANGES, PARAMETER_ORDER, getActiveParameterOrder } from '../../config/parameterRanges'
import type { ParameterRange } from '../../config/parameterRanges'

interface ParameterFormData {
  calcium?: number
  magnesium?: number
  alkalinity_kh?: number
  nitrate?: number
  phosphate?: number
  salinity?: number
  temperature?: number
  ph?: number
  gh?: number
  ammonia?: number
  nitrite?: number
  timestamp: string
}

interface ParameterFormProps {
  tankId: string
  onSubmit: (data: ParameterFormData) => Promise<void>
  onSuccess?: () => void
  customRanges?: Record<string, ParameterRange>
}

export default function ParameterForm({
  tankId: _tankId, // Prefixed with _ to indicate intentionally unused
  onSubmit,
  onSuccess,
  customRanges,
}: ParameterFormProps) {
  const ranges = customRanges || PARAMETER_RANGES
  const activeParams = customRanges ? getActiveParameterOrder(ranges) : PARAMETER_ORDER
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ParameterFormData>({
    defaultValues: {
      timestamp: new Date().toISOString().slice(0, 16),
    },
  })

  const onSubmitForm = async (data: ParameterFormData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // Filter out empty values
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (acc as any)[key] = value
        }
        return acc
      }, {} as ParameterFormData)

      // Check if at least one parameter is provided
      const hasParameters = activeParams.some(
        (param) => filteredData[param as keyof ParameterFormData] !== undefined
      )

      if (!hasParameters) {
        setError('Please enter at least one parameter value')
        setIsSubmitting(false)
        return
      }

      await onSubmit(filteredData)
      setSuccess(true)
      reset({
        timestamp: new Date().toISOString().slice(0, 16),
      })

      // Call success callback after a delay
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to submit parameters:', err)
      setError(err.response?.data?.detail || 'Failed to save parameters')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Log Water Test Results
      </h2>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
          Parameters saved successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
        {/* Timestamp */}
        <div>
          <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-1">
            Test Date & Time
          </label>
          <input
            id="timestamp"
            type="datetime-local"
            {...register('timestamp', { required: 'Timestamp is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
          {errors.timestamp && (
            <p className="mt-1 text-sm text-red-600">{errors.timestamp.message}</p>
          )}
        </div>

        {/* Parameter Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeParams.map((paramType) => {
            const range = ranges[paramType]
            if (!range) return null
            return (
              <div key={paramType}>
                <label
                  htmlFor={paramType}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {range.name}
                  <span className="text-gray-500 ml-1">({range.unit})</span>
                </label>
                <div className="relative">
                  <input
                    id={paramType}
                    type="number"
                    step={paramType === 'salinity' || paramType === 'phosphate' ? '0.001' : '0.01'}
                    placeholder={`${range.min} - ${range.max}`}
                    {...register(paramType as keyof ParameterFormData, {
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: 'Value must be positive',
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  />
                  {range.ideal && (
                    <div className="mt-1 text-xs text-gray-500">
                      Ideal: {range.ideal} {range.unit}
                    </div>
                  )}
                </div>
                {errors[paramType as keyof ParameterFormData] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[paramType as keyof ParameterFormData]?.message}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Parameters'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-900">
          <strong>Tip:</strong> You don't need to test all parameters every time. Enter only the
          values you've tested, and leave the others blank.
        </p>
      </div>
    </div>
  )
}
