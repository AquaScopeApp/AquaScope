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

  // Transform data for recharts
  const chartData = useMemo(() => {
    return data
      .map((reading) => ({
        timestamp: new Date(reading.timestamp).getTime(),
        value: reading.value,
        date: format(new Date(reading.timestamp), 'MMM dd, HH:mm'),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [data])

  // Get current value and status
  const latestReading = chartData[chartData.length - 1]
  const status = latestReading
    ? getParameterStatus(parameterType, latestReading.value, ranges)
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {range.name}
        </h3>
        <div className="text-center py-8 text-gray-500">
          No data available for this parameter
        </div>
      </div>
    )
  }

  // Calculate domain with some padding
  const values = chartData.map((d) => d.value)

  // For ratio charts, use tighter bounds to keep them readable
  const isRatio = parameterType.includes('_ratio')
  let yDomain: [number, number]

  if (isRatio) {
    // For ratios, prioritize the defined range with minimal expansion
    const minValue = Math.min(...values, range.min)
    const maxValue = Math.max(...values, range.max)
    const rangeSpan = range.max - range.min
    const padding = rangeSpan * 0.15 // Smaller padding for ratios
    yDomain = [
      Math.max(0, minValue - padding), // Don't go below 0 for ratios
      maxValue + padding
    ]
  } else {
    // For regular parameters, use existing logic
    const minValue = Math.min(...values, range.min)
    const maxValue = Math.max(...values, range.max)
    const padding = (maxValue - minValue) * 0.1
    yDomain = [minValue - padding, maxValue + padding]
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {range.name}
          </h3>
          <p className="text-sm text-gray-600">{range.description}</p>
        </div>

        {latestReading && (
          <div className={`px-3 py-2 rounded-md border ${getStatusColor(status)}`}>
            <div className="text-xs font-medium">Current</div>
            <div className="text-2xl font-bold">
              {(() => {
                if (parameterType === 'salinity' || parameterType === 'phosphate') {
                  return latestReading.value.toFixed(3)
                } else if (parameterType.includes('_ratio')) {
                  return latestReading.value.toFixed(2)
                } else {
                  return latestReading.value.toFixed(2)
                }
              })()}
              <span className="text-sm ml-1">{range.unit}</span>
            </div>
          </div>
        )}
      </div>

      {/* Normal Range Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-600">Normal Range:</span>
            <span className="font-semibold text-gray-900 ml-2">
              {(() => {
                const decimals = parameterType === 'salinity' || parameterType === 'phosphate' ? 3 : 2
                return `${Number(range.min).toFixed(decimals)} - ${Number(range.max).toFixed(decimals)} ${range.unit}`
              })()}
            </span>
          </div>
          {range.ideal && (
            <div>
              <span className="text-gray-600">Ideal:</span>
              <span className="font-semibold text-green-600 ml-2">
                {(() => {
                  const decimals = parameterType === 'salinity' || parameterType === 'phosphate' ? 3 : 2
                  return `${Number(range.ideal).toFixed(decimals)} ${range.unit}`
                })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {/* Normal range area */}
          <ReferenceArea
            y1={range.min}
            y2={range.max}
            fill="#10b981"
            fillOpacity={0.1}
            strokeOpacity={0}
          />

          {/* Min/Max reference lines */}
          <ReferenceLine
            y={range.min}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Min', position: 'right', fill: '#f59e0b', fontSize: 12 }}
          />
          <ReferenceLine
            y={range.max}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: 'Max', position: 'right', fill: '#f59e0b', fontSize: 12 }}
          />

          {/* Ideal reference line */}
          {range.ideal && (
            <ReferenceLine
              y={range.ideal}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{ value: 'Ideal', position: 'right', fill: '#10b981', fontSize: 12 }}
            />
          )}

          <XAxis
            dataKey="timestamp"
            domain={['dataMin', 'dataMax']}
            scale="time"
            type="number"
            tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{ value: range.unit, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
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
                `${value.toFixed(decimals)} ${range.unit}`,
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
      <div className="mt-4 text-xs text-gray-500 text-center">
        {chartData.length} reading{chartData.length !== 1 ? 's' : ''} from{' '}
        {chartData[0].date} to {chartData[chartData.length - 1].date}
      </div>
    </div>
  )
}
