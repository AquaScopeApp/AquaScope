/**
 * Parameter Chart Component
 *
 * Displays a line chart for a specific parameter with normal range indicators
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { format } from 'date-fns'
import { PARAMETER_RANGES, getParameterStatus, getStatusColor } from '../../config/parameterRanges'
import type { ParameterRange } from '../../config/parameterRanges'
import type { ParameterReading } from '../../types'
import { useRegionalSettings } from '../../hooks/useRegionalSettings'

interface ParameterChartProps {
  parameterType: string
  data: ParameterReading[]
  height?: number
  customRanges?: Record<string, ParameterRange>
}

export default function ParameterChart({
  parameterType,
  data,
  height = 300,
  customRanges,
}: ParameterChartProps) {
  const ranges = customRanges || PARAMETER_RANGES
  const range = ranges[parameterType]
  const { tempLabel, celsiusToDisplay } = useRegionalSettings()

  const isTemp = parameterType === 'temperature'
  const toDisplay = (v: number) => isTemp ? celsiusToDisplay(v, 2) : v
  const displayUnit = isTemp ? tempLabel : range?.unit

  // Transform data for recharts
  const chartData = useMemo(() => {
    return data
      .map((reading) => ({
        timestamp: new Date(reading.timestamp).getTime(),
        value: toDisplay(reading.value),
        date: format(new Date(reading.timestamp), 'MMM dd, HH:mm'),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [data, isTemp])

  // Get current value and status (status check uses raw °C values)
  const latestReading = chartData[chartData.length - 1]
  const status = data.length > 0
    ? getParameterStatus(parameterType, data[data.length - 1].value, ranges)
    : 'optimal'

  if (!range) {
    return (
      <div className="text-center py-8 text-gray-500">
        Parameter configuration not found
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {range.name}
        </h3>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          No data available for this parameter
        </div>
      </div>
    )
  }

  // Calculate domain with some padding (using display-converted range values)
  const values = chartData.map((d) => d.value)
  const displayMin = toDisplay(range.min)
  const displayMax = toDisplay(range.max)

  // For ratio charts, use tighter bounds to keep them readable
  const isRatio = parameterType.includes('_ratio')
  let yDomain: [number, number]

  if (isRatio) {
    // For ratios, prioritize the defined range with minimal expansion
    const minValue = Math.min(...values, displayMin)
    const maxValue = Math.max(...values, displayMax)
    const rangeSpan = displayMax - displayMin
    const padding = rangeSpan * 0.15 // Smaller padding for ratios
    yDomain = [
      Math.max(0, minValue - padding), // Don't go below 0 for ratios
      maxValue + padding
    ]
  } else {
    // For regular parameters, use existing logic
    const minValue = Math.min(...values, displayMin)
    const maxValue = Math.max(...values, displayMax)
    const padding = (maxValue - minValue) * 0.1
    yDomain = [minValue - padding, maxValue + padding]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {range.name}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">{range.description}</p>
        </div>

        {latestReading && (
          <div className={`px-2 py-1 rounded-md border ${getStatusColor(status)}`}>
            <div className="text-xs font-medium">Current</div>
            <div className="text-xl font-bold">
              {(() => {
                if (parameterType === 'salinity' || parameterType === 'phosphate') {
                  return latestReading.value.toFixed(3)
                } else if (parameterType.includes('_ratio')) {
                  return latestReading.value.toFixed(2)
                } else {
                  return latestReading.value.toFixed(2)
                }
              })()}
              <span className="text-sm ml-1">{displayUnit}</span>
            </div>
          </div>
        )}
      </div>

      {/* Normal Range Info */}
      <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Normal Range:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 ml-2">
              {(() => {
                const decimals = parameterType === 'salinity' || parameterType === 'phosphate' ? 3 : 2
                return `${toDisplay(Number(range.min)).toFixed(decimals)} - ${toDisplay(Number(range.max)).toFixed(decimals)} ${displayUnit}`
              })()}
            </span>
          </div>
          {range.ideal && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ideal:</span>
              <span className="font-semibold text-green-600 ml-2">
                {(() => {
                  const decimals = parameterType === 'salinity' || parameterType === 'phosphate' ? 3 : 2
                  return `${toDisplay(Number(range.ideal)).toFixed(decimals)} ${displayUnit}`
                })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />

          {/* Normal range area */}
          <ReferenceArea
            y1={displayMin}
            y2={displayMax}
            fill="#10b981"
            fillOpacity={0.1}
            strokeOpacity={0}
          />

          {/* Min/Max reference lines */}
          <ReferenceLine
            y={displayMin}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Min', position: 'right', fill: '#f59e0b', fontSize: 10 }}
          />
          <ReferenceLine
            y={displayMax}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Max', position: 'right', fill: '#f59e0b', fontSize: 10 }}
          />

          {/* Ideal reference line */}
          {range.ideal && (
            <ReferenceLine
              y={toDisplay(range.ideal)}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{ value: 'Ideal', position: 'right', fill: '#10b981', fontSize: 10 }}
            />
          )}

          <XAxis
            dataKey="timestamp"
            domain={['dataMin', 'dataMax']}
            scale="time"
            type="number"
            tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
            tick={{ fontSize: 10, fill: 'var(--chart-text)' }}
            stroke="var(--chart-axis)"
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 10, fill: 'var(--chart-text)' }}
            stroke="var(--chart-axis)"
            label={{ value: displayUnit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'var(--chart-text)' } }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '0.375rem',
              color: 'var(--chart-text)',
            }}
            labelFormatter={(timestamp: number) => format(new Date(timestamp), 'MMM dd, yyyy HH:mm')}
            formatter={(value: number) => {
              let decimals = 2
              if (parameterType === 'salinity' || parameterType === 'phosphate') {
                decimals = 3
              } else if (parameterType.includes('_ratio')) {
                decimals = 2
              }
              return [
                `${value.toFixed(decimals)} ${displayUnit}`,
                range.name,
              ]
            }}
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="value"
            stroke={range.color}
            strokeWidth={2}
            dot={{ fill: range.color, r: 4 }}
            activeDot={{ r: 6 }}
            name={range.name}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Data points info */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        {chartData.length} reading{chartData.length !== 1 ? 's' : ''} from{' '}
        {chartData[0].date} to {chartData[chartData.length - 1].date}
      </div>
    </div>
  )
}
