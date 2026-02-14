/**
 * TankReportCard Component
 *
 * Visual report card showing an automatic health grade for a tank.
 * Displays overall grade circle, category breakdowns, achievements, and insights.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ReportCard, ScoreHistoryEntry } from '../../types'

interface TankReportCardProps {
  reportCard: ReportCard
  tankId?: string
  onDownloadPdf?: () => void
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', 'A': '#10b981', 'A-': '#10b981',
  'B+': '#0ea5e9', 'B': '#0ea5e9', 'B-': '#0ea5e9',
  'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#f59e0b',
  'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
  'F': '#ef4444',
}

const GRADE_BG_CLASSES: Record<string, string> = {
  'A+': 'bg-emerald-50 dark:bg-emerald-900/20', 'A': 'bg-emerald-50 dark:bg-emerald-900/20', 'A-': 'bg-emerald-50 dark:bg-emerald-900/20',
  'B+': 'bg-sky-50 dark:bg-sky-900/20', 'B': 'bg-sky-50 dark:bg-sky-900/20', 'B-': 'bg-sky-50 dark:bg-sky-900/20',
  'C+': 'bg-amber-50 dark:bg-amber-900/20', 'C': 'bg-amber-50 dark:bg-amber-900/20', 'C-': 'bg-amber-50 dark:bg-amber-900/20',
  'D+': 'bg-orange-50 dark:bg-orange-900/20', 'D': 'bg-orange-50 dark:bg-orange-900/20', 'D-': 'bg-orange-50 dark:bg-orange-900/20',
  'F': 'bg-red-50 dark:bg-red-900/20',
}

const GRADE_TEXT_CLASSES: Record<string, string> = {
  'A+': 'text-emerald-600 dark:text-emerald-400', 'A': 'text-emerald-600 dark:text-emerald-400', 'A-': 'text-emerald-600 dark:text-emerald-400',
  'B+': 'text-sky-600 dark:text-sky-400', 'B': 'text-sky-600 dark:text-sky-400', 'B-': 'text-sky-600 dark:text-sky-400',
  'C+': 'text-amber-600 dark:text-amber-400', 'C': 'text-amber-600 dark:text-amber-400', 'C-': 'text-amber-600 dark:text-amber-400',
  'D+': 'text-orange-600 dark:text-orange-400', 'D': 'text-orange-600 dark:text-orange-400', 'D-': 'text-orange-600 dark:text-orange-400',
  'F': 'text-red-600 dark:text-red-400',
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  good:      { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  fair:      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  poor:      { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  critical:  { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  parameter_stability: { label: 'Parameters', icon: '\uD83D\uDCCA' },
  maintenance:         { label: 'Maintenance', icon: '\uD83D\uDD27' },
  livestock_health:    { label: 'Livestock', icon: '\uD83D\uDC20' },
  equipment:           { label: 'Equipment', icon: '\u2699\uFE0F' },
  maturity:            { label: 'Maturity', icon: '\uD83C\uDF31' },
  water_chemistry:     { label: 'Chemistry', icon: '\uD83E\uDDEA' },
}

const INSIGHT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  alert:   { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
}

function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade] || '#9ca3af'
}

function InsightIcon({ type }: { type: string }) {
  switch (type) {
    case 'success':
      return (
        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'info':
      return (
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'warning':
      return (
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    case 'alert':
      return (
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return null
  }
}

const ENERGY_LABEL = [
  { grade: 'A', label: '90–100', color: '#10b981', width: 40 },
  { grade: 'B', label: '80–89',  color: '#0ea5e9', width: 52 },
  { grade: 'C', label: '70–79',  color: '#f59e0b', width: 64 },
  { grade: 'D', label: '60–69',  color: '#f97316', width: 76 },
  { grade: 'F', label: '0–59',   color: '#ef4444', width: 88 },
]

function getGradeLevel(grade: string): string {
  if (grade.startsWith('A')) return 'A'
  if (grade.startsWith('B')) return 'B'
  if (grade.startsWith('C')) return 'C'
  if (grade.startsWith('D')) return 'D'
  return 'F'
}

function scoreToColor(score: number): string {
  if (score >= 90) return '#10b981'  // emerald
  if (score >= 80) return '#0ea5e9'  // sky
  if (score >= 70) return '#f59e0b'  // amber
  if (score >= 60) return '#f97316'  // orange
  return '#ef4444'                    // red
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScoreColorDot(props: any) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  const color = scoreToColor(payload?.overall_score ?? 0)
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
}

const CATEGORY_COLORS: Record<string, string> = {
  parameter_stability: '#0ea5e9',
  maintenance: '#8b5cf6',
  livestock_health: '#10b981',
  equipment: '#6b7280',
  maturity: '#f59e0b',
  water_chemistry: '#ec4899',
}

export default function TankReportCard({ reportCard, tankId, onDownloadPdf }: TankReportCardProps) {
  const { t } = useTranslation('tanks')
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([])
  const [showCategories, setShowCategories] = useState(false)

  useEffect(() => {
    if (!tankId) return
    import('../../api').then(({ tanksApi }) => {
      tanksApi.getScoreHistory(tankId, 365).then(setScoreHistory).catch(() => {})
    })
  }, [tankId])

  const { overall_score, overall_grade, status, categories, achievements, insights } = reportCard
  const currentLevel = getGradeLevel(overall_grade)

  // SVG gauge configuration
  const size = 128
  const strokeWidth = 8
  const radius = 54
  const circumference = 2 * Math.PI * radius // ~339.29
  const progress = (overall_score / 100) * circumference
  const gradeColor = getGradeColor(overall_grade)

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.fair

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {t('reportCard.title', 'Report Card')}
        </h3>
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={t('reportCard.downloadPdf', 'Download PDF')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
        )}
      </div>

      {/* Overall Grade Circle */}
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="drop-shadow-sm">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-600"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gradeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700 ease-out"
          />
          {/* Grade letter */}
          <text
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-800 dark:fill-gray-100 font-bold"
            fontSize={32}
          >
            {overall_grade}
          </text>
          {/* Score number */}
          <text
            x={size / 2}
            y={size / 2 + 20}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-500 dark:fill-gray-400"
            fontSize={14}
          >
            {overall_score}/100
          </text>
        </svg>

        {/* Status Badge */}
        <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusStyle.bg} ${statusStyle.text}`}>
          {t(`reportCard.status.${status}`, status)}
        </span>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('reportCard.categoryDetails', 'Categories')}
        </h4>
        {Object.entries(categories).map(([key, cat]) => {
          const meta = CATEGORY_LABELS[key] || { label: key, icon: '' }
          const catColor = getGradeColor(cat.grade)
          const catGradeBg = GRADE_BG_CLASSES[cat.grade] || 'bg-gray-100 dark:bg-gray-700'
          const catGradeText = GRADE_TEXT_CLASSES[cat.grade] || 'text-gray-600 dark:text-gray-400'

          return (
            <div key={key} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <span>{meta.icon}</span>
                  <span className="font-medium">{t(`reportCard.category.${key}`, meta.label)}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">({cat.weight}%)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{cat.score}/100</span>
                  <span className={`inline-flex items-center justify-center w-8 text-center px-1.5 py-0.5 rounded text-xs font-bold ${catGradeBg} ${catGradeText}`}>
                    {cat.grade}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${cat.score}%`, backgroundColor: catColor }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Energy Label Grade Scale */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('reportCard.gradeScale', 'Grade Scale')}
        </h4>
        <div className="space-y-0.5">
          {ENERGY_LABEL.map(({ grade, label, color, width }) => {
            const isActive = currentLevel === grade
            return (
              <div key={grade} className="flex items-center gap-2">
                <div
                  className={`h-6 flex items-center text-white text-xs font-bold pl-2.5 transition-opacity ${isActive ? '' : 'opacity-40'}`}
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)',
                  }}
                >
                  {grade}
                </div>
                <span className={`text-[10px] tabular-nums ${isActive ? 'text-gray-600 dark:text-gray-300 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                  {label}
                </span>
                {isActive && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor"><path d="M8 6L2 2v8z" /></svg>
                    {overall_grade}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('reportCard.achievements', 'Achievements')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ach) => (
              <div
                key={ach.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-default"
                title={ach.detail}
              >
                <span>{ach.icon}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{ach.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('reportCard.insights', 'Insights')}
          </h4>
          <div className="space-y-2">
            {insights.map((insight, idx) => {
              const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${style.bg} ${style.border} transition-colors`}
                >
                  <InsightIcon type={insight.type} />
                  <span className={`text-sm ${style.text}`}>{insight.message}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Score Evolution Chart */}
      {scoreHistory.length >= 2 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('reportCard.scoreEvolution', 'Score Evolution')}
            </h4>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="text-xs text-ocean-500 dark:text-ocean-400 hover:underline"
            >
              {showCategories
                ? t('reportCard.hideCategories', 'Hide categories')
                : t('reportCard.showCategories', 'Show categories')}
            </button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="recorded_at"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                  stroke="#9ca3af"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                  formatter={(value: number, name: string) => {
                    const label = CATEGORY_LABELS[name]?.label || name
                    return [value, name === 'overall_score' ? t('reportCard.overall', 'Overall') : label]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="overall_score"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={<ScoreColorDot />}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  name="overall_score"
                />
                {showCategories && Object.keys(CATEGORY_COLORS).map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={`categories.${key}`}
                    stroke={CATEGORY_COLORS[key]}
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    dot={false}
                    name={key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              { color: '#10b981', label: '90+' },
              { color: '#0ea5e9', label: '80–89' },
              { color: '#f59e0b', label: '70–79' },
              { color: '#f97316', label: '60–69' },
              { color: '#ef4444', label: '<60' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
          {showCategories && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> {t('reportCard.overall', 'Overall')}
              </span>
              {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                <span key={key} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: color }} />
                  {CATEGORY_LABELS[key]?.label || key}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {scoreHistory.length === 1 && (
        <div className="text-center py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('reportCard.trackingStarted', 'Score tracking started — chart will appear after your next visit')}
          </p>
        </div>
      )}

    </div>
  )
}
