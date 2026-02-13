/**
 * Tank Card Component
 *
 * Displays tank information in a card layout with image, volumes, description, and events
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tank } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { tanksApi } from '../../api'
import { useRegionalSettings } from '../../hooks/useRegionalSettings'
import DefaultTankAnimation from './DefaultTankAnimation'

interface TankCardProps {
  tank: Tank
  onEdit: (tank: Tank) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  isDefault?: boolean
  onSetDefault?: (id: string) => void
}

export default function TankCard({ tank, onEdit, onDelete, onArchive, onUnarchive, isDefault, onSetDefault }: TankCardProps) {
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { formatVolume } = useRegionalSettings()
  const [imageError, setImageError] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('notSet')
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getAge = (setupDate: string | null) => {
    if (!setupDate) return null
    const date = new Date(setupDate)
    return formatDistanceToNow(date, { addSuffix: false })
  }

  const handleViewParameters = () => {
    navigate(`/parameters?tank=${tank.id}`)
  }

  const handleAddTest = () => {
    navigate(`/parameters?tank=${tank.id}&new=true`)
  }

  const handleCardClick = () => {
    navigate(`/tanks/${tank.id}`)
  }

  const age = getAge(tank.setup_date)
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

  // Sort events by date (most recent first)
  const recentEvents = [...(tank.events || [])].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  ).slice(0, 3)

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer ${tank.is_archived ? 'opacity-60' : ''}`}
      onClick={handleCardClick}
    >
      {/* Tank Image */}
      <div className="h-48 relative overflow-hidden">
        {hasImage ? (
          <img
            src={imageUrl!}
            alt={tank.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : tank.image_url && !imageUrl && !imageError ? (
          <div className="flex items-center justify-center h-full bg-gradient-to-b from-ocean-100 to-ocean-200">
            <div className="text-ocean-400 text-sm">{tc('common.loading')}</div>
          </div>
        ) : (
          <DefaultTankAnimation waterType={tank.water_type} />
        )}
        {tank.is_archived && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded shadow-sm">
              {tc('archivedStatus')}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex space-x-2">
          {/* Default star */}
          {onSetDefault && !tank.is_archived && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetDefault(tank.id)
              }}
              className={`p-2 rounded-md transition-colors shadow-sm ${
                isDefault
                  ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                  : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-400 hover:bg-yellow-50 hover:text-yellow-500'
              }`}
              title={isDefault ? t('isDefault') : t('setDefault')}
              aria-label={isDefault ? t('isDefault') : t('setDefault')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isDefault ? 'currentColor' : 'none'} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
          {tank.is_archived ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnarchive(tank.id)
              }}
              className="p-2 bg-white dark:bg-gray-800 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors shadow-sm"
              title={tc('actions.unarchive')}
              aria-label={tc('actions.unarchive')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9" />
              </svg>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onArchive(tank.id)
              }}
              className="p-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors shadow-sm"
              title={tc('actions.archive')}
              aria-label={tc('actions.archive')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(tank)
            }}
            className="p-2 bg-white dark:bg-gray-800 text-ocean-600 hover:bg-ocean-50 dark:hover:bg-ocean-900/30 rounded-md transition-colors shadow-sm"
            title={t('editTank')}
            aria-label={t('editTank')}
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(tank.id)
            }}
            className="p-2 bg-white dark:bg-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors shadow-sm"
            title={t('deleteTank')}
            aria-label={t('deleteTank')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Header + Quick Actions */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{tank.name}</h3>
          {tank.aquarium_subtype && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full capitalize whitespace-nowrap ml-2">
              {t(`subtype.${tank.aquarium_subtype}`, { defaultValue: tank.aquarium_subtype.replace(/_/g, ' ') })}
            </span>
          )}
        </div>
        {age && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('runningFor', { age })}
          </p>
        )}
        {tank.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {tank.description}
          </p>
        )}
        {/* Quick Actions - accessible right below the header */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleViewParameters()
            }}
            className="text-sm text-ocean-600 hover:text-ocean-700 font-medium transition-colors"
          >
            {t('viewParameters')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddTest()
            }}
            className="px-3 py-1.5 text-sm bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium transition-colors"
          >
            {t('actions.addTest')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-3">
        {/* Volumes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('fields.displayVolume')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatVolume(tank.display_volume_liters)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('fields.sumpVolume')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatVolume(tank.sump_volume_liters)}
            </span>
          </div>
          {tank.total_volume_liters > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300 font-medium">{t('fields.totalSystem')}</span>
              <span className="font-semibold text-ocean-600">
                {formatVolume(tank.total_volume_liters)}
              </span>
            </div>
          )}
        </div>

        {/* Setup Date */}
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-gray-600 dark:text-gray-400">{t('fields.setupDate')}</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatDate(tank.setup_date)}
          </span>
        </div>

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
              {t('recentEvents')}
            </h4>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-ocean-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{event.title}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {new Date(event.event_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
