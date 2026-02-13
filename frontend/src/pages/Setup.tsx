import { useState, FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegionalSettings, COUNTRY_PRESETS, DEFAULT_REGIONAL } from '../hooks/useRegionalSettings'
import type { UnitSystem, TemperatureUnit, DateFormatPref } from '../hooks/useRegionalSettings'
import { adminApi } from '../api'
import LanguageSelector from '../components/LanguageSelector'
import ThemeToggle from '../components/ThemeToggle'

// ── Country flag emoji map ─────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  FR: '\u{1F1EB}\u{1F1F7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  IT: '\u{1F1EE}\u{1F1F9}',
  ES: '\u{1F1EA}\u{1F1F8}',
  PT: '\u{1F1F5}\u{1F1F9}',
  NL: '\u{1F1F3}\u{1F1F1}',
  BE: '\u{1F1E7}\u{1F1EA}',
  AT: '\u{1F1E6}\u{1F1F9}',
  CH: '\u{1F1E8}\u{1F1ED}',
  CA: '\u{1F1E8}\u{1F1E6}',
  AU: '\u{1F1E6}\u{1F1FA}',
  JP: '\u{1F1EF}\u{1F1F5}',
  BR: '\u{1F1E7}\u{1F1F7}',
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'BRL']

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDatePreview(format: DateFormatPref): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  switch (format) {
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Setup() {
  const navigate = useNavigate()
  const { t } = useTranslation('regional')
  const { isLoaded, setupNeeded, refresh } = useRegionalSettings()

  // Local form state, initialized from defaults
  const [selectedCountry, setSelectedCountry] = useState('')
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_REGIONAL.unitSystem)
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(DEFAULT_REGIONAL.temperatureUnit)
  const [currency, setCurrency] = useState(DEFAULT_REGIONAL.currency)
  const [dateFormat, setDateFormat] = useState<DateFormatPref>(DEFAULT_REGIONAL.dateFormat)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Guard: redirect if setup not needed ─────────────────────────────────
  if (isLoaded && !setupNeeded) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Country selection handler ───────────────────────────────────────────
  const handleCountryChange = (code: string) => {
    setSelectedCountry(code)
    if (code && code !== 'custom') {
      const preset = COUNTRY_PRESETS[code]
      if (preset) {
        setUnitSystem(preset.unitSystem)
        setTemperatureUnit(preset.temperatureUnit)
        setCurrency(preset.currency)
        setDateFormat(preset.dateFormat)
      }
    }
  }

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await adminApi.updateGeneralSettings({
        default_currency: currency,
        unit_system: unitSystem,
        temperature_unit: temperatureUnit,
        country: selectedCountry || 'custom',
        date_format: dateFormat,
      })
      await refresh()
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Setup error:', err)
      setError(err.response?.data?.detail || t('setup.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  // ── Shared Tailwind classes ─────────────────────────────────────────────

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  const selectCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ' +
    'rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent'

  const radioCardBase =
    'flex-1 cursor-pointer rounded-lg border-2 px-3 py-2.5 text-center text-sm font-medium transition-all ' +
    'select-none'

  const radioCardSelected =
    'border-ocean-500 bg-ocean-50 text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-300 dark:border-ocean-400 ring-1 ring-ocean-500/30'

  const radioCardUnselected =
    'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-ocean-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="AquaScope" className="h-28 w-28 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-ocean-900 dark:text-ocean-300 mb-2">AquaScope</h1>
          <p className="text-ocean-700 dark:text-ocean-400">{t('setup.subtitle')}</p>
        </div>

        {/* Setup Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          {/* Card header with language / theme toggles */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('setup.title')}
            </h2>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Country ──────────────────────────────────────────────── */}
            <div>
              <label htmlFor="country" className={labelCls}>
                {t('setup.country')}
              </label>
              <select
                id="country"
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className={selectCls}
                disabled={isSaving}
              >
                <option value="">{t('setup.selectCountry')}</option>
                {Object.keys(COUNTRY_PRESETS).map((code) => (
                  <option key={code} value={code}>
                    {COUNTRY_FLAGS[code]} {COUNTRY_NAMES[code]}
                  </option>
                ))}
                <option value="custom">{t('setup.custom')}</option>
              </select>
            </div>

            {/* ── Unit System ──────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>{t('setup.unitSystem')}</label>
              <div className="flex gap-2">
                {([
                  { value: 'metric' as UnitSystem, label: t('setup.metric') },
                  { value: 'us_imperial' as UnitSystem, label: t('setup.usImperial') },
                  { value: 'uk_imperial' as UnitSystem, label: t('setup.ukImperial') },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setUnitSystem(opt.value)}
                    className={`${radioCardBase} ${unitSystem === opt.value ? radioCardSelected : radioCardUnselected}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Temperature ──────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>{t('setup.temperature')}</label>
              <div className="flex gap-2">
                {([
                  { value: 'celsius' as TemperatureUnit, label: t('setup.celsius'), preview: '25.5 \u00B0C' },
                  { value: 'fahrenheit' as TemperatureUnit, label: t('setup.fahrenheit'), preview: '77.9 \u00B0F' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setTemperatureUnit(opt.value)}
                    className={`${radioCardBase} ${temperatureUnit === opt.value ? radioCardSelected : radioCardUnselected}`}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="block text-xs mt-0.5 opacity-70">{opt.preview}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Currency ─────────────────────────────────────────────── */}
            <div>
              <label htmlFor="currency" className={labelCls}>
                {t('setup.currency')}
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={selectCls}
                disabled={isSaving}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* ── Date Format ──────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>{t('setup.dateFormat')}</label>
              <div className="flex gap-2">
                {([
                  { value: 'DD/MM/YYYY' as DateFormatPref, label: 'DD/MM/YYYY' },
                  { value: 'MM/DD/YYYY' as DateFormatPref, label: 'MM/DD/YYYY' },
                  { value: 'YYYY-MM-DD' as DateFormatPref, label: 'YYYY-MM-DD' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setDateFormat(opt.value)}
                    className={`${radioCardBase} ${dateFormat === opt.value ? radioCardSelected : radioCardUnselected}`}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="block text-xs mt-0.5 opacity-70">{formatDatePreview(opt.value)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submit ───────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-ocean-600 text-white py-2.5 px-4 rounded-md hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? t('setup.saving') : t('setup.getStarted')}
            </button>
          </form>

          {/* Skip link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors"
              disabled={isSaving}
            >
              {t('setup.skipForNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
