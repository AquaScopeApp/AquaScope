/**
 * Monthly Bar Chart
 *
 * Stacked bar chart showing monthly spending per category with a cumulative line.
 * Supports year filtering and zoom via Recharts Brush.
 */

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { MonthlySpending } from '../../types'
import { formatPrice } from '../../utils/price'

interface Props {
  data: MonthlySpending[]
  currency?: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MonthlyBarChart({ data, currency = 'EUR' }: Props) {
  const { t } = useTranslation('finances')

  // Extract available years
  const years = useMemo(() => {
    const yrs = [...new Set(data.map(d => d.year))].sort()
    return yrs
  }, [data])

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')

  // Filter and format data
  const chartData = useMemo(() => {
    const filtered = selectedYear === 'all' ? data : data.filter(d => d.year === selectedYear)
    return filtered.map(d => ({
      ...d,
      monthLabel: `${MONTH_NAMES[d.month - 1]} ${selectedYear === 'all' ? d.year : ''}`.trim(),
    }))
  }, [data, selectedYear])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        {t('noData')}
      </div>
    )
  }

  return (
    <div>
      {/* Year filter tabs */}
      {years.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedYear === 'all' ? 'bg-ocean-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('allYears', { defaultValue: 'All' })}
          </button>
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedYear === year ? 'bg-ocean-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: 'var(--chart-text)' }}
            angle={-45}
            textAnchor="end"
            height={50}
            stroke="var(--chart-axis)"
          />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} stroke="var(--chart-axis)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} stroke="var(--chart-axis)" />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatPrice(value, currency),
              name,
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '0.375rem',
              color: 'var(--chart-text)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--chart-text)' }} />
          <Bar
            yAxisId="left"
            dataKey="equipment"
            name={t('categories.equipment')}
            stackId="a"
            fill="#3b82f6"
          />
          <Bar
            yAxisId="left"
            dataKey="consumables"
            name={t('categories.consumables')}
            stackId="a"
            fill="#10b981"
          />
          <Bar
            yAxisId="left"
            dataKey="livestock"
            name={t('categories.livestock')}
            stackId="a"
            fill="#f59e0b"
          />
          <Bar
            yAxisId="left"
            dataKey="icp_tests"
            name={t('categories.icp_tests')}
            stackId="a"
            fill="#8b5cf6"
          />
          <Bar
            yAxisId="left"
            dataKey="electricity"
            name={t('categories.electricity')}
            stackId="a"
            fill="#ef4444"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name={t('cumulative')}
            stroke="#6b7280"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
          />
          {/* Zoom brush */}
          {chartData.length > 6 && (
            <Brush
              dataKey="monthLabel"
              height={20}
              stroke="var(--chart-axis)"
              fill="var(--chart-brush-fill)"
              travellerWidth={8}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
