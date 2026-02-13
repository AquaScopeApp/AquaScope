/**
 * Disease Form Component
 *
 * Form for creating and editing disease records with common disease
 * suggestions filtered by tank water type and auto-fill of symptoms.
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Tank,
  Livestock,
  DiseaseRecord,
  DiseaseRecordCreate,
  DiseaseRecordUpdate,
  DiseaseSeverity,
  DiseaseStatus,
} from '../../types'
import TankSelector from '../common/TankSelector'
import { COMMON_DISEASES } from '../../data/commonDiseases'

interface DiseaseFormProps {
  tanks: Tank[]
  livestock: Livestock[]
  disease?: DiseaseRecord
  onSubmit: (data: DiseaseRecordCreate | DiseaseRecordUpdate) => void
  onCancel: () => void
}

export default function DiseaseForm({
  tanks,
  livestock,
  disease,
  onSubmit,
  onCancel,
}: DiseaseFormProps) {
  const { t } = useTranslation('diseases')
  const { t: tc } = useTranslation('common')

  const [tankId, setTankId] = useState('')
  const [livestockId, setLivestockId] = useState('')
  const [diseaseName, setDiseaseName] = useState('')
  const [severity, setSeverity] = useState<DiseaseSeverity>('moderate')
  const [status, setStatus] = useState<DiseaseStatus>('active')
  const [detectedDate, setDetectedDate] = useState('')
  const [resolvedDate, setResolvedDate] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (disease) {
      setTankId(disease.tank_id)
      setLivestockId(disease.livestock_id)
      setDiseaseName(disease.disease_name)
      setSeverity(disease.severity)
      setStatus(disease.status)
      setDetectedDate(disease.detected_date)
      setResolvedDate(disease.resolved_date || '')
      setSymptoms(disease.symptoms || '')
      setDiagnosis(disease.diagnosis || '')
      setOutcome(disease.outcome || '')
      setNotes(disease.notes || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setDetectedDate(today)
    }
  }, [disease])

  // Filter livestock by selected tank (only alive)
  const filteredLivestock = useMemo(() => {
    if (!tankId) return []
    return livestock.filter(
      l => l.tank_id === tankId && (l.status === 'alive' || !l.status)
    )
  }, [livestock, tankId])

  // Get selected tank's water type for disease suggestions
  const selectedTank = tanks.find(t => t.id === tankId)
  const waterType = selectedTank?.water_type || 'saltwater'

  // Filter common disease suggestions based on water type
  const suggestions = useMemo(() => {
    if (waterType === 'freshwater') {
      return COMMON_DISEASES.freshwater
    }
    // saltwater and brackish use saltwater diseases
    return COMMON_DISEASES.saltwater
  }, [waterType])

  const handleDiseaseSelect = (name: string) => {
    setDiseaseName(name)
    // Auto-fill symptoms from suggestion
    const allDiseases = [...COMMON_DISEASES.saltwater, ...COMMON_DISEASES.freshwater]
    const match = allDiseases.find(d => d.name === name)
    if (match && !symptoms) {
      setSymptoms(match.symptoms)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (disease) {
        const data: DiseaseRecordUpdate = {
          disease_name: diseaseName,
          symptoms: symptoms || undefined,
          diagnosis: diagnosis || undefined,
          severity,
          status,
          detected_date: detectedDate,
          resolved_date: status === 'resolved' ? resolvedDate || undefined : undefined,
          outcome: status === 'resolved' ? outcome || undefined : undefined,
          notes: notes || undefined,
        }
        await onSubmit(data)
      } else {
        const data: DiseaseRecordCreate = {
          tank_id: tankId,
          livestock_id: livestockId,
          disease_name: diseaseName,
          symptoms: symptoms || undefined,
          diagnosis: diagnosis || undefined,
          severity,
          status,
          detected_date: detectedDate,
          resolved_date: status === 'resolved' ? resolvedDate || undefined : undefined,
          outcome: status === 'resolved' ? outcome || undefined : undefined,
          notes: notes || undefined,
        }
        await onSubmit(data)
      }

      // Reset form if creating
      if (!disease) {
        setDiseaseName('')
        setSymptoms('')
        setDiagnosis('')
        setOutcome('')
        setNotes('')
        setSeverity('moderate')
        setStatus('active')
        setResolvedDate('')
        const today = new Date().toISOString().split('T')[0]
        setDetectedDate(today)
      }
    } catch (error) {
      console.error('Error submitting disease record:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = tankId && livestockId && diseaseName && detectedDate

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {disease ? t('editDisease') : t('addDisease')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tank Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {tc('tank', { defaultValue: 'Tank' })} <span className="text-red-500">*</span>
            </label>
            {disease ? (
              <select
                value={tankId}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-600"
              >
                {tanks.map(tank => (
                  <option key={tank.id} value={tank.id}>{tank.name}</option>
                ))}
              </select>
            ) : (
              <TankSelector
                tanks={tanks}
                value={tankId}
                onChange={setTankId}
                allLabel={tc('selectTank', { defaultValue: 'Select a tank' })}
                showAllOption={false}
              />
            )}
          </div>

          {/* Livestock Selection */}
          <div>
            <label
              htmlFor="livestock"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('fields.livestock')} <span className="text-red-500">*</span>
            </label>
            <select
              id="livestock"
              value={livestockId}
              onChange={(e) => setLivestockId(e.target.value)}
              required
              disabled={!!disease}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
            >
              <option value="">{t('allLivestock')}</option>
              {filteredLivestock.map(l => (
                <option key={l.id} value={l.id}>
                  {l.common_name || l.species_name} {l.quantity > 1 ? `(x${l.quantity})` : ''}
                </option>
              ))}
            </select>
            {tankId && filteredLivestock.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                {tc('noItems', { defaultValue: 'No alive livestock found in this tank' })}
              </p>
            )}
          </div>

          {/* Disease Name with datalist suggestions */}
          <div>
            <label
              htmlFor="diseaseName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('fields.diseaseName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="diseaseName"
              list="disease-suggestions"
              value={diseaseName}
              onChange={(e) => handleDiseaseSelect(e.target.value)}
              required
              placeholder={t('suggestions.title')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
            <datalist id="disease-suggestions">
              {suggestions.map(d => (
                <option key={d.name} value={d.name} />
              ))}
            </datalist>
          </div>

          {/* Severity & Status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('fields.severity')} <span className="text-red-500">*</span>
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DiseaseSeverity)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                <option value="mild">{t('severity.mild')}</option>
                <option value="moderate">{t('severity.moderate')}</option>
                <option value="severe">{t('severity.severe')}</option>
                <option value="critical">{t('severity.critical')}</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('fields.status')} <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DiseaseStatus)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              >
                <option value="active">{t('status.active')}</option>
                <option value="monitoring">{t('status.monitoring')}</option>
                <option value="chronic">{t('status.chronic')}</option>
                <option value="resolved">{t('status.resolved')}</option>
              </select>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detected Date */}
            <div>
              <label
                htmlFor="detectedDate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('fields.detectedDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="detectedDate"
                value={detectedDate}
                onChange={(e) => setDetectedDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>

            {/* Resolved Date (shown when status=resolved) */}
            {status === 'resolved' && (
              <div>
                <label
                  htmlFor="resolvedDate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('fields.resolvedDate')}
                </label>
                <input
                  type="date"
                  id="resolvedDate"
                  value={resolvedDate}
                  onChange={(e) => setResolvedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            )}
          </div>

          {/* Symptoms */}
          <div>
            <label
              htmlFor="symptoms"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('fields.symptoms')}
            </label>
            <textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
              placeholder={t('fields.symptoms')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label
              htmlFor="diagnosis"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('fields.diagnosis')}
            </label>
            <textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              placeholder={t('fields.diagnosis')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Outcome (shown when status=resolved) */}
          {status === 'resolved' && (
            <div>
              <label
                htmlFor="outcome"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('fields.outcome')}
              </label>
              <textarea
                id="outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                rows={2}
                placeholder={t('fields.outcome')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('fields.notes')}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('fields.notes')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tc('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? tc('actions.saving', { defaultValue: 'Saving...' })
                : disease
                  ? tc('actions.update', { defaultValue: 'Update' })
                  : tc('actions.create', { defaultValue: 'Create' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
