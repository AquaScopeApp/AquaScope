/**
 * TankSidebar Component
 *
 * Left sidebar for tank detail view showing image, info, stats, and quick actions
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Tank, MaturityScore } from '../../types'
import TankImageUpload from './TankImageUpload'
import DefaultTankAnimation from './DefaultTankAnimation'
import { tanksApi } from '../../api'
import { useRegionalSettings } from '../../hooks/useRegionalSettings'
import DosingCalculator from '../dosing/DosingCalculator'
import type { ShareTokenResponse } from '../../types'

interface TankSidebarProps {
  tank: Tank
  stats?: {
    event_count?: number
    equipment_count?: number
    livestock_count?: number
    consumable_count?: number
    photo_count?: number
    note_count?: number
    maintenance_count?: number
    icp_test_count?: number
    tank_age_days?: number
  }
  maturity?: MaturityScore | null
  onEdit?: () => void
  onAddEvent?: () => void
  onRefresh?: () => void
}

const LEVEL_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  new:         { ring: '#9ca3af', text: 'text-gray-400 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
  growing:     { ring: '#38bdf8', text: 'text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  established: { ring: '#0284c7', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  thriving:    { ring: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  mature:      { ring: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
}

export default function TankSidebar({ tank, stats, maturity, onEdit, onAddEvent, onRefresh }: TankSidebarProps) {
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const { formatVolume } = useRegionalSettings()
  const [imageError, setImageError] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [shareEnabled, setShareEnabled] = useState(tank.share_enabled)
  const [shareToken, setShareToken] = useState(tank.share_token)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showDosingCalc, setShowDosingCalc] = useState(false)

  const calculateDaysUp = (setupDate: string | null): number => {
    if (!setupDate) return 0
    const setup = new Date(setupDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - setup.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUp = stats?.tank_age_days || calculateDaysUp(tank.setup_date)
  const hasImage = tank.image_url && !imageError && imageUrl
  const shareUrl = shareToken ? `${window.location.origin}/share/tank/${shareToken}` : ''

  const handleToggleShare = async () => {
    setShareLoading(true)
    try {
      if (shareEnabled) {
        await tanksApi.disableSharing(tank.id)
        setShareEnabled(false)
      } else {
        const res: ShareTokenResponse = await tanksApi.enableSharing(tank.id)
        setShareToken(res.share_token)
        setShareEnabled(true)
      }
    } catch (err) {
      console.error('Failed to toggle sharing:', err)
    } finally {
      setShareLoading(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (!confirm(t('share.regenerateConfirm'))) return
    setShareLoading(true)
    try {
      const res: ShareTokenResponse = await tanksApi.regenerateShareToken(tank.id)
      setShareToken(res.share_token)
      setShareEnabled(true)
    } catch (err) {
      console.error('Failed to regenerate token:', err)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  // Load tank image via API
  useEffect(() => {
    const loadTankImage = async () => {
      if (tank.image_url) {
        try {
          const url = await tanksApi.getImageBlobUrl(tank.id)
          setImageUrl(url)
          setImageError(false)
        } catch (error) {
          console.error('Failed to load tank image:', error)
          setImageError(true)
        }
      } else {
        setImageUrl(null)
      }
    }

    loadTankImage()

    // Cleanup: revoke blob URL when component unmounts or tank changes
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [tank.id, tank.image_url])

  return (
    <div className="space-y-6">
      {/* Tank Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
        {/* Tank Image */}
        <div className="aspect-video bg-gradient-to-br from-ocean-100 to-ocean-200 rounded-lg flex items-center justify-center overflow-hidden relative group">
          {hasImage ? (
            <img
              src={imageUrl!}
              alt={tank.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : tank.image_url && !imageUrl && !imageError ? (
            <div className="text-ocean-400">{tc('common.loading')}</div>
          ) : (
            <DefaultTankAnimation waterType={tank.water_type} />
          )}
          {/* Upload overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white dark:bg-gray-800 text-ocean-600 rounded-md font-medium hover:bg-ocean-50 dark:hover:bg-ocean-900/30"
              onClick={() => setShowImageUpload(true)}
            >
              {`📷 ${t('actions.changeImage')}`}
            </button>
          </div>

          {/* Image Upload Modal */}
          {showImageUpload && (
            <TankImageUpload
              tankId={tank.id}
              tankName={tank.name}
              onSuccess={() => {
                setShowImageUpload(false)
                setImageError(false)
                if (onRefresh) {
                  onRefresh()
                }
              }}
              onCancel={() => setShowImageUpload(false)}
            />
          )}
        </div>

        {/* Tank Name & Description */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{tank.name}</h2>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-ocean-600 transition"
                title={t('editTank')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
          </div>
          {(tank.water_type || tank.aquarium_subtype) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {tank.water_type && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  tank.water_type === 'saltwater' ? 'bg-blue-100 text-blue-700' :
                  tank.water_type === 'freshwater' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-teal-100 text-teal-700'
                }`}>
                  {t(`waterType.${tank.water_type}`)}
                </span>
              )}
              {tank.aquarium_subtype && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {t(`subtype.${tank.aquarium_subtype}`)}
                </span>
              )}
            </div>
          )}
          {tank.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">{tank.description}</p>
          )}
        </div>

        {/* Volume Info */}
        <div className="space-y-2 text-sm">
          {tank.display_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('fields.displayVolume')}:</span>
              <span className="font-medium">{formatVolume(tank.display_volume_liters)}</span>
            </div>
          )}
          {tank.sump_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('fields.sumpVolume')}:</span>
              <span className="font-medium">{formatVolume(tank.sump_volume_liters)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('fields.totalVolume')}:</span>
            <span className="font-bold text-ocean-600">{formatVolume(tank.total_volume_liters)}</span>
          </div>
        </div>

        {/* Setup Date & Days Running */}
        {tank.setup_date && (
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600 dark:text-gray-400">{t('fields.setupDate')}</div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{new Date(tank.setup_date).toLocaleDateString()}</span>
              {daysUp > 0 && (
                <span className="inline-block px-2.5 py-0.5 bg-ocean-600 text-white text-xs font-semibold rounded-full">
                  {t('stats.daysRunning', { count: daysUp })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions — compact grid */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/parameters?tank=${tank.id}`}
              className="flex items-center gap-2 px-3 py-2 bg-ocean-600 text-white text-sm text-center rounded-md hover:bg-ocean-700 transition font-medium"
            >
              <span>📊</span>
              <span className="truncate">{t('actions.logParameters')}</span>
            </Link>
            <Link
              to="/photos"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm text-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
            >
              <span>📷</span>
              <span className="truncate">{t('actions.uploadPhoto')}</span>
            </Link>
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm text-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
              >
                <span>📅</span>
                <span className="truncate">{t('actions.addEvent')}</span>
              </button>
            )}
            <Link
              to="/equipment"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm text-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
            >
              <span>⚙️</span>
              <span className="truncate">{t('actions.manageEquipment')}</span>
            </Link>
            <Link
              to="/livestock"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm text-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
            >
              <span>🐟</span>
              <span className="truncate">{t('actions.manageLivestock')}</span>
            </Link>
            <button
              onClick={() => setShowDosingCalc(true)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm text-center rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition font-medium"
            >
              <span>🧪</span>
              <span className="truncate">{t('actions.dosingCalc')}</span>
            </button>
            <Link
              to={`/water-change-calculator?tank=${tank.id}`}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm text-center rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium"
            >
              <span>💧</span>
              <span className="truncate">{t('actions.waterChangeCalc')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Share Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {t('share.title')}
          </h3>
          <button
            onClick={handleToggleShare}
            disabled={shareLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shareEnabled ? 'bg-ocean-600' : 'bg-gray-300 dark:bg-gray-600'
            } ${shareLoading ? 'opacity-50' : ''}`}
            aria-label={t('share.title')}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              shareEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {shareEnabled && shareToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-gray-600 dark:text-gray-300 truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyShareUrl}
                className="px-3 py-1.5 bg-ocean-600 text-white text-xs rounded hover:bg-ocean-700 transition font-medium flex-shrink-0"
              >
                {shareCopied ? t('share.copied') : t('share.copy')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ocean-600 hover:text-ocean-700 font-medium"
              >
                {t('share.preview')} →
              </a>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={handleRegenerateToken}
                disabled={shareLoading}
                className="text-xs text-gray-500 hover:text-red-500 transition"
              >
                {t('share.regenerate')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('share.description')}
          </p>
        )}
      </div>

      {/* Maturity Score Card */}
      {maturity && maturity.score > 0 && (() => {
        const cfg = LEVEL_COLORS[maturity.level] || LEVEL_COLORS.new
        const size = 64
        const strokeWidth = 5
        const radius = (size - strokeWidth) / 2
        const circumference = 2 * Math.PI * radius
        const progress = (maturity.score / 100) * circumference

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
              {tc('maturityTooltip', { age: maturity.age_score, stability: maturity.stability_score, livestock: maturity.livestock_score }).split(' ').slice(0, 2).join(' ') || 'Maturity Score'}
            </h3>

            <div className="flex items-center gap-4 mb-4">
              <svg width={size} height={size} className="flex-shrink-0">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-600" />
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={cfg.ring} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
                <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" className="fill-gray-800 dark:fill-gray-100 font-bold" fontSize={18}>{maturity.score}</text>
              </svg>
              <div>
                <div className={`text-lg font-bold capitalize ${cfg.text}`}>
                  {tc(`maturityLevels.${maturity.level}`)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {tc('maturityTooltip', { age: maturity.age_score, stability: maturity.stability_score, livestock: maturity.livestock_score })}
                </div>
              </div>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">{tc('maturityLevels.new') ? 'Age' : 'Age'}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{maturity.age_score}/30</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-ocean-500 rounded-full transition-all" style={{ width: `${(maturity.age_score / 30) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Stability</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{maturity.stability_score}/40</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(maturity.stability_score / 40) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Diversity</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{maturity.livestock_score}/30</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(maturity.livestock_score / 30) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Dosing Calculator Modal */}
      {showDosingCalc && (
        <DosingCalculator
          tankId={tank.id}
          tankVolumeLiters={tank.total_volume_liters}
          waterType={tank.water_type}
          isOpen={showDosingCalc}
          onClose={() => setShowDosingCalc(false)}
        />
      )}
    </div>
  )
}
