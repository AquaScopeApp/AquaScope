/**
 * Spending Pie Chart
 *
 * Donut chart showing spending breakdown by category with amount labels.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { CategorySpending } from '../../types'
import { formatPrice } from '../../utils/price'

const COLORS: Record<string, string> = {
  equipment: '#3b82f6',    // blue
  consumables: '#10b981',  // green
  livestock: '#f59e0b',    // amber
  icp_tests: '#8b5cf6',   // purple
}

interface Props {
  data: CategorySpending[]
  currency?: string
}

const RADIAN = Math.PI / 180

const renderCustomLabel = (
  { cx, cy, midAngle, outerRadius, value, name }: any,
  currency: string,
) => {
  const radius = outerRadius + 24
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {`${name}: ${formatPrice(value, currency)}`}
    </text>
  )
}

export default function SpendingPieChart({ data, currency = 'EUR' }: Props) {
  const { t } = useTranslation('finances')

  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({
      name: t(`categories.${d.category}`, d.category),
      value: d.total,
      color: COLORS[d.category] || '#94a3b8',
    }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {t('noData')}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={(props) => renderCustomLabel(props, currency)}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatPrice(value, currency)}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
