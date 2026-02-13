/**
 * Disease Card Component
 *
 * Compact card displaying a disease record with severity-colored border,
 * status badge, affected livestock info, and action buttons.
 */

import { useTranslation } from 'react-i18next'
import { DiseaseRecord, Livestock, Tank } from '../../types'
import { format } from 'date-fns'

interface DiseaseCardProps {
  disease: DiseaseRecord
  livestock: Livestock[]
  tanks: Tank[]
  onEdit: (disease: DiseaseRecord) => void
  onDelete: (id: string) => void
  onViewDetail: (disease: DiseaseRecord) => void
}

export default function DiseaseCard({
  disease,
  livestock,
  tanks: _tanks,
  onEdit,
  onDelete,
  onViewDetail,
}: DiseaseCardProps) {
  const { t } = useTranslation('diseases')
  const { t: tc } = useTranslation('common')

  const affectedLivestock = livestock.find(l => l.id === disease.livestock_id)

  const getSeverityBorderColor = () => {
    switch (disease.severity) {
      case 'mild': return 'border-l-green-500'
      case 'moderate': return 'border-l-yellow-500'
      case 'severe': return 'border-l-orange-500'
      case 'critical': return 'border-l-red-500'
      default: return 'border-l-gray-400'
    }
  }

  const getSeverityBadge = () => {
    const colors: Record<string, string> = {
      mild: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      moderate: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      severe: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
      critical: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${colors[disease.severity] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
        {t(`severity.${disease.severity}`)}
      </span>
    )
  }

  const getStatusBadge = () => {
    const colors: Record<string, string> = {
      active: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
      monitoring: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      chronic: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
      resolved: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${colors[disease.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
        {t(`status.${disease.status}`)}
      </span>
    )
  }

  const isResolved = disease.status === 'resolved'

  return (
    <div
      className={`rounded-lg shadow border-2 border-l-4 ${getSeverityBorderColor()} ${
        isResolved
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-75'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      } overflow-hidden`}
    >
      {/* Top row: icon + disease name + badges + actions */}
      <div className="flex items-start p-3 gap-2">
        {/* Disease icon */}
        <div className="w-10 h-10 flex-shrink-0 rounded-md flex items-center justify-center bg-white/50 dark:bg-gray-700/50 text-xl">
          {disease.severity === 'critical' ? '🚨' : disease.severity === 'severe' ? '⚠️' : '🩺'}
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
            {disease.disease_name}
          </h3>
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {getStatusBadge()}
            {getSeverityBadge()}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-0.5 flex-shrink-0">
          <button
            onClick={() => onViewDetail(disease)}
            className="p-1 text-ocean-600 hover:bg-ocean-100 dark:hover:bg-ocean-900/30 rounded"
            title={t('viewDetail')}
            aria-label={t('viewDetail')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(disease)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title={tc('actions.edit')}
            aria-label={tc('actions.edit')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(disease.id)}
            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            title={tc('actions.delete')}
            aria-label={tc('actions.delete')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info row */}
      <div className="px-3 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {/* Affected livestock */}
        {affectedLivestock && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">
              {affectedLivestock.type === 'fish' ? '🐠' : affectedLivestock.type === 'coral' ? '🪸' : '🦐'}
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {affectedLivestock.common_name || affectedLivestock.species_name}
            </span>
          </span>
        )}

        {/* Detected date */}
        <span className="inline-flex items-center gap-0.5">
          <span className="text-gray-400">📅</span>
          <span>{format(new Date(disease.detected_date), 'MMM d, yyyy')}</span>
        </span>

        {/* Resolved date */}
        {isResolved && disease.resolved_date && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">✅</span>
            <span>{format(new Date(disease.resolved_date), 'MMM d, yyyy')}</span>
          </span>
        )}
      </div>

      {/* Symptoms preview */}
      {disease.symptoms && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 italic">{disease.symptoms}</p>
        </div>
      )}
    </div>
  )
}
