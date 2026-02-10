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
import { tanksApi } from '../../api/client'
import DefaultTankAnimation from './DefaultTankAnimation'

interface TankCardProps {
  tank: Tank
  onEdit: (tank: Tank) => void
  onDelete: (id: string) => void
}

export default function TankCard({ tank, onEdit, onDelete }: TankCardProps) {
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
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
      className="bg-white rounded-lg shadow hover:shadow-xl transition-all border border-gray-200 overflow-hidden cursor-pointer"
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
        ) : tank.image_url && !imageUrl ? (
          <div className="flex items-center justify-center h-full bg-gradient-to-b from-ocean-100 to-ocean-200">
            <div className="text-ocean-400 text-sm">{tc('common.loading')}</div>
          </div>
        ) : (
          <DefaultTankAnimation waterType={tank.water_type} />
        )}
        <div className="absolute top-3 right-3 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(tank)
            }}
            className="p-2 bg-white text-ocean-600 hover:bg-ocean-50 rounded-md transition-colors shadow-sm"
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(tank.id)
            }}
            className="p-2 bg-white text-red-600 hover:bg-red-50 rounded-md transition-colors shadow-sm"
            title={t('deleteTank')}
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

      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{tank.name}</h3>
          {tank.aquarium_subtype && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize whitespace-nowrap ml-2">
              {t(`subtype.${tank.aquarium_subtype}`, { defaultValue: tank.aquarium_subtype.replace(/_/g, ' ') })}
            </span>
          )}
        </div>
        {age && (
          <p className="text-sm text-gray-500 mt-1">
            {t('runningFor', { age })}
          </p>
        )}
        {tank.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {tank.description}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-6 space-y-3">
        {/* Volumes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('fields.displayVolume')}</span>
            <span className="font-medium text-gray-900">
              {tank.display_volume_liters ? `${tank.display_volume_liters} ${t('fields.liters')}` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('fields.sumpVolume')}</span>
            <span className="font-medium text-gray-900">
              {tank.sump_volume_liters ? `${tank.sump_volume_liters} ${t('fields.liters')}` : '-'}
            </span>
          </div>
          {tank.total_volume_liters > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
              <span className="text-gray-700 font-medium">{t('fields.totalSystem')}</span>
              <span className="font-semibold text-ocean-600">
                {tank.total_volume_liters.toFixed(1)} {t('fields.liters')}
              </span>
            </div>
          )}
        </div>

        {/* Setup Date */}
        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-gray-600">{t('fields.setupDate')}</span>
          <span className="text-gray-900">
            {formatDate(tank.setup_date)}
          </span>
        </div>

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {t('recentEvents')}
            </h4>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-ocean-500 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{event.title}</p>
                    <p className="text-gray-500">
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

      {/* Footer - Quick Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleViewParameters()
            }}
            className="text-ocean-600 hover:text-ocean-700 font-medium transition-colors"
          >
            {t('viewParameters')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddTest()
            }}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium transition-colors"
          >
            {t('actions.addTest')}
          </button>
        </div>
      </div>
    </div>
  )
}
