/**
 * Parameters Page
 *
 * View and log water test parameters with visualization
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tanksApi, parametersApi, parameterRangesApi } from '../api/client'
import { PARAMETER_RANGES, RATIO_ORDER, buildParameterRangesMap, getActiveParameterOrder } from '../config/parameterRanges'
import type { ParameterRange } from '../config/parameterRanges'
import ParameterChart from '../components/parameters/ParameterChart'
import ParameterForm from '../components/parameters/ParameterForm'
import type { Tank, ParameterReading } from '../types'

export default function Parameters() {
  const { t } = useTranslation('parameters')
  const { t: tc } = useTranslation('common')
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string | null>(null)
  const [parameters, setParameters] = useState<Record<string, ParameterReading[]>>({})
  const [ratios, setRatios] = useState<Record<string, ParameterReading[]>>({})
  const [customRanges, setCustomRanges] = useState<Record<string, ParameterRange> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d' | 'all'>('365d')
  const [showForm, setShowForm] = useState(false)
  const [showTableView, setShowTableView] = useState(false)
  const [editingReading, setEditingReading] = useState<{
    paramType: string
    reading: ParameterReading
  } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [editTimestamp, setEditTimestamp] = useState<string>('')
  const [tableFilter, setTableFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 30

  useEffect(() => {
    loadTanks()
  }, [])

  useEffect(() => {
    if (selectedTank) {
      loadRanges()
      loadParameters()
    }
  }, [selectedTank, dateRange])

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [tableFilter])

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

  const loadRanges = async () => {
    if (!selectedTank) return
    try {
      const apiRanges = await parameterRangesApi.getForTank(selectedTank)
      if (apiRanges.length > 0) {
        setCustomRanges(buildParameterRangesMap(apiRanges))
      } else {
        setCustomRanges(null) // Fall back to defaults
      }
    } catch (error) {
      console.error('Failed to load parameter ranges:', error)
      setCustomRanges(null)
    }
  }

  // Active ranges: custom from API or default
  const activeRanges = customRanges || PARAMETER_RANGES
  const activeParamOrder = getActiveParameterOrder(activeRanges)

  const loadParameters = async () => {
    if (!selectedTank) return

    setIsLoading(true)
    try {
      // Calculate date range
      let startDate: string | undefined
      const now = new Date()
      if (dateRange === 'all') {
        // Query from very far back to get all historical data
        startDate = '2020-01-01T00:00:00Z'
      } else {
        const days = parseInt(dateRange)
        const start = new Date(now)
        start.setDate(start.getDate() - days)
        startDate = start.toISOString()
      }

      console.log('[Parameters] Loading data with:', {
        tankId: selectedTank,
        dateRange,
        startDate,
        currentTime: now.toISOString()
      })

      // Load parameters for each type
      const parameterData: Record<string, ParameterReading[]> = {}

      await Promise.all(
        activeParamOrder.map(async (paramType) => {
          try {
            const data = await parametersApi.query({
              tank_id: selectedTank,
              parameter_type: paramType,
              start: startDate,
            })
            parameterData[paramType] = data
            console.log(`[Parameters] Loaded ${paramType}:`, data.length, 'readings')
          } catch (error) {
            console.error(`Failed to load ${paramType}:`, error)
            parameterData[paramType] = []
          }
        })
      )

      const totalReadings = Object.values(parameterData).flat().length
      console.log('[Parameters] Total readings loaded:', totalReadings)
      setParameters(parameterData)

      // Calculate ratios
      calculateRatios(parameterData)
    } catch (error) {
      console.error('Failed to load parameters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateRatios = (paramData: Record<string, ParameterReading[]>) => {
    const ratioData: Record<string, ParameterReading[]> = {}

    // Calculate NO3/PO4 ratio
    const nitrateData = paramData['nitrate'] || []
    const phosphateData = paramData['phosphate'] || []

    if (nitrateData.length > 0 && phosphateData.length > 0) {
      const no3po4Ratios: ParameterReading[] = []

      nitrateData.forEach(no3Reading => {
        const matchingPo4 = phosphateData.find(po4 =>
          Math.abs(new Date(po4.timestamp).getTime() - new Date(no3Reading.timestamp).getTime()) < 3600000 // Within 1 hour
        )

        if (matchingPo4 && matchingPo4.value > 0) {
          no3po4Ratios.push({
            time: no3Reading.time,
            timestamp: no3Reading.timestamp,
            tank_id: no3Reading.tank_id,
            parameter_type: 'no3_po4_ratio',
            value: no3Reading.value / matchingPo4.value,
          })
        }
      })

      ratioData['no3_po4_ratio'] = no3po4Ratios
    }

    // Calculate Mg/Ca ratio
    const magnesiumData = paramData['magnesium'] || []
    const calciumData = paramData['calcium'] || []

    if (magnesiumData.length > 0 && calciumData.length > 0) {
      const mgCaRatios: ParameterReading[] = []

      magnesiumData.forEach(mgReading => {
        const matchingCa = calciumData.find(ca =>
          Math.abs(new Date(ca.timestamp).getTime() - new Date(mgReading.timestamp).getTime()) < 3600000 // Within 1 hour
        )

        if (matchingCa && matchingCa.value > 0) {
          mgCaRatios.push({
            time: mgReading.time,
            timestamp: mgReading.timestamp,
            tank_id: mgReading.tank_id,
            parameter_type: 'mg_ca_ratio',
            value: mgReading.value / matchingCa.value,
          })
        }
      })

      ratioData['mg_ca_ratio'] = mgCaRatios
    }

    setRatios(ratioData)
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

  const handleDeleteParameter = async (
    paramType: string,
    timestamp: string
  ) => {
    if (!selectedTank) return

    if (!confirm('Are you sure you want to delete this reading?')) {
      return
    }

    try {
      const isoTimestamp = new Date(timestamp).toISOString()
      console.log('[Delete] Attempting to delete:', {
        tank_id: selectedTank,
        parameter_type: paramType,
        timestamp: isoTimestamp,
        original: timestamp
      })

      await parametersApi.delete({
        tank_id: selectedTank,
        parameter_type: paramType,
        timestamp: isoTimestamp,
      })

      console.log('[Delete] Successfully deleted')
      // Reload data after successful deletion
      loadParameters()
    } catch (error: any) {
      console.error('Failed to delete parameter:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error'
      alert(`Failed to delete parameter reading: ${errorMessage}`)
    }
  }

  const handleStartEdit = (paramType: string, reading: ParameterReading) => {
    setEditingReading({ paramType, reading })
    setEditValue(reading.value.toString())
    // Convert timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
    const timestamp = new Date(reading.timestamp)
    const localDateTime = new Date(timestamp.getTime() - timestamp.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setEditTimestamp(localDateTime)
  }

  const handleCancelEdit = () => {
    setEditingReading(null)
    setEditValue('')
    setEditTimestamp('')
  }

  const handleSaveEdit = async () => {
    if (!editingReading || !selectedTank) return

    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) {
      alert('Invalid value')
      return
    }

    // Validate timestamp
    const newTimestamp = new Date(editTimestamp)
    if (isNaN(newTimestamp.getTime())) {
      alert('Invalid timestamp')
      return
    }

    try {
      const oldIsoTimestamp = new Date(editingReading.reading.timestamp).toISOString()
      const newIsoTimestamp = newTimestamp.toISOString()

      console.log('[Edit] Step 1: Deleting old reading:', {
        tank_id: selectedTank,
        parameter_type: editingReading.paramType,
        timestamp: oldIsoTimestamp,
        original: editingReading.reading.timestamp
      })

      // Delete old reading
      await parametersApi.delete({
        tank_id: selectedTank,
        parameter_type: editingReading.paramType,
        timestamp: oldIsoTimestamp,
      })

      console.log('[Edit] Step 2: Submitting new reading:', {
        value: newValue,
        timestamp: newIsoTimestamp
      })

      // Submit new reading with updated value and timestamp
      const paramData: any = {
        tank_id: selectedTank,
        timestamp: newIsoTimestamp,
      }
      paramData[editingReading.paramType] = newValue

      await parametersApi.submit(paramData)

      console.log('[Edit] Successfully edited parameter')

      // Reload data
      setEditingReading(null)
      setEditValue('')
      setEditTimestamp('')
      loadParameters()
    } catch (error: any) {
      console.error('Failed to edit parameter:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error'
      alert(`Failed to edit parameter reading: ${errorMessage}`)
    }
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
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('noTanksYet')}</h2>
        <p className="text-gray-600 mb-6">
          {t('noTanksDescription')}
        </p>
        <a
          href="/tanks/new"
          className="inline-block px-6 py-3 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {t('createFirstTank')}
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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowTableView(!showTableView)}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {showTableView ? t('hideTable') : t('showTable')}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {showForm ? t('hideForm') : t('logParameters')}
          </button>
        </div>
      </div>

      {/* Tank Selector */}
      {tanks.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <label htmlFor="tank" className="block text-sm font-medium text-gray-700 mb-2">
            {t('selectTank')}
          </label>
          <select
            id="tank"
            value={selectedTank || ''}
            onChange={(e) => setSelectedTank(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name} {tank.total_volume_liters > 0 && `(${tank.total_volume_liters}L)`}
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
          {selectedTankData.total_volume_liters > 0 && (
            <p className="text-ocean-700">Volume: {selectedTankData.total_volume_liters}L</p>
          )}
        </div>
      )}

      {/* Parameter Form */}
      {showForm && selectedTank && (
        <ParameterForm
          tankId={selectedTank}
          onSubmit={handleSubmitParameters}
          onSuccess={handleFormSuccess}
          customRanges={customRanges || undefined}
        />
      )}

      {/* Data Table View (Debug) */}
      {showTableView && selectedTank && !isLoading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('rawDataTable')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('totalEntries')} {Object.values(parameters).flat().length}
                </p>
              </div>
              <div className="w-64">
                <input
                  type="text"
                  placeholder={t('filterByParameter')}
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.timestamp')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.parameter')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.value')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.unit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const allRows = Object.entries(parameters)
                    .flatMap(([paramType, readings]) =>
                      readings.map((reading) => ({
                        paramType,
                        reading,
                      }))
                    )
                    .filter(({ paramType }) => {
                      // Filter by search term
                      if (!tableFilter) return true
                      const range = activeRanges[paramType]
                      const paramName = range?.name || paramType
                      return paramName.toLowerCase().includes(tableFilter.toLowerCase()) ||
                             paramType.toLowerCase().includes(tableFilter.toLowerCase())
                    })
                    .sort((a, b) =>
                      new Date(b.reading.timestamp).getTime() -
                      new Date(a.reading.timestamp).getTime()
                    )

                  // Calculate pagination
                  const startIndex = (currentPage - 1) * itemsPerPage
                  const endIndex = startIndex + itemsPerPage
                  const paginatedRows = allRows.slice(startIndex, endIndex)

                  return (
                    <>
                      {paginatedRows.map(({ paramType, reading }) => {
                    const range = activeRanges[paramType]
                    const isEditing = editingReading?.paramType === paramType &&
                                     editingReading?.reading.timestamp === reading.timestamp
                    return (
                      <tr key={`${paramType}-${reading.timestamp}`}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="datetime-local"
                              value={editTimestamp}
                              onChange={(e) => setEditTimestamp(e.target.value)}
                              className="w-48 px-2 py-1 border border-ocean-300 rounded focus:outline-none focus:ring-2 focus:ring-ocean-500"
                            />
                          ) : (
                            new Date(reading.timestamp).toLocaleString()
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {range?.name || paramType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              step={paramType === 'salinity' || paramType === 'phosphate' ? '0.001' : '0.01'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 px-2 py-1 border border-ocean-300 rounded focus:outline-none focus:ring-2 focus:ring-ocean-500"
                              autoFocus
                            />
                          ) : (
                            (() => {
                              if (paramType === 'salinity' || paramType === 'phosphate') {
                                return reading.value.toFixed(3)
                              } else {
                                return reading.value.toFixed(2)
                              }
                            })()
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {range?.unit || ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                {tc('actions.save')}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                {tc('actions.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(paramType, reading)}
                                className="text-ocean-600 hover:text-ocean-900 mr-3"
                              >
                                {tc('actions.edit')}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteParameter(paramType, reading.timestamp)
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                {tc('actions.delete')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                        )
                      })}
                      {allRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            {t('noData')}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {(() => {
            const allRows = Object.entries(parameters)
              .flatMap(([paramType, readings]) =>
                readings.map((reading) => ({
                  paramType,
                  reading,
                }))
              )
              .filter(({ paramType }) => {
                if (!tableFilter) return true
                const range = PARAMETER_RANGES[paramType]
                const paramName = range?.name || paramType
                return paramName.toLowerCase().includes(tableFilter.toLowerCase()) ||
                       paramType.toLowerCase().includes(tableFilter.toLowerCase())
              })
            const totalPages = Math.ceil(allRows.length / itemsPerPage)

            if (totalPages <= 1) return null

            return (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {t('showing', { from: ((currentPage - 1) * itemsPerPage) + 1, to: Math.min(currentPage * itemsPerPage, allRows.length), total: allRows.length })}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    {`\u2190 ${tc('actions.previous')}`}
                  </button>
                  <span className="text-sm text-gray-700">
                    {t('page', { current: currentPage, total: totalPages })}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    {`${tc('actions.next')} \u2192`}
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">{t('timeRange')}</span>
          <div className="flex space-x-2">
            {[
              { value: '7d', label: t('ranges.7d') },
              { value: '30d', label: t('ranges.30d') },
              { value: '90d', label: t('ranges.90d') },
              { value: '365d', label: t('ranges.1y') },
              { value: 'all', label: t('ranges.all') },
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
          {activeParamOrder.map((paramType) => (
            <ParameterChart
              key={paramType}
              parameterType={paramType}
              data={parameters[paramType] || []}
              height={300}
              customRanges={customRanges || undefined}
            />
          ))}

          {/* Ratio Charts */}
          {RATIO_ORDER.map((ratioType) => {
            const ratioData = ratios[ratioType] || []
            if (ratioData.length > 0) {
              return (
                <ParameterChart
                  key={ratioType}
                  parameterType={ratioType}
                  data={ratioData}
                  height={300}
                  customRanges={customRanges || undefined}
                />
              )
            }
            return null
          })}
        </div>
      )}

      {/* No Data Message */}
      {!isLoading &&
        selectedTank &&
        activeParamOrder.every((p) => (parameters[p] || []).length === 0) && (
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
              {t('noParameterData')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('startTracking')}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
            >
              {t('logFirst')}
            </button>
          </div>
        )}
    </div>
  )
}
