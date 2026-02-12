/**
 * Sparkline Component
 *
 * Renders mini sparkline charts for the last 7 days of key water parameters
 * on the Dashboard tank cards. Parameter selection is based on water type.
 */

import { useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { parametersApi } from '../../api'
import type { ParameterReading } from '../../types'

interface SparklineProps {
  tankId: string
  waterType: string | null
}

/** Parameter configs keyed by water type */
const PARAM_CONFIGS: Record<string, { key: string; label: string; unit: string; color: string; fillColor: string }[]> = {
  saltwater: [
    { key: 'temperature', label: 'Temp', unit: '\u00B0C', color: '#ef4444', fillColor: 'rgba(239,68,68,0.15)' },
    { key: 'alkalinity_kh', label: 'Alk', unit: 'dKH', color: '#06b6d4', fillColor: 'rgba(6,182,212,0.15)' },
    { key: 'calcium', label: 'Ca', unit: 'ppm', color: '#8b5cf6', fillColor: 'rgba(139,92,246,0.15)' },
  ],
  freshwater: [
    { key: 'temperature', label: 'Temp', unit: '\u00B0C', color: '#ef4444', fillColor: 'rgba(239,68,68,0.15)' },
    { key: 'ph', label: 'pH', unit: '', color: '#10b981', fillColor: 'rgba(16,185,129,0.15)' },
    { key: 'gh', label: 'GH', unit: '\u00B0dH', color: '#f59e0b', fillColor: 'rgba(245,158,11,0.15)' },
  ],
  brackish: [
    { key: 'temperature', label: 'Temp', unit: '\u00B0C', color: '#ef4444', fillColor: 'rgba(239,68,68,0.15)' },
    { key: 'ph', label: 'pH', unit: '', color: '#10b981', fillColor: 'rgba(16,185,129,0.15)' },
    { key: 'salinity', label: 'Sal', unit: 'ppt', color: '#0ea5e9', fillColor: 'rgba(14,165,233,0.15)' },
  ],
}

/** Fallback / default config used for unknown water types */
const DEFAULT_PARAMS = PARAM_CONFIGS.brackish

interface ParamData {
  key: string
  label: string
  unit: string
  color: string
  fillColor: string
  readings: { value: number }[]
  latestValue: number | null
}

export default function Sparkline({ tankId, waterType }: SparklineProps) {
  const [paramData, setParamData] = useState<ParamData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const configs = PARAM_CONFIGS[waterType || ''] || DEFAULT_PARAMS

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const results = await Promise.all(
          configs.map(async (cfg) => {
            try {
              const readings: ParameterReading[] = await parametersApi.query({
                tank_id: tankId,
                parameter_type: cfg.key,
                start: '-7d',
              })

              // Sort chronologically (oldest first) for the chart
              const sorted = [...readings].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              )

              const chartData = sorted.map((r) => ({ value: r.value }))
              const latestValue = sorted.length > 0 ? sorted[sorted.length - 1].value : null

              return {
                ...cfg,
                readings: chartData,
                latestValue,
              }
            } catch {
              return { ...cfg, readings: [], latestValue: null }
            }
          })
        )

        if (!cancelled) {
          setParamData(results)
        }
      } catch {
        // Silently fail - sparklines are non-critical
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [tankId, waterType])

  // Don't render anything while loading or if there is no data at all
  if (isLoading) return null

  const hasAnyData = paramData.some((p) => p.readings.length > 0)
  if (!hasAnyData) return null

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <div className="grid grid-cols-3 gap-3">
        {paramData.map((param) => {
          if (param.readings.length === 0) {
            return <div key={param.key} />
          }

          const formatted =
            param.latestValue !== null
              ? param.key === 'salinity' || param.key === 'phosphate'
                ? param.latestValue.toFixed(3)
                : param.latestValue % 1 === 0
                  ? param.latestValue.toString()
                  : param.latestValue.toFixed(1)
              : '--'

          return (
            <div key={param.key} className="min-w-0">
              {/* Label + latest value */}
              <div className="flex items-baseline justify-between mb-0.5 px-0.5">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
                  {param.label}
                </span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1 whitespace-nowrap">
                  {formatted}
                  {param.unit && (
                    <span className="text-[9px] font-normal text-gray-400 dark:text-gray-500 ml-0.5">
                      {param.unit}
                    </span>
                  )}
                </span>
              </div>

              {/* Mini sparkline chart */}
              <div className="h-[30px] w-full">
                <ResponsiveContainer width="100%" height={30}>
                  <AreaChart data={param.readings} margin={{ top: 2, right: 1, bottom: 0, left: 1 }}>
                    <defs>
                      <linearGradient id={`sparkGrad-${param.key}-${tankId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={param.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={param.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const val = payload[0].value as number
                        return (
                          <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                            {typeof val === 'number' ? val.toFixed(2) : val} {param.unit}
                          </div>
                        )
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={param.color}
                      strokeWidth={1.5}
                      fill={`url(#sparkGrad-${param.key}-${tankId})`}
                      dot={false}
                      activeDot={{ r: 2, fill: param.color, stroke: '#fff', strokeWidth: 1 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
