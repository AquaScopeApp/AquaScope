/**
 * Parameters Page
 *
 * View and log water test parameters with visualization
 */

import { useState, useEffect } from 'react'
import { tanksApi, parametersApi } from '../api/client'
import { PARAMETER_ORDER } from '../config/parameterRanges'
import ParameterChart from '../components/parameters/ParameterChart'
import ParameterForm from '../components/parameters/ParameterForm'
import type { Tank, ParameterReading } from '../types'

export default function Parameters() {
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Record<string, ParameterReading[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadTanks()
  }, [])

  useEffect(() => {
    if (selectedTank) {
      loadParameters()
    }
  }, [selectedTank, dateRange])

  const loadTanks = async () => {
    try {
      const data = await tanksApi.list()
      setTanks(data)
      if (data.length > 0 && !selectedTank) {
        setSelectedTank(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load tanks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadParameters = async () => {
    if (!selectedTank) return

    setIsLoading(true)
    try {
      // Calculate date range
      let startDate: string | undefined
      const now = new Date()
      if (dateRange !== 'all') {
        const days = parseInt(dateRange)
        const start = new Date(now)
        start.setDate(start.getDate() - days)
        startDate = start.toISOString()
      }

      // Load parameters for each type
      const parameterData: Record<string, ParameterReading[]> = {}

      await Promise.all(
        PARAMETER_ORDER.map(async (paramType) => {
          try {
            const data = await parametersApi.query({
              tank_id: selectedTank,
              parameter_type: paramType,
              start: startDate,
            })
            parameterData[paramType] = data
          } catch (error) {
            console.error(`Failed to load ${paramType}:`, error)
            parameterData[paramType] = []
          }
        })
      )

      setParameters(parameterData)
    } catch (error) {
      console.error('Failed to load parameters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitParameters = async (data: any) => {
    if (!selectedTank) return

    const timestamp = new Date(data.timestamp).toISOString()

    // Submit all parameters at once (batch submission)
    await parametersApi.submit({
      tank_id: selectedTank,
      timestamp,
      ...data,
    })
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    loadParameters()
  }

  if (isLoading && tanks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    )
  }

  if (tanks.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Tanks Yet</h2>
        <p className="text-gray-600 mb-6">
          You need to create a tank before logging parameters
        </p>
        <a
          href="/tanks/new"
          className="inline-block px-6 py-3 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          Create Your First Tank
        </a>
      </div>
    )
  }

  const selectedTankData = tanks.find((t) => t.id === selectedTank)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Water Parameters</h1>
          <p className="text-gray-600 mt-1">
            Track and visualize your reef tank water chemistry
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {showForm ? 'Hide Form' : 'Log Parameters'}
        </button>
      </div>

      {/* Tank Selector */}
      {tanks.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <label htmlFor="tank" className="block text-sm font-medium text-gray-700 mb-2">
            Select Tank
          </label>
          <select
            id="tank"
            value={selectedTank || ''}
            onChange={(e) => setSelectedTank(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name} {tank.volume_liters && `(${tank.volume_liters}L)`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tank Info */}
      {selectedTankData && (
        <div className="bg-gradient-to-r from-ocean-50 to-ocean-100 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-ocean-900">
            {selectedTankData.name}
          </h2>
          {selectedTankData.volume_liters && (
            <p className="text-ocean-700">Volume: {selectedTankData.volume_liters}L</p>
          )}
        </div>
      )}

      {/* Parameter Form */}
      {showForm && selectedTank && (
        <ParameterForm
          tankId={selectedTank}
          onSubmit={handleSubmitParameters}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex space-x-2">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: 'all', label: 'All Time' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
        </div>
      )}

      {/* Parameter Charts */}
      {!isLoading && selectedTank && (
        <div className="space-y-6">
          {PARAMETER_ORDER.map((paramType) => (
            <ParameterChart
              key={paramType}
              parameterType={paramType}
              data={parameters[paramType] || []}
              height={300}
            />
          ))}
        </div>
      )}

      {/* No Data Message */}
      {!isLoading &&
        selectedTank &&
        PARAMETER_ORDER.every((p) => (parameters[p] || []).length === 0) && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Parameter Data Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start tracking your water chemistry by logging your first water test results
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
            >
              Log First Parameters
            </button>
          </div>
        )}
    </div>
  )
}
