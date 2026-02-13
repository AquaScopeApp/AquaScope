/**
 * Regional Settings Context
 *
 * Provides app-wide access to regional preferences: unit system, temperature,
 * currency, country, date format. Includes conversion helpers for volume and
 * temperature (display-only — all storage remains in liters and °C).
 *
 * Replaces the former useCurrency() hook.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { adminApi } from '../api'

// ── Types ────────────────────────────────────────────────────────────────────

export type UnitSystem = 'metric' | 'us_imperial' | 'uk_imperial'
export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type DateFormatPref = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type BannerTheme = 'reef' | 'planted' | 'custom'

interface RegionalSettingsContextValue {
  // Raw settings
  currency: string
  bannerTheme: BannerTheme
  unitSystem: UnitSystem
  temperatureUnit: TemperatureUnit
  country: string
  dateFormat: DateFormatPref
  isLoaded: boolean
  setupNeeded: boolean
  refresh: () => Promise<void>

  // Volume helpers
  volumeLabel: string
  volumeLabelFull: string
  litersToDisplay: (liters: number, decimals?: number) => number
  displayToLiters: (displayValue: number) => number
  formatVolume: (liters: number | null | undefined, decimals?: number) => string

  // Temperature helpers
  tempLabel: string
  celsiusToDisplay: (celsius: number, decimals?: number) => number
  displayToCelsius: (displayValue: number) => number
  formatTemp: (celsius: number | null | undefined, decimals?: number) => string

  // Date helper
  formatDate: (dateString: string | Date | null | undefined) => string
}

// ── Conversion Constants ─────────────────────────────────────────────────────

const LITERS_PER_US_GAL = 3.78541
const LITERS_PER_UK_GAL = 4.54609

function litersToGallons(liters: number, system: UnitSystem): number {
  if (system === 'us_imperial') return liters / LITERS_PER_US_GAL
  if (system === 'uk_imperial') return liters / LITERS_PER_UK_GAL
  return liters
}

function gallonsToLiters(gallons: number, system: UnitSystem): number {
  if (system === 'us_imperial') return gallons * LITERS_PER_US_GAL
  if (system === 'uk_imperial') return gallons * LITERS_PER_UK_GAL
  return gallons
}

function cToF(c: number): number {
  return c * 9 / 5 + 32
}

function fToC(f: number): number {
  return (f - 32) * 5 / 9
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

// ── Country Presets ──────────────────────────────────────────────────────────

interface RegionalDefaults {
  unitSystem: UnitSystem
  temperatureUnit: TemperatureUnit
  currency: string
  dateFormat: DateFormatPref
}

export const COUNTRY_PRESETS: Record<string, RegionalDefaults> = {
  US: { unitSystem: 'us_imperial', temperatureUnit: 'fahrenheit', currency: 'USD', dateFormat: 'MM/DD/YYYY' },
  GB: { unitSystem: 'uk_imperial', temperatureUnit: 'celsius', currency: 'GBP', dateFormat: 'DD/MM/YYYY' },
  FR: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  DE: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  IT: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  ES: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  PT: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  NL: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  BE: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  AT: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'EUR', dateFormat: 'DD/MM/YYYY' },
  CH: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'CHF', dateFormat: 'DD/MM/YYYY' },
  CA: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'CAD', dateFormat: 'YYYY-MM-DD' },
  AU: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'AUD', dateFormat: 'DD/MM/YYYY' },
  JP: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'JPY', dateFormat: 'YYYY-MM-DD' },
  BR: { unitSystem: 'metric', temperatureUnit: 'celsius', currency: 'BRL', dateFormat: 'DD/MM/YYYY' },
}

export const DEFAULT_REGIONAL: RegionalDefaults = {
  unitSystem: 'metric',
  temperatureUnit: 'celsius',
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
}

// ── Context ──────────────────────────────────────────────────────────────────

const defaultHelpers = {
  volumeLabel: 'L',
  volumeLabelFull: 'liters',
  litersToDisplay: (l: number) => l,
  displayToLiters: (v: number) => v,
  formatVolume: (l: number | null | undefined) => l != null ? `${round(l, 1)} L` : '-',
  tempLabel: '°C',
  celsiusToDisplay: (c: number) => c,
  displayToCelsius: (v: number) => v,
  formatTemp: (c: number | null | undefined) => c != null ? `${round(c, 1)} °C` : '-',
  formatDate: (d: string | Date | null | undefined) => d ? String(d) : '-',
}

const RegionalSettingsContext = createContext<RegionalSettingsContextValue>({
  currency: 'EUR',
  bannerTheme: 'reef',
  unitSystem: 'metric',
  temperatureUnit: 'celsius',
  country: '',
  dateFormat: 'DD/MM/YYYY',
  isLoaded: false,
  setupNeeded: true,
  refresh: async () => {},
  ...defaultHelpers,
})

// ── Provider ─────────────────────────────────────────────────────────────────

export function RegionalSettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState('EUR')
  const [bannerTheme, setBannerTheme] = useState<BannerTheme>('reef')
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric')
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('celsius')
  const [country, setCountry] = useState('')
  const [dateFormat, setDateFormat] = useState<DateFormatPref>('DD/MM/YYYY')
  const [isLoaded, setIsLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const path = window.location.pathname
    const token = localStorage.getItem('aquascope_token')
    if (!token || path === '/login' || path === '/register') {
      setIsLoaded(true)
      return
    }
    try {
      const data = await adminApi.getGeneralSettings()
      if (data.default_currency) setCurrency(data.default_currency)
      if (data.banner_theme) setBannerTheme(data.banner_theme as BannerTheme)
      if (data.unit_system) setUnitSystem(data.unit_system as UnitSystem)
      if (data.temperature_unit) setTemperatureUnit(data.temperature_unit as TemperatureUnit)
      if (data.country != null) setCountry(data.country)
      if (data.date_format) setDateFormat(data.date_format as DateFormatPref)
    } catch {
      // Keep defaults
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setupNeeded = isLoaded && country === ''

  // ── Volume helpers ───────────────────────────────────────────────────────

  const volumeLabel = unitSystem === 'metric' ? 'L' : 'gal'
  const volumeLabelFull = unitSystem === 'metric' ? 'liters'
    : unitSystem === 'us_imperial' ? 'US gallons' : 'UK gallons'

  const litersToDisplay = useCallback((liters: number, decimals = 1) => {
    return round(litersToGallons(liters, unitSystem), decimals)
  }, [unitSystem])

  const displayToLiters = useCallback((displayValue: number) => {
    return gallonsToLiters(displayValue, unitSystem)
  }, [unitSystem])

  const formatVolume = useCallback((liters: number | null | undefined, decimals = 1) => {
    if (liters == null) return '-'
    const val = round(litersToGallons(liters, unitSystem), decimals)
    return `${val} ${unitSystem === 'metric' ? 'L' : 'gal'}`
  }, [unitSystem])

  // ── Temperature helpers ──────────────────────────────────────────────────

  const tempLabel = temperatureUnit === 'celsius' ? '°C' : '°F'

  const celsiusToDisplay = useCallback((celsius: number, decimals = 1) => {
    if (temperatureUnit === 'fahrenheit') return round(cToF(celsius), decimals)
    return round(celsius, decimals)
  }, [temperatureUnit])

  const displayToCelsius = useCallback((displayValue: number) => {
    if (temperatureUnit === 'fahrenheit') return fToC(displayValue)
    return displayValue
  }, [temperatureUnit])

  const formatTemp = useCallback((celsius: number | null | undefined, decimals = 1) => {
    if (celsius == null) return '-'
    if (temperatureUnit === 'fahrenheit') return `${round(cToF(celsius), decimals)} °F`
    return `${round(celsius, decimals)} °C`
  }, [temperatureUnit])

  // ── Date helper ──────────────────────────────────────────────────────────

  const formatDateFn = useCallback((dateString: string | Date | null | undefined) => {
    if (!dateString) return '-'
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return String(dateString)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    switch (dateFormat) {
      case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`
      case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`
      default: return `${dd}/${mm}/${yyyy}`
    }
  }, [dateFormat])

  // ── Memoized value ───────────────────────────────────────────────────────

  const value = useMemo<RegionalSettingsContextValue>(() => ({
    currency,
    bannerTheme,
    unitSystem,
    temperatureUnit,
    country,
    dateFormat,
    isLoaded,
    setupNeeded,
    refresh,
    volumeLabel,
    volumeLabelFull,
    litersToDisplay,
    displayToLiters,
    formatVolume,
    tempLabel,
    celsiusToDisplay,
    displayToCelsius,
    formatTemp,
    formatDate: formatDateFn,
  }), [
    currency, bannerTheme, unitSystem, temperatureUnit, country, dateFormat,
    isLoaded, setupNeeded, refresh, volumeLabel, volumeLabelFull,
    litersToDisplay, displayToLiters, formatVolume,
    tempLabel, celsiusToDisplay, displayToCelsius, formatTemp, formatDateFn,
  ])

  return (
    <RegionalSettingsContext.Provider value={value}>
      {children}
    </RegionalSettingsContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRegionalSettings() {
  return useContext(RegionalSettingsContext)
}

/** @deprecated Use useRegionalSettings() instead */
export function useCurrency() {
  const { currency, bannerTheme, isLoaded, refresh } = useContext(RegionalSettingsContext)
  return { currency, bannerTheme, isLoaded, refresh }
}
