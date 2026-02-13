/**
 * Water Change Calculator Configuration
 *
 * Salt mix presets, replacement water defaults, and calculation formulas
 * for predicting water parameter changes after water changes.
 */

import { type ParameterRange, getParameterStatus } from './parameterRanges'

// ============================================================================
// Types
// ============================================================================

export interface SaltMixPreset {
  id: string
  name: string
  parameters: Record<string, number>
}

export interface ReplacementWaterProfile {
  id: string
  name: string
  waterType: 'saltwater' | 'freshwater' | 'brackish'
  parameters: Record<string, number>
}

export interface WaterChangeImpactResult {
  parameterType: string
  currentValue: number
  projectedValue: number
  change: number
  direction: 'up' | 'down' | 'unchanged'
  towardIdeal: boolean
}

export interface WaterChangeTargetResult {
  requiredPercentage: number
  requiredLiters: number
  isFeasible: boolean
  recommendedChanges: number
  perChangePercentage: number
  perChangeLiters: number
}

// ============================================================================
// Salt Mix Presets (Saltwater)
// ============================================================================

export const SALT_MIX_PRESETS: SaltMixPreset[] = [
  {
    id: 'red_sea_coral_pro',
    name: 'Red Sea Coral Pro',
    parameters: {
      calcium: 440, magnesium: 1340, alkalinity_kh: 12.2,
      salinity: 1.026, ph: 8.2, temperature: 25.5,
      nitrate: 0, phosphate: 0, ammonia: 0, nitrite: 0,
    },
  },
  {
    id: 'instant_ocean',
    name: 'Instant Ocean',
    parameters: {
      calcium: 400, magnesium: 1280, alkalinity_kh: 11.0,
      salinity: 1.026, ph: 8.2, temperature: 25.5,
      nitrate: 0, phosphate: 0, ammonia: 0, nitrite: 0,
    },
  },
  {
    id: 'fritz_rpm',
    name: 'Fritz RPM',
    parameters: {
      calcium: 450, magnesium: 1360, alkalinity_kh: 8.0,
      salinity: 1.026, ph: 8.2, temperature: 25.5,
      nitrate: 0, phosphate: 0, ammonia: 0, nitrite: 0,
    },
  },
  {
    id: 'tropic_marin_pro',
    name: 'Tropic Marin Pro Reef',
    parameters: {
      calcium: 440, magnesium: 1320, alkalinity_kh: 7.5,
      salinity: 1.026, ph: 8.3, temperature: 25.5,
      nitrate: 0, phosphate: 0, ammonia: 0, nitrite: 0,
    },
  },
  {
    id: 'hw_reefer',
    name: 'HW Reefer Salt',
    parameters: {
      calcium: 420, magnesium: 1300, alkalinity_kh: 8.0,
      salinity: 1.026, ph: 8.2, temperature: 25.5,
      nitrate: 0, phosphate: 0, ammonia: 0, nitrite: 0,
    },
  },
]

// ============================================================================
// Freshwater Presets
// ============================================================================

export const FRESHWATER_PRESETS: ReplacementWaterProfile[] = [
  {
    id: 'ro_di',
    name: 'RO/DI Water',
    waterType: 'freshwater',
    parameters: {
      temperature: 25, ph: 7.0, gh: 0, alkalinity_kh: 0,
      ammonia: 0, nitrite: 0, nitrate: 0, phosphate: 0,
    },
  },
  {
    id: 'tap_water',
    name: 'Tap Water',
    waterType: 'freshwater',
    parameters: {
      temperature: 25, ph: 7.5, gh: 8, alkalinity_kh: 5,
      ammonia: 0, nitrite: 0, nitrate: 5, phosphate: 0.1,
    },
  },
]

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Projected value after a single water change.
 * Formula: after = current × (1 - WC%) + replacement × WC%
 */
export function calculateImpact(
  currentValue: number,
  replacementValue: number,
  waterChangePercent: number,
): number {
  const fraction = waterChangePercent / 100
  return currentValue * (1 - fraction) + replacementValue * fraction
}

/**
 * Projected value after N sequential water changes at the same %.
 * Formula: after_n = current × (1 - WC%)^n + replacement × (1 - (1 - WC%)^n)
 */
export function calculateMultiChangeImpact(
  currentValue: number,
  replacementValue: number,
  waterChangePercent: number,
  numberOfChanges: number,
): number {
  const fraction = waterChangePercent / 100
  const retention = Math.pow(1 - fraction, numberOfChanges)
  return currentValue * retention + replacementValue * (1 - retention)
}

/**
 * Required water change percentage to reach a target value.
 * Formula: WC% = (current - target) / (current - replacement)
 * Returns percentage (0-100), or Infinity if not achievable.
 */
export function calculateRequiredPercentage(
  currentValue: number,
  targetValue: number,
  replacementValue: number,
): number {
  const denominator = currentValue - replacementValue
  if (Math.abs(denominator) < 0.0001) {
    return Math.abs(currentValue - targetValue) < 0.0001 ? 0 : Infinity
  }
  const fraction = (currentValue - targetValue) / denominator
  return fraction * 100
}

/**
 * Whether the projected value is moving toward the ideal.
 */
function isMovingTowardIdeal(
  currentValue: number,
  projectedValue: number,
  idealValue: number | undefined,
): boolean {
  if (idealValue === undefined) return true
  return Math.abs(projectedValue - idealValue) <= Math.abs(currentValue - idealValue)
}

/**
 * Build full impact analysis for all active parameters.
 */
export function calculateFullImpact(
  latestParams: Record<string, { value: number }>,
  replacementParams: Record<string, number>,
  idealParams: Record<string, number | undefined>,
  waterChangePercent: number,
  parameterOrder: string[],
): WaterChangeImpactResult[] {
  return parameterOrder
    .filter(pt => latestParams[pt] !== undefined)
    .map(pt => {
      const current = latestParams[pt].value
      const replacement = replacementParams[pt] ?? current
      const projected = calculateImpact(current, replacement, waterChangePercent)
      const change = projected - current
      return {
        parameterType: pt,
        currentValue: current,
        projectedValue: projected,
        change,
        direction: change > 0.001 ? 'up' as const : change < -0.001 ? 'down' as const : 'unchanged' as const,
        towardIdeal: isMovingTowardIdeal(current, projected, idealParams[pt]),
      }
    })
}

/**
 * Calculate how much water change is needed for a target parameter value.
 */
export function calculateTarget(
  currentValue: number,
  targetValue: number,
  replacementValue: number,
  totalVolumeLiters: number,
): WaterChangeTargetResult {
  const percentage = calculateRequiredPercentage(currentValue, targetValue, replacementValue)

  if (!isFinite(percentage) || percentage < 0) {
    return {
      requiredPercentage: percentage,
      requiredLiters: 0,
      isFeasible: false,
      recommendedChanges: 0,
      perChangePercentage: 0,
      perChangeLiters: 0,
    }
  }

  const liters = (percentage / 100) * totalVolumeLiters
  const isFeasible = percentage <= 100
  const recommendedChanges = percentage > 50 ? Math.ceil(percentage / 25) : 1
  const perChangePercentage = recommendedChanges > 1
    ? Math.round((percentage / recommendedChanges) * 10) / 10
    : Math.round(percentage * 10) / 10
  const perChangeLiters = (perChangePercentage / 100) * totalVolumeLiters

  return {
    requiredPercentage: Math.round(percentage * 10) / 10,
    requiredLiters: Math.round(liters * 10) / 10,
    isFeasible,
    recommendedChanges,
    perChangePercentage,
    perChangeLiters: Math.round(perChangeLiters * 10) / 10,
  }
}

// ============================================================================
// LocalStorage Persistence
// ============================================================================

const STORAGE_KEY = 'aquascope_replacement_water'

export function saveReplacementProfile(waterType: string, params: Record<string, number>, presetId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ waterType, params, presetId }))
  } catch { /* ignore quota errors */ }
}

export function loadReplacementProfile(): { waterType: string; params: Record<string, number>; presetId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Get the default replacement water parameters for a water type.
 */
export function getDefaultReplacementParams(waterType: string): { params: Record<string, number>; presetId: string } {
  if (waterType === 'saltwater' || waterType === 'brackish') {
    const preset = SALT_MIX_PRESETS[0]
    return { params: { ...preset.parameters }, presetId: preset.id }
  }
  const preset = FRESHWATER_PRESETS[0]
  return { params: { ...preset.parameters }, presetId: preset.id }
}

// ============================================================================
// Correction Plan Types & Functions
// ============================================================================

export interface CorrectionPlanConfig {
  maxSingleChangePercent: number  // default 25
  daysBetweenChanges: number      // default 2
}

export interface ParameterCorrectionStatus {
  parameterType: string
  currentValue: number
  targetValue: number
  status: 'optimal' | 'warning' | 'critical'
  requiredPercentage: number
  isCorrectable: boolean
  direction: 'too_high' | 'too_low' | 'on_target'
}

export interface CorrectionStep {
  stepNumber: number
  waterChangePercent: number
  liters: number
  dayOffset: number
  projectedValues: Record<string, number>
  projectedStatuses: Record<string, 'optimal' | 'warning' | 'critical'>
}

export interface CorrectionPlanResult {
  parameterStatuses: ParameterCorrectionStatus[]
  outOfRangeCount: number
  correctedAfterPlanCount: number
  optimalChangePercent: number
  steps: CorrectionStep[]
  totalLiters: number
  totalDays: number
  uncorrectableParams: string[]
}

const DEFAULT_CORRECTION_CONFIG: CorrectionPlanConfig = {
  maxSingleChangePercent: 25,
  daysBetweenChanges: 2,
}

/**
 * Analyze all parameters against their ranges — status, required WC%, correctability.
 */
export function analyzeAllParameters(
  latestParams: Record<string, { value: number }>,
  replacementParams: Record<string, number>,
  paramRanges: Record<string, ParameterRange>,
  activeParams: string[],
): ParameterCorrectionStatus[] {
  return activeParams
    .filter(pt => latestParams[pt] !== undefined && paramRanges[pt] !== undefined)
    .map(pt => {
      const current = latestParams[pt].value
      const range = paramRanges[pt]
      const target = range.ideal ?? (range.min + range.max) / 2
      const status = getParameterStatus(pt, current, paramRanges)
      const replacement = replacementParams[pt] ?? current
      const requiredPct = calculateRequiredPercentage(current, target, replacement)

      // Correctable if: replacement moves value toward target, and required % is positive + finite
      const isCorrectable = isFinite(requiredPct) && requiredPct > 0

      let direction: 'too_high' | 'too_low' | 'on_target' = 'on_target'
      if (status !== 'optimal') {
        direction = current > target ? 'too_high' : 'too_low'
      }

      return {
        parameterType: pt,
        currentValue: current,
        targetValue: target,
        status,
        requiredPercentage: requiredPct,
        isCorrectable,
        direction,
      }
    })
}

/**
 * Find the WC% (in 5% increments up to maxPercent) that improves the most parameters.
 * Scoring: critical→optimal = +2, critical→warning = +1, warning→optimal = +1, degradation = -1.
 */
export function findOptimalChangePercent(
  latestParams: Record<string, { value: number }>,
  replacementParams: Record<string, number>,
  paramRanges: Record<string, ParameterRange>,
  activeParams: string[],
  maxPercent: number = 25,
): number {
  const paramsWithData = activeParams.filter(
    pt => latestParams[pt] !== undefined && paramRanges[pt] !== undefined
  )
  if (paramsWithData.length === 0) return 0

  let bestPercent = 5
  let bestScore = -Infinity

  for (let pct = 5; pct <= maxPercent; pct += 5) {
    let score = 0
    for (const pt of paramsWithData) {
      const current = latestParams[pt].value
      const replacement = replacementParams[pt] ?? current
      const projected = calculateImpact(current, replacement, pct)

      const currentStatus = getParameterStatus(pt, current, paramRanges)
      const projectedStatus = getParameterStatus(pt, projected, paramRanges)

      if (currentStatus === 'critical' && projectedStatus === 'optimal') score += 2
      else if (currentStatus === 'critical' && projectedStatus === 'warning') score += 1
      else if (currentStatus === 'warning' && projectedStatus === 'optimal') score += 1
      else if (currentStatus === 'optimal' && projectedStatus !== 'optimal') score -= 1
      else if (currentStatus === 'warning' && projectedStatus === 'critical') score -= 1
    }
    if (score > bestScore) {
      bestScore = score
      bestPercent = pct
    }
  }

  return bestPercent
}

/**
 * Build a multi-step correction plan: find optimal WC%, iterate steps
 * until all correctable params reach optimal or 6-step cap.
 */
export function buildCorrectionPlan(
  latestParams: Record<string, { value: number }>,
  replacementParams: Record<string, number>,
  paramRanges: Record<string, ParameterRange>,
  activeParams: string[],
  totalVolumeLiters: number,
  config?: Partial<CorrectionPlanConfig>,
): CorrectionPlanResult {
  const cfg = { ...DEFAULT_CORRECTION_CONFIG, ...config }
  const paramStatuses = analyzeAllParameters(latestParams, replacementParams, paramRanges, activeParams)
  const outOfRangeCount = paramStatuses.filter(s => s.status !== 'optimal').length

  const uncorrectable = paramStatuses
    .filter(s => s.status !== 'optimal' && !s.isCorrectable)
    .map(s => s.parameterType)

  const optimalPct = findOptimalChangePercent(
    latestParams, replacementParams, paramRanges, activeParams, cfg.maxSingleChangePercent
  )

  // Build steps iteratively
  const steps: CorrectionStep[] = []
  const maxSteps = 6
  // Track running values for each parameter
  const currentValues: Record<string, number> = {}
  for (const s of paramStatuses) {
    currentValues[s.parameterType] = s.currentValue
  }

  for (let i = 0; i < maxSteps; i++) {
    // Check if all correctable params are now optimal
    const stillOutOfRange = paramStatuses.some(s =>
      s.isCorrectable && getParameterStatus(s.parameterType, currentValues[s.parameterType], paramRanges) !== 'optimal'
    )
    if (!stillOutOfRange) break

    const projectedValues: Record<string, number> = {}
    const projectedStatuses: Record<string, 'optimal' | 'warning' | 'critical'> = {}

    for (const s of paramStatuses) {
      const cv = currentValues[s.parameterType]
      const rv = replacementParams[s.parameterType] ?? cv
      const pv = calculateImpact(cv, rv, optimalPct)
      projectedValues[s.parameterType] = pv
      projectedStatuses[s.parameterType] = getParameterStatus(s.parameterType, pv, paramRanges)
      currentValues[s.parameterType] = pv
    }

    steps.push({
      stepNumber: i + 1,
      waterChangePercent: optimalPct,
      liters: Math.round((optimalPct / 100) * totalVolumeLiters * 10) / 10,
      dayOffset: i * cfg.daysBetweenChanges,
      projectedValues,
      projectedStatuses,
    })
  }

  const correctedAfterPlan = paramStatuses.filter(s =>
    s.status !== 'optimal' &&
    steps.length > 0 &&
    (steps[steps.length - 1].projectedStatuses[s.parameterType] === 'optimal')
  ).length

  return {
    parameterStatuses: paramStatuses,
    outOfRangeCount,
    correctedAfterPlanCount: correctedAfterPlan,
    optimalChangePercent: optimalPct,
    steps,
    totalLiters: steps.reduce((sum, s) => sum + s.liters, 0),
    totalDays: steps.length > 0 ? steps[steps.length - 1].dayOffset : 0,
    uncorrectableParams: uncorrectable,
  }
}
