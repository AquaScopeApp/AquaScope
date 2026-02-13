/**
 * Dosing Calculator Modal
 *
 * Calculates how much of a chemical compound to add to correct
 * a water parameter from its current value to the target.
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegionalSettings } from '../../hooks/useRegionalSettings'
import { parametersApi, parameterRangesApi } from '../../api'
import { buildParameterRangesMap } from '../../config/parameterRanges'
import type { ParameterRange } from '../../config/parameterRanges'
import type { LatestParameters } from '../../types'
import {
  DOSING_COMPOUNDS,
  getDosableParameterTypes,
  getCompoundsForParameter,
  calculateDose,
  getSafetyInfo,
} from '../../config/dosingCompounds'

interface DosingCalculatorProps {
  tankId: string
  tankVolumeLiters: number
  waterType: string
  isOpen: boolean
  onClose: () => void
}

/** Parameter display names when translation key isn't available */
const PARAM_LABELS: Record<string, string> = {
  alkalinity_kh: 'Alkalinity (KH)',
  calcium: 'Calcium',
  magnesium: 'Magnesium',
  gh: 'General Hardness (GH)',
}

export default function DosingCalculator({
  tankId,
  tankVolumeLiters,
  waterType,
  isOpen,
  onClose,
}: DosingCalculatorProps) {
  const { t } = useTranslation('dosing')
  const { formatVolume } = useRegionalSettings()

  const [latestParams, setLatestParams] = useState<LatestParameters | null>(null)
  const [paramRanges, setParamRanges] = useState<Record<string, ParameterRange> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedParam, setSelectedParam] = useState<string | null>(null)
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | null>(null)
  const [currentValue, setCurrentValue] = useState<string>('')
  const [targetValue, setTargetValue] = useState<string>('')

  // Dosable parameter types for this water type
  const dosableTypes = useMemo(
    () => getDosableParameterTypes(waterType),
    [waterType],
  )

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    Promise.all([
      parametersApi.latest(tankId).catch(() => ({} as LatestParameters)),
      parameterRangesApi.getForTank(tankId).catch(() => []),
    ]).then(([latest, ranges]) => {
      setLatestParams(latest)
      setParamRanges(buildParameterRangesMap(ranges))
      setIsLoading(false)
    })
  }, [isOpen, tankId])

  // Reset compound selection when parameter changes
  useEffect(() => {
    if (!selectedParam) return
    const compounds = getCompoundsForParameter(selectedParam, waterType)
    setSelectedCompoundId(compounds.length > 0 ? compounds[0].id : null)

    // Pre-fill values
    const current = latestParams?.[selectedParam]
    setCurrentValue(current ? String(current.value) : '')
    const range = paramRanges?.[selectedParam]
    setTargetValue(range?.ideal != null ? String(range.ideal) : '')
  }, [selectedParam, latestParams, paramRanges, waterType])

  if (!isOpen) return null

  const selectedCompound = selectedCompoundId
    ? DOSING_COMPOUNDS.find(c => c.id === selectedCompoundId) ?? null
    : null

  const currentNum = parseFloat(currentValue)
  const targetNum = parseFloat(targetValue)
  const hasValidInputs = !isNaN(currentNum) && !isNaN(targetNum) && tankVolumeLiters > 0

  const dose = hasValidInputs && selectedCompound
    ? calculateDose(selectedCompound, currentNum, targetNum, tankVolumeLiters)
    : 0

  const safety = hasValidInputs && selectedCompound
    ? getSafetyInfo(selectedCompound, currentNum, targetNum)
    : { isSafe: true, recommendedDoses: 1 }

  const dosePerApplication = safety.recommendedDoses > 1
    ? Math.round((dose / safety.recommendedDoses) * 10) / 10
    : dose

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('tankVolume')}: <span className="font-semibold text-ocean-600">{formatVolume(tankVolumeLiters)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-ocean-200 border-t-ocean-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1: Parameter Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  {t('selectParameter')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dosableTypes.map(paramType => {
                    const reading = latestParams?.[paramType]
                    const range = paramRanges?.[paramType]
                    const current = reading?.value
                    const target = range?.ideal
                    const needsCorrection = current != null && target != null && current < target
                    const isSelected = selectedParam === paramType
                    const label = PARAM_LABELS[paramType] || paramType
                    const unit = range?.unit || ''

                    return (
                      <button
                        key={paramType}
                        onClick={() => setSelectedParam(paramType)}
                        className={`rounded-lg p-3 text-left border-2 transition-all ${
                          isSelected
                            ? 'border-ocean-500 bg-ocean-50 dark:bg-ocean-900/30'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</div>
                        {current != null ? (
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {current} <span className="text-xs font-normal text-gray-400">{unit}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">{t('noData')}</div>
                        )}
                        {target != null && current != null ? (
                          <div className={`text-xs mt-1 font-medium ${
                            needsCorrection
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {needsCorrection ? `→ ${target} ${unit}` : t('onTarget')}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: Compound Selection */}
              {selectedParam && (() => {
                const compounds = getCompoundsForParameter(selectedParam, waterType)
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                      {t('selectCompound')}
                    </h3>
                    <div className="space-y-2">
                      {compounds.map(compound => (
                        <label
                          key={compound.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedCompoundId === compound.id
                              ? 'border-ocean-500 bg-ocean-50 dark:bg-ocean-900/30'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="compound"
                            checked={selectedCompoundId === compound.id}
                            onChange={() => setSelectedCompoundId(compound.id)}
                            className="mt-1 text-ocean-600 focus:ring-ocean-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{compound.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{compound.formula}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {t(compound.descriptionKey)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              +{compound.raisesPerGramPer100L} {compound.unit} per {compound.dosingUnit} per 100L
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Step 3: Value Inputs */}
              {selectedParam && selectedCompound && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('currentValue')} ({selectedCompound.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={currentValue}
                      onChange={e => setCurrentValue(e.target.value)}
                      placeholder={t('noReading')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('targetValue')} ({selectedCompound.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      placeholder={t('noTarget')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>
                </div>
              )}

              {/* Result */}
              {selectedParam && selectedCompound && hasValidInputs && (
                dose > 0 ? (
                  <div className="bg-ocean-50 dark:bg-ocean-900/30 border border-ocean-200 dark:border-ocean-800 rounded-lg p-5">
                    <div className="text-center">
                      <div className="text-sm text-ocean-600 dark:text-ocean-400 font-medium mb-1">{t('result.add')}</div>
                      <div className="text-4xl font-bold text-ocean-700 dark:text-ocean-300">
                        {dose} {selectedCompound.dosingUnit}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {t('result.of')} <span className="font-medium">{selectedCompound.name}</span> ({selectedCompound.formula})
                        {' '}{t('result.toRaise')} {PARAM_LABELS[selectedParam] || selectedParam}
                        {' '}{t('result.from')} <span className="font-semibold">{currentNum}</span>
                        {' '}{t('result.to')} <span className="font-semibold">{targetNum} {selectedCompound.unit}</span>
                        {' '}{t('result.inYour')} <span className="font-semibold">{formatVolume(tankVolumeLiters)}</span> {t('result.system')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-center">
                    <p className="text-emerald-700 dark:text-emerald-300 text-sm">{t('result.noCorrection')}</p>
                  </div>
                )
              )}

              {/* Safety Warning */}
              {dose > 0 && !safety.isSafe && selectedCompound && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('safety.warning')}</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        {t('safety.splitDoses', { count: safety.recommendedDoses })}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                        {t('safety.maxSingle', { value: selectedCompound.maxSingleCorrection, unit: selectedCompound.unit })}
                        {' — '}{dosePerApplication} {selectedCompound.dosingUnit} {t('result.by')} {t('result.add').toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">{t('info.title')}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{t('info.description')}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-2 font-medium italic">{t('info.balancing')}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
          >
            {t('common:close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  )
}
