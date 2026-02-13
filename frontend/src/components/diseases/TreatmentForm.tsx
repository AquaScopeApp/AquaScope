/**
 * Treatment Form Component
 *
 * Form for adding/editing treatments linked to a disease record.
 * Supports medication consumable linking with dosage and quantity tracking.
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Consumable,
  DiseaseTreatment,
  DiseaseTreatmentCreate,
  TreatmentType,
  TreatmentEffectiveness,
} from '../../types'

interface TreatmentFormProps {
  consumables: Consumable[]
  treatment?: DiseaseTreatment
  onSubmit: (data: DiseaseTreatmentCreate) => void
  onCancel: () => void
}

const TREATMENT_TYPES: { value: TreatmentType; icon: string }[] = [
  { value: 'medication', icon: '💊' },
  { value: 'water_change', icon: '💧' },
  { value: 'quarantine', icon: '🏥' },
  { value: 'dip', icon: '🫧' },
  { value: 'temperature', icon: '🌡️' },
  { value: 'other', icon: '🔧' },
]

export default function TreatmentForm({
  consumables,
  treatment,
  onSubmit,
  onCancel,
}: TreatmentFormProps) {
  const { t } = useTranslation('diseases')
  const { t: tc } = useTranslation('common')

  const [treatmentType, setTreatmentType] = useState<TreatmentType>('medication')
  const [treatmentName, setTreatmentName] = useState('')
  const [consumableId, setConsumableId] = useState('')
  const [dosage, setDosage] = useState('')
  const [quantityUsed, setQuantityUsed] = useState<string>('')
  const [quantityUnit, setQuantityUnit] = useState('')
  const [treatmentDate, setTreatmentDate] = useState('')
  const [durationDays, setDurationDays] = useState<string>('')
  const [effectiveness, setEffectiveness] = useState<TreatmentEffectiveness | ''>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (treatment) {
      setTreatmentType(treatment.treatment_type)
      setTreatmentName(treatment.treatment_name)
      setConsumableId(treatment.consumable_id || '')
      setDosage(treatment.dosage || '')
      setQuantityUsed(treatment.quantity_used?.toString() || '')
      setQuantityUnit(treatment.quantity_unit || '')
      setTreatmentDate(treatment.treatment_date)
      setDurationDays(treatment.duration_days?.toString() || '')
      setEffectiveness(treatment.effectiveness || '')
      setNotes(treatment.notes || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setTreatmentDate(today)
    }
  }, [treatment])

  // Filter consumables to medication category
  const medicationConsumables = useMemo(() => {
    return consumables.filter(c => c.consumable_type === 'medication')
  }, [consumables])

  // When a consumable is selected, auto-fill name and unit
  const handleConsumableChange = (id: string) => {
    setConsumableId(id)
    if (id) {
      const consumable = consumables.find(c => c.id === id)
      if (consumable) {
        if (!treatmentName) setTreatmentName(consumable.name)
        if (consumable.quantity_unit) setQuantityUnit(consumable.quantity_unit)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: DiseaseTreatmentCreate = {
        treatment_type: treatmentType,
        treatment_name: treatmentName,
        consumable_id: consumableId || undefined,
        dosage: dosage || undefined,
        quantity_used: quantityUsed ? parseFloat(quantityUsed) : undefined,
        quantity_unit: quantityUnit || undefined,
        treatment_date: treatmentDate,
        duration_days: durationDays ? parseInt(durationDays) : undefined,
        effectiveness: effectiveness || undefined,
        notes: notes || undefined,
      }

      await onSubmit(data)

      // Reset form if creating
      if (!treatment) {
        setTreatmentName('')
        setConsumableId('')
        setDosage('')
        setQuantityUsed('')
        setQuantityUnit('')
        setDurationDays('')
        setEffectiveness('')
        setNotes('')
        const today = new Date().toISOString().split('T')[0]
        setTreatmentDate(today)
      }
    } catch (error) {
      console.error('Error submitting treatment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {treatment ? t('treatment.edit') : t('treatment.add')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Treatment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('treatment.type')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {TREATMENT_TYPES.map(tt => (
              <button
                key={tt.value}
                type="button"
                onClick={() => setTreatmentType(tt.value)}
                className={`p-2 border-2 rounded-md text-center transition-colors ${
                  treatmentType === tt.value
                    ? 'border-ocean-500 bg-ocean-50 dark:bg-ocean-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-lg">{tt.icon}</div>
                <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                  {t(`treatment.types.${tt.value}`)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Treatment Name */}
        <div>
          <label
            htmlFor="treatmentName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('treatment.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="treatmentName"
            value={treatmentName}
            onChange={(e) => setTreatmentName(e.target.value)}
            required
            placeholder={t('treatment.name')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
        </div>

        {/* Consumable (shown only when type=medication) */}
        {treatmentType === 'medication' && (
          <div>
            <label
              htmlFor="consumable"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('treatment.consumable')}
            </label>
            <select
              id="consumable"
              value={consumableId}
              onChange={(e) => handleConsumableChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('treatment.consumableNone')}</option>
              {medicationConsumables.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.brand ? `(${c.brand})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dosage + Quantity row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="dosage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('treatment.dosage')}
            </label>
            <input
              type="text"
              id="dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 1ml per 10L"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Quantity used (shown when consumable selected) */}
          {consumableId && (
            <>
              <div>
                <label
                  htmlFor="quantityUsed"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Quantity Used
                </label>
                <input
                  type="number"
                  id="quantityUsed"
                  value={quantityUsed}
                  onChange={(e) => setQuantityUsed(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
              <div>
                <label
                  htmlFor="quantityUnit"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Unit
                </label>
                <input
                  type="text"
                  id="quantityUnit"
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  placeholder="ml, g, drops"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Date + Duration row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="treatmentDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('treatment.date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="treatmentDate"
              value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          <div>
            <label
              htmlFor="durationDays"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('treatment.duration')}
            </label>
            <input
              type="number"
              id="durationDays"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>
        </div>

        {/* Effectiveness */}
        <div>
          <label
            htmlFor="effectiveness"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('treatment.effectiveness')}
          </label>
          <select
            id="effectiveness"
            value={effectiveness}
            onChange={(e) => setEffectiveness(e.target.value as TreatmentEffectiveness | '')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          >
            <option value="">--</option>
            <option value="effective">{t('treatment.effectivenessOptions.effective')}</option>
            <option value="partially_effective">{t('treatment.effectivenessOptions.partially_effective')}</option>
            <option value="ineffective">{t('treatment.effectivenessOptions.ineffective')}</option>
            <option value="too_early">{t('treatment.effectivenessOptions.too_early')}</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="treatmentNotes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('fields.notes')}
          </label>
          <textarea
            id="treatmentNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t('fields.notes')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {tc('actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !treatmentName || !treatmentDate}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting
              ? tc('actions.saving', { defaultValue: 'Saving...' })
              : treatment
                ? tc('actions.update', { defaultValue: 'Update' })
                : t('treatment.add')}
          </button>
        </div>
      </form>
    </div>
  )
}
