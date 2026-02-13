/**
 * Water Change Calculator Page
 *
 * Predict how water changes affect tank parameters (Impact tab)
 * or calculate the water change needed to reach a target value (Target tab).
 * Purely frontend — no backend changes required.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { tanksApi, parametersApi, parameterRangesApi } from '../api'
import type { Tank, LatestParameters } from '../types'
import TankSelector from '../components/common/TankSelector'
import DosingCalculator from '../components/dosing/DosingCalculator'
import { useAuth } from '../hooks/useAuth'
import {
  buildParameterRangesMap,
  getActiveParameterOrder,
  roundValue,
  type ParameterRange,
} from '../config/parameterRanges'
import {
  SALT_MIX_PRESETS,
  FRESHWATER_PRESETS,
  calculateFullImpact,
  calculateTarget,
  getDefaultReplacementParams,
  saveReplacementProfile,
  loadReplacementProfile,
} from '../config/waterChangeConfig'

type Tab = 'impact' | 'target'

export default function WaterChangeCalculator() {
  const { t } = useTranslation('waterchange')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // Tank & data
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [latestParams, setLatestParams] = useState<LatestParameters | null>(null)
  const [paramRanges, setParamRanges] = useState<Record<string, ParameterRange>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Dosing Calculator modal
  const [showDosingCalc, setShowDosingCalc] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('impact')

  // Impact tab
  const [waterChangePercent, setWaterChangePercent] = useState(20)
  const [replacementParams, setReplacementParams] = useState<Record<string, number>>({})
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // Target tab
  const [targetParam, setTargetParam] = useState('')
  const [targetValue, setTargetValue] = useState('')

  const selectedTankObj = tanks.find(t => t.id === selectedTank)
  const totalVolume = selectedTankObj?.total_volume_liters || 0
  const waterType = selectedTankObj?.water_type || 'saltwater'
  const isSaltwater = waterType === 'saltwater' || waterType === 'brackish'

  // Active parameter list (filtered by tank's configured ranges, fallback to latestParams keys)
  const rangeParams = getActiveParameterOrder(paramRanges)
  const activeParams = rangeParams.length > 0
    ? rangeParams
    : latestParams ? Object.keys(latestParams) : []

  // Load tanks
  useEffect(() => {
    const load = async () => {
      try {
        const data = await tanksApi.list()
        const active = data.filter(t => !t.is_archived)
        setTanks(active)
      } catch { /* ignore */ }
    }
    load()
  }, [])

  // Load tank data when selection changes
  const loadTankData = useCallback(async () => {
    if (!selectedTank) return
    setIsLoading(true)
    try {
      const [latest, ranges] = await Promise.all([
        parametersApi.latest(selectedTank).catch(e => { console.warn('WC calc: latest params failed', e); return {} as LatestParameters }),
        parameterRangesApi.getForTank(selectedTank).catch(e => { console.warn('WC calc: ranges failed', e); return [] }),
      ])
      setLatestParams(latest)
      const rangeMap = buildParameterRangesMap(ranges)
      setParamRanges(rangeMap)

      // Initialize replacement params
      const saved = loadReplacementProfile()
      if (saved && saved.waterType === waterType) {
        setReplacementParams(saved.params)
        setSelectedPresetId(saved.presetId)
      } else {
        const defaults = getDefaultReplacementParams(waterType)
        setReplacementParams(defaults.params)
        setSelectedPresetId(defaults.presetId)
      }

      // Default target param to first with a reading
      const order = getActiveParameterOrder(rangeMap)
      const firstWithReading = order.find(p => latest[p] !== undefined)
      if (firstWithReading) setTargetParam(firstWithReading)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [selectedTank, waterType])

  useEffect(() => {
    loadTankData()
  }, [loadTankData])

  // Pre-fill target value from ideal when targetParam changes
  useEffect(() => {
    if (targetParam && paramRanges[targetParam]?.ideal !== undefined) {
      setTargetValue(String(paramRanges[targetParam].ideal))
    }
  }, [targetParam, paramRanges])

  // Preset selection handler
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId)
    if (isSaltwater) {
      const preset = SALT_MIX_PRESETS.find(p => p.id === presetId)
      if (preset) {
        setReplacementParams(prev => ({ ...prev, ...preset.parameters }))
      }
    } else {
      const preset = FRESHWATER_PRESETS.find(p => p.id === presetId)
      if (preset) {
        setReplacementParams(prev => ({ ...prev, ...preset.parameters }))
      }
    }
  }

  // Save profile
  const handleSaveProfile = () => {
    saveReplacementProfile(waterType, replacementParams, selectedPresetId)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  // Update a single replacement param
  const updateReplacementParam = (param: string, value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setReplacementParams(prev => ({ ...prev, [param]: num }))
      setSelectedPresetId('custom')
    }
  }

  // Compute impact results
  const idealParams: Record<string, number | undefined> = {}
  for (const p of activeParams) {
    idealParams[p] = paramRanges[p]?.ideal
  }
  // Auto-match temperature & pH — aquarists always match these before adding replacement water
  const adjustedReplacementParams = { ...replacementParams }
  if (latestParams?.temperature) adjustedReplacementParams.temperature = latestParams.temperature.value
  if (latestParams?.ph) adjustedReplacementParams.ph = latestParams.ph.value

  const impactResults = latestParams
    ? calculateFullImpact(latestParams, adjustedReplacementParams, idealParams, waterChangePercent, activeParams)
    : []

  // Compute target result
  const currentTargetValue = latestParams?.[targetParam]?.value
  const replacementTargetValue = replacementParams[targetParam] ?? currentTargetValue ?? 0
  const targetResult = currentTargetValue !== undefined && targetValue !== ''
    ? calculateTarget(currentTargetValue, parseFloat(targetValue), replacementTargetValue, totalVolume)
    : null

  const litersToChange = roundValue((waterChangePercent / 100) * totalVolume, 1)

  // Number formatting helper
  const formatParam = (param: string, value: number): string => {
    if (param === 'salinity') return roundValue(value, 3).toFixed(3)
    if (param === 'phosphate') return roundValue(value, 3).toFixed(3)
    if (param === 'ph') return roundValue(value, 2).toFixed(2)
    return roundValue(value, 1).toFixed(1)
  }

  if (tanks.length === 0 && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('noTanks')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {tc('navigation.calculators')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Tank selector */}
      <div className="mb-6">
        <TankSelector
          tanks={tanks}
          value={selectedTank}
          onChange={setSelectedTank}
          allLabel={t('title')}
          showAllOption={false}
          defaultTankId={user?.default_tank_id || undefined}
        />
      </div>

      {/* Volume banner */}
      {selectedTankObj && (
        <div className="flex gap-4 mb-6 text-sm">
          {selectedTankObj.display_volume_liters && (
            <div className="px-3 py-1.5 bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 rounded-md">
              <span className="font-medium">{t('volume.display')}:</span> {selectedTankObj.display_volume_liters} L
            </div>
          )}
          {selectedTankObj.sump_volume_liters && (
            <div className="px-3 py-1.5 bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 rounded-md">
              <span className="font-medium">{t('volume.sump')}:</span> {selectedTankObj.sump_volume_liters} L
            </div>
          )}
          <div className="px-3 py-1.5 bg-ocean-100 dark:bg-ocean-900/50 text-ocean-800 dark:text-ocean-200 rounded-md font-semibold">
            {t('volume.total')}: {totalVolume} L
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
        {(['impact', 'target'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-ocean-600 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
        <div className="ml-auto pb-3">
          <button
            onClick={() => setShowDosingCalc(true)}
            disabled={!selectedTankObj}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🧪</span>
            {t('tabs.dosing')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">{tc('common.loading')}</div>
      ) : activeTab === 'impact' ? (
        /* =================== IMPACT TAB =================== */
        <div className="space-y-6">
          {/* WC% slider */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('impact.waterChangePercent')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={waterChangePercent}
                onChange={e => setWaterChangePercent(Number(e.target.value))}
                className="flex-1 accent-ocean-600"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={waterChangePercent}
                  onChange={e => setWaterChangePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
              </div>
              <span className="text-sm font-medium text-ocean-600 dark:text-ocean-400 whitespace-nowrap">
                {t('impact.liters', { value: litersToChange })}
              </span>
            </div>
          </div>

          {/* Replacement water */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('impact.replacementWater')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveProfile}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {profileSaved ? t('impact.profileSaved') : t('impact.saveProfile')}
                </button>
              </div>
            </div>

            {/* Preset selector */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {isSaltwater ? t('impact.saltMix') : t('impact.replacementWater')}
              </label>
              <select
                value={selectedPresetId}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
              >
                {isSaltwater
                  ? SALT_MIX_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  : FRESHWATER_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                }
                <option value="custom">{t('impact.custom')}</option>
              </select>
            </div>

            {/* Editable parameter grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeParams.map(param => (
                <div key={param}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5 truncate">
                    {paramRanges[param]?.name || param}
                    {paramRanges[param]?.unit ? ` (${paramRanges[param].unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={replacementParams[param] ?? ''}
                    onChange={e => updateReplacementParam(param, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('impact.results')}
              </h3>
            </div>

            {impactResults.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('impact.noData')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 text-left">
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">{t('impact.parameter')}</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">{t('impact.current')}</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">{t('impact.afterWC')}</th>
                      <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">{t('impact.change')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactResults.map(r => (
                      <tr key={r.parameterType} className="border-t border-gray-100 dark:border-gray-700/50">
                        <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                          {paramRanges[r.parameterType]?.name || r.parameterType}
                          {paramRanges[r.parameterType]?.unit ? (
                            <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">
                              {paramRanges[r.parameterType].unit}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400 tabular-nums">
                          {formatParam(r.parameterType, r.currentValue)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums text-gray-800 dark:text-gray-200">
                          {formatParam(r.parameterType, r.projectedValue)}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                          r.direction === 'unchanged'
                            ? 'text-gray-400 dark:text-gray-500'
                            : r.towardIdeal
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}>
                          {r.direction === 'unchanged'
                            ? t('impact.unchanged')
                            : `${r.change > 0 ? '+' : ''}${formatParam(r.parameterType, r.change)} ${r.direction === 'up' ? '↑' : '↓'}`
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('info.title')}</h4>
            <p className="text-blue-700 dark:text-blue-400 mb-2">{t('info.description')}</p>
            <code className="text-xs text-blue-600 dark:text-blue-500 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">
              {t('info.formula')}
            </code>
          </div>
        </div>
      ) : (
        /* =================== TARGET TAB =================== */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Parameter selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('target.selectParameter')}
                </label>
                <select
                  value={targetParam}
                  onChange={e => setTargetParam(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                >
                  {activeParams.map(p => (
                    <option key={p} value={p}>
                      {paramRanges[p]?.name || p} {paramRanges[p]?.unit ? `(${paramRanges[p].unit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current value (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('target.currentValue')}
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                  {currentTargetValue !== undefined
                    ? `${formatParam(targetParam, currentTargetValue)} ${paramRanges[targetParam]?.unit || ''}`
                    : t('target.noReading')}
                </div>
              </div>

              {/* Target value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('target.targetValue')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                />
              </div>

              {/* Replacement value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('target.replacementValue')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={replacementParams[targetParam] ?? ''}
                  onChange={e => updateReplacementParam(targetParam, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Result card */}
          {currentTargetValue === undefined ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 text-sm">
              {t('target.noReading')}
            </div>
          ) : targetResult && !targetResult.isFeasible && targetResult.requiredPercentage < 0 ? (
            /* Current is already better than target or direction mismatch */
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">{t('target.result.notFeasible')}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">{t('target.result.notFeasibleDesc')}</p>
            </div>
          ) : targetResult && Math.abs(targetResult.requiredPercentage) < 0.5 ? (
            /* Already on target */
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-5">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">{t('target.result.noChangeNeeded')}</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('target.result.noChangeDesc')}</p>
            </div>
          ) : targetResult ? (
            <div className="space-y-4">
              {/* Main result */}
              <div className="bg-ocean-50 dark:bg-ocean-900/20 border border-ocean-200 dark:border-ocean-800 rounded-lg p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-ocean-700 dark:text-ocean-300">{t('target.result.required')}</span>
                  <span className="text-2xl font-bold text-ocean-800 dark:text-ocean-200">{targetResult.requiredPercentage}%</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ocean-600 dark:text-ocean-400">{t('target.result.volume')}</span>
                  <span className="text-lg font-semibold text-ocean-700 dark:text-ocean-300">
                    {targetResult.requiredLiters} L
                    <span className="text-xs font-normal text-ocean-500 dark:text-ocean-400 ml-1">
                      {t('target.result.ofTotal', { total: totalVolume })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Split recommendation */}
              {targetResult.requiredPercentage > 50 && targetResult.isFeasible && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">{t('target.split.title')}</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t('target.split.description', {
                      count: targetResult.recommendedChanges,
                      percent: targetResult.perChangePercentage,
                      liters: targetResult.perChangeLiters,
                    })}
                  </p>
                </div>
              )}

              {/* Not feasible (> 100%) */}
              {!targetResult.isFeasible && targetResult.requiredPercentage > 100 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm mb-1">{t('target.result.notFeasible')}</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {t('target.split.description', {
                      count: targetResult.recommendedChanges,
                      percent: targetResult.perChangePercentage,
                      liters: targetResult.perChangeLiters,
                    })}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('info.title')}</h4>
            <p className="text-blue-700 dark:text-blue-400">{t('info.description')}</p>
          </div>
        </div>
      )}

      {/* Dosing Calculator Modal */}
      {showDosingCalc && selectedTankObj && (
        <DosingCalculator
          tankId={selectedTankObj.id}
          tankVolumeLiters={totalVolume}
          waterType={waterType}
          isOpen={showDosingCalc}
          onClose={() => setShowDosingCalc(false)}
        />
      )}
    </div>
  )
}
