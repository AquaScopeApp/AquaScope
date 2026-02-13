/**
 * Water Change Calculator Page
 *
 * Predict how water changes affect tank parameters (Impact tab)
 * or calculate the water change needed to reach a target value (Target tab).
 * Purely frontend — no backend changes required.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { tanksApi, parametersApi, parameterRangesApi } from '../api'
import type { Tank, LatestParameters } from '../types'
import TankSelector from '../components/common/TankSelector'
import DosingCalculator from '../components/dosing/DosingCalculator'
import { useAuth } from '../hooks/useAuth'
import { useRegionalSettings } from '../hooks/useRegionalSettings'
import {
  buildParameterRangesMap,
  getActiveParameterOrder,
  getParameterStatus,
  getStatusColor,
  getStatusTextColor,
  roundValue,
  PARAMETER_RANGES,
  type ParameterRange,
} from '../config/parameterRanges'
import {
  SALT_MIX_PRESETS,
  FRESHWATER_PRESETS,
  calculateFullImpact,
  calculateTarget,
  buildCorrectionPlan,
  getDefaultReplacementParams,
  saveReplacementProfile,
  loadReplacementProfile,
  type CorrectionPlanConfig,
} from '../config/waterChangeConfig'

type Tab = 'impact' | 'target' | 'correction'

export default function WaterChangeCalculator() {
  const { t } = useTranslation('waterchange')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { formatVolume, litersToDisplay } = useRegionalSettings()

  // Tank & data
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [latestParams, setLatestParams] = useState<LatestParameters | null>(null)
  const [paramRanges, setParamRanges] = useState<Record<string, ParameterRange>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Dosing Calculator modal
  const [showDosingCalc, setShowDosingCalc] = useState(false)

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('correction')

  // Shared: replacement water
  const [replacementParams, setReplacementParams] = useState<Record<string, number>>({})
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [showReplacementWater, setShowReplacementWater] = useState(false)

  // Impact tab
  const [waterChangePercent, setWaterChangePercent] = useState(20)

  // Target tab
  const [targetParam, setTargetParam] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [currentValue, setCurrentValue] = useState('')

  // Correction tab
  const [correctionConfig, setCorrectionConfig] = useState<Partial<CorrectionPlanConfig>>({})
  const [showCorrectionConfig, setShowCorrectionConfig] = useState(false)

  const selectedTankObj = tanks.find(t => t.id === selectedTank)
  const totalVolume = selectedTankObj?.total_volume_liters || 0
  const waterType = selectedTankObj?.water_type || 'saltwater'
  const isSaltwater = waterType === 'saltwater' || waterType === 'brackish'

  // Active parameter list: configured ranges → latest readings → replacement water keys
  const rangeParams = getActiveParameterOrder(paramRanges)
  const latestKeys = latestParams ? Object.keys(latestParams) : []
  const replacementKeys = Object.keys(replacementParams).filter(k => k !== 'temperature' && k !== 'ph')
  const activeParams = rangeParams.length > 0
    ? rangeParams
    : latestKeys.length > 0
      ? latestKeys
      : replacementKeys

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

      // Default target param: prefer first with a reading, fallback to first in order or replacement keys
      const order = getActiveParameterOrder(rangeMap)
      const latKeys = Object.keys(latest)
      const replKeys = Object.keys(getDefaultReplacementParams(waterType).params).filter(k => k !== 'temperature' && k !== 'ph')
      const allAvailable = order.length > 0 ? order : latKeys.length > 0 ? latKeys : replKeys
      const firstWithReading = allAvailable.find(p => latest[p] !== undefined)
      setTargetParam(firstWithReading || allAvailable[0] || '')
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [selectedTank, waterType])

  useEffect(() => {
    loadTankData()
  }, [loadTankData])

  // Pre-fill current + target values when targetParam changes
  useEffect(() => {
    if (!targetParam) return
    const range = paramRanges[targetParam]
    const reading = latestParams?.[targetParam]?.value
    const replacementVal = replacementParams[targetParam]
    // Current: actual reading → range ideal → range midpoint → replacement value
    const fallback = range?.ideal ?? (range ? (range.min + range.max) / 2 : replacementVal)
    setCurrentValue(String(reading ?? fallback ?? ''))
    // Target: range ideal → range midpoint → replacement value
    if (range?.ideal !== undefined) {
      setTargetValue(String(range.ideal))
    } else if (range) {
      setTargetValue(String((range.min + range.max) / 2))
    } else if (replacementVal !== undefined) {
      setTargetValue(String(replacementVal))
    }
  }, [targetParam, paramRanges, latestParams, replacementParams])

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
  const currentTargetNum = currentValue !== '' ? parseFloat(currentValue) : undefined
  const replacementTargetValue = replacementParams[targetParam] ?? currentTargetNum ?? 0
  const targetResult = currentTargetNum !== undefined && !isNaN(currentTargetNum) && targetValue !== ''
    ? calculateTarget(currentTargetNum, parseFloat(targetValue), replacementTargetValue, totalVolume)
    : null

  const litersToChange = roundValue((waterChangePercent / 100) * totalVolume, 1)

  // Correction plan (memoized) — fall back to default ranges + ideal values when tank data is missing
  const correctionPlan = useMemo(() => {
    if (activeParams.length === 0) return null
    // Use tank-specific ranges, or fall back to hardcoded defaults
    const effectiveRanges: Record<string, ParameterRange> = { ...paramRanges }
    for (const p of activeParams) {
      if (!effectiveRanges[p] && PARAMETER_RANGES[p]) {
        effectiveRanges[p] = PARAMETER_RANGES[p]
      }
    }
    // Synthesize current values from readings → range ideals → replacement values
    const effectiveParams: Record<string, { value: number }> = { ...(latestParams || {}) }
    for (const p of activeParams) {
      if (!effectiveParams[p]) {
        const range = effectiveRanges[p]
        if (range) {
          effectiveParams[p] = { value: range.ideal ?? (range.min + range.max) / 2 }
        } else if (replacementParams[p] !== undefined) {
          effectiveParams[p] = { value: replacementParams[p] }
        }
      }
    }
    return buildCorrectionPlan(
      effectiveParams, adjustedReplacementParams, effectiveRanges, activeParams, totalVolume, correctionConfig,
    )
  }, [latestParams, adjustedReplacementParams, paramRanges, activeParams, totalVolume, correctionConfig, replacementParams])

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
              <span className="font-medium">{t('volume.display')}:</span> {formatVolume(selectedTankObj.display_volume_liters)}
            </div>
          )}
          {selectedTankObj.sump_volume_liters && (
            <div className="px-3 py-1.5 bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 rounded-md">
              <span className="font-medium">{t('volume.sump')}:</span> {formatVolume(selectedTankObj.sump_volume_liters)}
            </div>
          )}
          <div className="px-3 py-1.5 bg-ocean-100 dark:bg-ocean-900/50 text-ocean-800 dark:text-ocean-200 rounded-md font-semibold">
            {t('volume.total')}: {formatVolume(totalVolume)}
          </div>
        </div>
      )}

      {/* Replacement water (shared across all tabs) */}
      {selectedTankObj && !isLoading && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowReplacementWater(!showReplacementWater)}
            className="w-full flex items-center justify-between px-5 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('impact.replacementWater')}
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {selectedPresetId !== 'custom'
                  ? (isSaltwater
                      ? SALT_MIX_PRESETS.find(p => p.id === selectedPresetId)?.name
                      : FRESHWATER_PRESETS.find(p => p.id === selectedPresetId)?.name)
                    || selectedPresetId
                  : t('impact.custom')}
              </span>
            </div>
            <span className="text-gray-400 text-xs">{showReplacementWater ? '▾' : '▸'}</span>
          </button>

          {showReplacementWater && (
            <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700/50 pt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
                    {isSaltwater ? t('impact.saltMix') : t('impact.replacementWater')}
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={e => handlePresetChange(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
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
                <button
                  onClick={handleSaveProfile}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  {profileSaved ? t('impact.profileSaved') : t('impact.saveProfile')}
                </button>
              </div>

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
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
        {(['correction', 'target', 'impact'] as Tab[]).map(tab => (
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
                {t('impact.liters', { value: litersToDisplay(litersToChange) })}
              </span>
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
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                          getStatusTextColor(getParameterStatus(r.parameterType, r.currentValue, paramRanges))
                        }`}>
                          {formatParam(r.parameterType, r.currentValue)}
                        </td>
                        <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                          getStatusTextColor(getParameterStatus(r.parameterType, r.projectedValue, paramRanges))
                        }`}>
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
      ) : activeTab === 'target' ? (
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

              {/* Current value (editable, pre-filled from reading or range) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('target.currentValue')}
                </label>
                <input
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                />
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
          {targetResult && !targetResult.isFeasible && targetResult.requiredPercentage < 0 ? (
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
                    {formatVolume(targetResult.requiredLiters)}
                    <span className="text-xs font-normal text-ocean-500 dark:text-ocean-400 ml-1">
                      {t('target.result.ofTotal', { total: litersToDisplay(totalVolume) })}
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
                      liters: litersToDisplay(targetResult.perChangeLiters),
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
                      liters: litersToDisplay(targetResult.perChangeLiters),
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
      ) : (
        /* =================== CORRECTION PLAN TAB =================== */
        <div className="space-y-6">
          {!correctionPlan || correctionPlan.parameterStatuses.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-400 text-sm">
              {t('impact.noData')}
            </div>
          ) : correctionPlan.outOfRangeCount === 0 ? (
            /* All in range */
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">&#10003;</div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">{t('correction.allInRange')}</h3>
            </div>
          ) : (
            <>
              {/* Section 1: Parameter Status Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('correction.statusOverview')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {t('correction.outOfRange', { count: correctionPlan.outOfRangeCount, total: correctionPlan.parameterStatuses.length })}
                  {correctionPlan.parameterStatuses.filter(s => s.status === 'critical').length > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      {t('correction.criticalCount', { count: correctionPlan.parameterStatuses.filter(s => s.status === 'critical').length })}
                    </span>
                  )}
                  {correctionPlan.parameterStatuses.filter(s => s.status === 'warning').length > 0 && (
                    <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                      {t('correction.warningCount', { count: correctionPlan.parameterStatuses.filter(s => s.status === 'warning').length })}
                    </span>
                  )}
                </p>

                <div className="space-y-2">
                  {correctionPlan.parameterStatuses.map(ps => {
                    const range = paramRanges[ps.parameterType]
                    const borderColor = ps.status === 'critical'
                      ? 'border-l-red-500'
                      : ps.status === 'warning'
                        ? 'border-l-yellow-500'
                        : 'border-l-green-500'
                    return (
                      <div
                        key={ps.parameterType}
                        onClick={() => { setTargetParam(ps.parameterType); setActiveTab('target') }}
                        className={`flex items-center justify-between px-3 py-2 rounded-md border border-gray-100 dark:border-gray-700/50 border-l-4 ${borderColor} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                            {range?.name || ps.parameterType}
                            {range?.unit ? <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">{range.unit}</span> : null}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${getStatusColor(ps.status)}`}>
                            {formatParam(ps.parameterType, ps.currentValue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {ps.status !== 'optimal' && (
                            <span className={`text-xs font-medium ${
                              ps.direction === 'too_high' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                            }`}>
                              {t(`correction.${ps.direction === 'too_high' ? 'tooHigh' : 'tooLow'}`)}
                            </span>
                          )}
                          {ps.status === 'optimal' && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">{t('correction.onTarget')}</span>
                          )}
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section 2: Recommended Plan */}
              <div className="bg-ocean-50 dark:bg-ocean-900/20 border border-ocean-200 dark:border-ocean-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-ocean-800 dark:text-ocean-300 mb-2">
                  {t('correction.recommendedPlan')}
                </h3>
                <p className="text-lg font-bold text-ocean-900 dark:text-ocean-100">
                  {correctionPlan.steps.length === 1
                    ? t('correction.singleChange', {
                        percent: correctionPlan.optimalChangePercent,
                        liters: litersToDisplay(correctionPlan.steps[0].liters),
                      })
                    : t('correction.planSummary', {
                        count: correctionPlan.steps.length,
                        percent: correctionPlan.optimalChangePercent,
                        liters: litersToDisplay(correctionPlan.steps[0]?.liters || 0),
                        days: correctionPlan.totalDays,
                      })
                  }
                </p>

                {/* Config toggle */}
                <button
                  onClick={() => setShowCorrectionConfig(!showCorrectionConfig)}
                  className="mt-3 text-xs text-ocean-600 dark:text-ocean-400 hover:text-ocean-800 dark:hover:text-ocean-200 transition"
                >
                  {showCorrectionConfig ? '▾' : '▸'} {t('correction.config.title')}
                </button>

                {showCorrectionConfig && (
                  <div className="mt-3 grid grid-cols-2 gap-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-md">
                    <div>
                      <label className="block text-xs font-medium text-ocean-700 dark:text-ocean-300 mb-1">
                        {t('correction.config.maxChange')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={10}
                          max={50}
                          step={5}
                          value={correctionConfig.maxSingleChangePercent ?? 25}
                          onChange={e => setCorrectionConfig(prev => ({ ...prev, maxSingleChangePercent: Number(e.target.value) }))}
                          className="flex-1 accent-ocean-600"
                        />
                        <span className="text-sm font-medium text-ocean-700 dark:text-ocean-300 w-10 text-right">
                          {correctionConfig.maxSingleChangePercent ?? 25}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ocean-700 dark:text-ocean-300 mb-1">
                        {t('correction.config.daysBetween')}
                      </label>
                      <select
                        value={correctionConfig.daysBetweenChanges ?? 2}
                        onChange={e => setCorrectionConfig(prev => ({ ...prev, daysBetweenChanges: Number(e.target.value) }))}
                        className="w-full px-2 py-1 text-sm border border-ocean-300 dark:border-ocean-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                      >
                        {[1, 2, 3, 4, 5].map(d => (
                          <option key={d} value={d}>{t('correction.config.days', { count: d })}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Step-by-Step Schedule */}
              {correctionPlan.steps.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    {t('correction.schedule')}
                  </h3>

                  <div className="space-y-4">
                    {correctionPlan.steps.map((step, idx) => (
                      <div key={step.stepNumber} className="relative pl-6 border-l-2 border-ocean-200 dark:border-ocean-700">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                          idx === correctionPlan!.steps.length - 1
                            ? 'bg-ocean-600 border-ocean-600'
                            : 'bg-white dark:bg-gray-800 border-ocean-400'
                        }`} />

                        <div className="pb-2">
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {t('correction.step', { number: step.stepNumber })}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t('correction.dayOffset', { day: step.dayOffset })}
                            </span>
                            <span className="text-xs font-medium text-ocean-600 dark:text-ocean-400">
                              {step.waterChangePercent}% &middot; {formatVolume(step.liters)}
                            </span>
                          </div>

                          {/* Compact param grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
                            {correctionPlan!.parameterStatuses
                              .filter(ps => ps.status !== 'optimal' || step.projectedStatuses[ps.parameterType] !== 'optimal')
                              .map(ps => {
                                const prevStatus = idx === 0
                                  ? ps.status
                                  : correctionPlan!.steps[idx - 1].projectedStatuses[ps.parameterType]
                                const newStatus = step.projectedStatuses[ps.parameterType]
                                const range = paramRanges[ps.parameterType]
                                return (
                                  <div key={ps.parameterType} className="flex items-center gap-1.5 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 truncate min-w-0">{range?.name || ps.parameterType}</span>
                                    <span className={`font-semibold tabular-nums ${getStatusTextColor(newStatus)}`}>
                                      {formatParam(ps.parameterType, step.projectedValues[ps.parameterType])}
                                    </span>
                                    {prevStatus !== newStatus && (
                                      <span className="text-[10px]">
                                        <span className={getStatusTextColor(prevStatus)}>&#9679;</span>
                                        <span className="text-gray-400 mx-0.5">&rarr;</span>
                                        <span className={getStatusTextColor(newStatus)}>&#9679;</span>
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Before/After Summary */}
              {correctionPlan.steps.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t('correction.beforeAfter')}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 text-left">
                          <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">{t('impact.parameter')}</th>
                          <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">{t('correction.before')}</th>
                          <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-center"></th>
                          <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">{t('correction.afterPlan')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correctionPlan.parameterStatuses.map(ps => {
                          const lastStep = correctionPlan!.steps[correctionPlan!.steps.length - 1]
                          const afterStatus = lastStep.projectedStatuses[ps.parameterType]
                          const afterValue = lastStep.projectedValues[ps.parameterType]
                          const range = paramRanges[ps.parameterType]
                          return (
                            <tr key={ps.parameterType} className="border-t border-gray-100 dark:border-gray-700/50">
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
                                {range?.name || ps.parameterType}
                                {range?.unit ? <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">{range.unit}</span> : null}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(ps.status)}`}>
                                  {formatParam(ps.parameterType, ps.currentValue)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center text-gray-400">&rarr;</td>
                              <td className="px-4 py-2 text-right">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold ${getStatusColor(afterStatus)}`}>
                                  {formatParam(ps.parameterType, afterValue)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 5: Uncorrectable Alert */}
              {correctionPlan.uncorrectableParams.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">{t('correction.uncorrectable.title')}</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                    {t('correction.uncorrectable.description')}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {correctionPlan.uncorrectableParams.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs rounded font-medium">
                        {paramRanges[p]?.name || p}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowDosingCalc(true)}
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-100"
                  >
                    {t('correction.uncorrectable.useDosing')}
                  </button>
                </div>
              )}

              {/* Section 6: Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('correction.info.title')}</h4>
                <p className="text-blue-700 dark:text-blue-400">{t('correction.info.description')}</p>
              </div>
            </>
          )}
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
