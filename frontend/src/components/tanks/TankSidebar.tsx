/**
 * TankSidebar Component
 *
 * Left sidebar for tank detail view showing image, info, stats, and quick actions
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Tank } from '../../types'
import TankStats from './TankStats'
import TankImageUpload from './TankImageUpload'
import DefaultTankAnimation from './DefaultTankAnimation'
import { tanksApi } from '../../api/client'

interface TankSidebarProps {
  tank: Tank
  stats?: {
    event_count?: number
    equipment_count?: number
    livestock_count?: number
    photo_count?: number
    note_count?: number
    maintenance_count?: number
    icp_test_count?: number
    tank_age_days?: number
  }
  onEdit?: () => void
  onAddEvent?: () => void
  onRefresh?: () => void
}

export default function TankSidebar({ tank, stats, onEdit, onAddEvent, onRefresh }: TankSidebarProps) {
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const [imageError, setImageError] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

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
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Tank Image */}
        <div className="aspect-video bg-gradient-to-br from-ocean-100 to-ocean-200 rounded-lg flex items-center justify-center overflow-hidden relative group">
          {hasImage ? (
            <img
              src={imageUrl!}
              alt={tank.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : tank.image_url && !imageUrl ? (
            <div className="text-ocean-400">{tc('common.loading')}</div>
          ) : (
            <DefaultTankAnimation waterType={tank.water_type} />
          )}
          {/* Upload overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white text-ocean-600 rounded-md font-medium hover:bg-ocean-50"
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
            <h2 className="text-xl font-semibold text-gray-900">{tank.name}</h2>
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {t(`subtype.${tank.aquarium_subtype}`)}
                </span>
              )}
            </div>
          )}
          {tank.description && (
            <p className="text-gray-600 text-sm">{tank.description}</p>
          )}
        </div>

        {/* Volume Info */}
        <div className="space-y-2 text-sm">
          {tank.display_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('fields.displayVolume')}:</span>
              <span className="font-medium">{tank.display_volume_liters}L</span>
            </div>
          )}
          {tank.sump_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('fields.sumpVolume')}:</span>
              <span className="font-medium">{tank.sump_volume_liters}L</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600 font-medium">{t('fields.totalVolume')}:</span>
            <span className="font-bold text-ocean-600">{tank.total_volume_liters}L</span>
          </div>
        </div>

        {/* Setup Date & Days Running */}
        {tank.setup_date && (
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600">{t('fields.setupDate')}</div>
            <div className="font-medium">
              {new Date(tank.setup_date).toLocaleDateString()}
            </div>
            {daysUp > 0 && (
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-ocean-600 text-white text-sm font-semibold rounded-full">
                  {t('stats.daysRunning', { count: daysUp })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics Card */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            {t('statistics')}
          </h3>
          <TankStats stats={stats} />
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          {t('quickActions')}
        </h3>
        <div className="space-y-2">
          <Link
            to={`/parameters?tank=${tank.id}`}
            className="block w-full px-4 py-2 bg-ocean-600 text-white text-center rounded-md hover:bg-ocean-700 transition font-medium"
          >
            {`📊 ${t('actions.logParameters')}`}
          </Link>
          <Link
            to="/photos"
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            {`📷 ${t('actions.uploadPhoto')}`}
          </Link>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
            >
              {`📅 ${t('actions.addEvent')}`}
            </button>
          )}
          <Link
            to={`/equipment`}
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            {`⚙️ ${t('actions.manageEquipment')}`}
          </Link>
          <Link
            to={`/livestock`}
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            {`🐟 ${t('actions.manageLivestock')}`}
          </Link>
        </div>
      </div>
    </div>
  )
}
