/**
 * Disease Detail Modal Component
 *
 * Full overlay modal showing disease record details with a treatment
 * timeline section. Supports adding and deleting treatments inline.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, differenceInDays } from 'date-fns'
import type {
  DiseaseRecordDetail,
  DiseaseRecordUpdate,
  Livestock,
  Tank,
  Consumable,
  DiseaseTreatmentCreate,
  DiseaseTreatment,
  TreatmentEffectiveness,
} from '../../types'
import TreatmentForm from './TreatmentForm'

interface DiseaseDetailProps {
  disease: DiseaseRecordDetail
  livestock: Livestock[]
  tanks: Tank[]
  consumables: Consumable[]
  onClose: () => void
  onAddTreatment: (data: DiseaseTreatmentCreate) => void
  onDeleteTreatment: (treatmentId: string) => void
  onUpdateDisease: (data: DiseaseRecordUpdate) => void
}

export default function DiseaseDetail({
  disease,
  livestock,
  tanks,
  consumables,
  onClose,
  onAddTreatment,
  onDeleteTreatment,
  onUpdateDisease: _onUpdateDisease,
}: DiseaseDetailProps) {
  const { t } = useTranslation('diseases')
  const { t: tc } = useTranslation('common')
  const [showTreatmentForm, setShowTreatmentForm] = useState(false)

  const affectedLivestock = livestock.find(l => l.id === disease.livestock_id)
  const tank = tanks.find(t => t.id === disease.tank_id)

  const getSeverityBadge = () => {
    const colors: Record<string, string> = {
      mild: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      moderate: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      severe: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
      critical: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[disease.severity] || 'bg-gray-100 text-gray-600'}`}>
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
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[disease.status] || 'bg-gray-100 text-gray-600'}`}>
        {t(`status.${disease.status}`)}
      </span>
    )
  }

  const getTreatmentTypeBadge = (treatmentType: string) => {
    const colors: Record<string, string> = {
      medication: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
      water_change: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
      quarantine: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300',
      dip: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300',
      temperature: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
      other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${colors[treatmentType] || 'bg-gray-100 text-gray-600'}`}>
        {t(`treatment.types.${treatmentType}`)}
      </span>
    )
  }

  const getEffectivenessBadge = (eff: TreatmentEffectiveness | null) => {
    if (!eff) return null
    const colors: Record<string, string> = {
      effective: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
      partially_effective: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
      ineffective: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
      too_early: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    }
    return (
      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${colors[eff] || 'bg-gray-100 text-gray-600'}`}>
        {t(`treatment.effectivenessOptions.${eff}`)}
      </span>
    )
  }

  const duration = disease.resolved_date
    ? differenceInDays(new Date(disease.resolved_date), new Date(disease.detected_date))
    : differenceInDays(new Date(), new Date(disease.detected_date))

  // Sort treatments by date descending
  const sortedTreatments = [...(disease.treatments || [])].sort(
    (a, b) => new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime()
  )

  const handleAddTreatment = async (data: DiseaseTreatmentCreate) => {
    await onAddTreatment(data)
    setShowTreatmentForm(false)
  }

  const handleDeleteTreatment = (treatmentItem: DiseaseTreatment) => {
    if (!confirm(t('treatment.confirmDelete'))) return
    onDeleteTreatment(treatmentItem.id)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {disease.disease_name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {getSeverityBadge()}
              {getStatusBadge()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={tc('actions.close', { defaultValue: 'Close' })}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Livestock */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('fields.livestock')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {affectedLivestock
                  ? (affectedLivestock.common_name || affectedLivestock.species_name)
                  : '--'}
              </p>
            </div>

            {/* Tank */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {tc('tank', { defaultValue: 'Tank' })}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {tank?.name || '--'}
              </p>
            </div>

            {/* Detected */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('detail.detectedOn')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {format(new Date(disease.detected_date), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Resolved / Duration */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {disease.resolved_date ? t('detail.resolvedOn') : t('detail.duration')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {disease.resolved_date
                  ? format(new Date(disease.resolved_date), 'MMM d, yyyy')
                  : `${duration} ${t('detail.days')} (${t('detail.ongoing')})`}
              </p>
            </div>
          </div>

          {/* Symptoms */}
          {disease.symptoms && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('fields.symptoms')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                {disease.symptoms}
              </p>
            </div>
          )}

          {/* Diagnosis */}
          {disease.diagnosis && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('fields.diagnosis')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                {disease.diagnosis}
              </p>
            </div>
          )}

          {/* Outcome (resolved only) */}
          {disease.status === 'resolved' && disease.outcome && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('fields.outcome')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/30 rounded-md p-3">
                {disease.outcome}
              </p>
            </div>
          )}

          {/* Notes */}
          {disease.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('fields.notes')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-md p-3">
                {disease.notes}
              </p>
            </div>
          )}

          {/* Treatment Timeline Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('detail.timeline')}
              </h3>
              <button
                onClick={() => setShowTreatmentForm(!showTreatmentForm)}
                className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 text-sm"
              >
                {showTreatmentForm ? tc('actions.cancel') : t('treatment.add')}
              </button>
            </div>

            {/* Add Treatment Form */}
            {showTreatmentForm && (
              <div className="mb-6">
                <TreatmentForm
                  consumables={consumables}
                  onSubmit={handleAddTreatment}
                  onCancel={() => setShowTreatmentForm(false)}
                />
              </div>
            )}

            {/* Treatment List */}
            {sortedTreatments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="text-sm">{t('treatment.noTreatments')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTreatments.map((treatmentItem) => (
                  <div
                    key={treatmentItem.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Date + Type + Name */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {format(new Date(treatmentItem.treatment_date), 'MMM d, yyyy')}
                          </span>
                          {getTreatmentTypeBadge(treatmentItem.treatment_type)}
                          {getEffectivenessBadge(treatmentItem.effectiveness)}
                        </div>
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {treatmentItem.treatment_name}
                        </h4>

                        {/* Dosage + Duration */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {treatmentItem.dosage && (
                            <span>💊 {treatmentItem.dosage}</span>
                          )}
                          {treatmentItem.quantity_used != null && (
                            <span>
                              📦 {treatmentItem.quantity_used}
                              {treatmentItem.quantity_unit ? ` ${treatmentItem.quantity_unit}` : ''}
                            </span>
                          )}
                          {treatmentItem.duration_days != null && (
                            <span>📅 {treatmentItem.duration_days} {t('detail.days')}</span>
                          )}
                        </div>

                        {/* Notes */}
                        {treatmentItem.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1 line-clamp-2">
                            {treatmentItem.notes}
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteTreatment(treatmentItem)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded flex-shrink-0"
                        title={tc('actions.delete')}
                        aria-label={tc('actions.delete')}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
