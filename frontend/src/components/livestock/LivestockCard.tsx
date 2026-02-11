/**
 * Livestock Card Component
 *
 * Displays livestock information in a card layout with multi-source thumbnails.
 * Photo priority: cached_photo_url > iNaturalist > FishBase
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Livestock, Tank } from '../../types'
import { formatDistanceToNow, formatDistance } from 'date-fns'
import { livestockApi } from '../../api'

interface LivestockCardProps {
  livestock: Livestock
  tanks: Tank[]
  onEdit: (livestock: Livestock) => void
  onDelete: (id: string) => void
  onSplit: (id: string, splitQuantity: number, newStatus: 'dead' | 'removed') => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
}

export default function LivestockCard({
  livestock,
  tanks,
  onEdit,
  onDelete,
  onSplit,
  onArchive,
  onUnarchive,
}: LivestockCardProps) {
  const { t } = useTranslation('livestock')
  const { t: tc } = useTranslation('common')
  const tank = tanks.find((t) => t.id === livestock.tank_id)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [splitQuantity, setSplitQuantity] = useState(1)
  const [splitStatus, setSplitStatus] = useState<'dead' | 'removed'>('dead')

  // Load thumbnail with priority: cached_photo_url > iNaturalist > FishBase
  useEffect(() => {
    const loadThumbnail = async () => {
      // Priority 1: Use cached photo URL if available
      if (livestock.cached_photo_url) {
        setThumbnail(livestock.cached_photo_url)
        return
      }

      // Priority 2: iNaturalist photo (works for all types)
      if (livestock.inaturalist_id) {
        setImageLoading(true)
        setImageError(false)
        try {
          const taxon = await livestockApi.getINaturalistSpecies(livestock.inaturalist_id)
          if (taxon?.default_photo?.medium_url) {
            setThumbnail(taxon.default_photo.medium_url)
          }
        } catch (error) {
          console.error('Failed to load iNaturalist photo:', error)
          setImageError(true)
        } finally {
          setImageLoading(false)
        }
        return
      }

      // Priority 3: FishBase photo (fish only, legacy fallback)
      if (livestock.fishbase_species_id && livestock.type === 'fish') {
        setImageLoading(true)
        setImageError(false)
        try {
          const images = await livestockApi.getFishBaseSpeciesImages(
            livestock.fishbase_species_id
          )
          if (images && images.length > 0) {
            const thumbUrl = images[0].ThumbPic || images[0].Pic
            if (thumbUrl) {
              setThumbnail(thumbUrl)
            }
          }
        } catch (error) {
          console.error('Failed to load FishBase thumbnail:', error)
          setImageError(true)
        } finally {
          setImageLoading(false)
        }
      }
    }

    loadThumbnail()
  }, [
    livestock.cached_photo_url,
    livestock.inaturalist_id,
    livestock.fishbase_species_id,
    livestock.type
  ])

  const getTypeIcon = () => {
    switch (livestock.type) {
      case 'fish':
        return '🐠'
      case 'coral':
        return '🪸'
      case 'invertebrate':
        return '🦐'
      default:
        return '🐟'
    }
  }

  const isDead = livestock.status === 'dead'
  const isRemoved = livestock.status === 'removed'
  const isPast = isDead || isRemoved

  const getTypeColor = () => {
    if (isPast) return 'border-gray-300 bg-gray-100'
    switch (livestock.type) {
      case 'fish':
        return 'border-blue-300 bg-blue-50'
      case 'coral':
        return 'border-purple-300 bg-purple-50'
      case 'invertebrate':
        return 'border-orange-300 bg-orange-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getStatusBadge = () => {
    if (livestock.status === 'alive') return null
    if (isDead) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          {t('status.dead')}
        </span>
      )
    }
    if (isRemoved) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          {t('status.removed')}
        </span>
      )
    }
    return null
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('card.unknown')
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getAge = () => {
    if (!livestock.added_date) return null
    const date = new Date(livestock.added_date)
    return formatDistanceToNow(date, { addSuffix: false })
  }

  const getTimeInTank = () => {
    if (!livestock.added_date) return null
    const addedDate = new Date(livestock.added_date)
    if (isPast && livestock.removed_date) {
      return formatDistance(addedDate, new Date(livestock.removed_date))
    }
    return formatDistanceToNow(addedDate, { addSuffix: false })
  }

  const getTypeLabel = () => {
    switch (livestock.type) {
      case 'fish':
        return t('types.fish')
      case 'coral':
        return t('types.corals')
      case 'invertebrate':
        return t('types.invertebrates')
      default:
        return livestock.type
    }
  }

  const age = getAge()

  return (
    <div className={`rounded-lg shadow border-2 ${getTypeColor()} overflow-hidden ${isPast ? 'opacity-75' : ''} ${livestock.is_archived ? 'opacity-60' : ''}`}>
      {/* Thumbnail Image - Show for any livestock with photo */}
      {(livestock.cached_photo_url || livestock.inaturalist_id || livestock.fishbase_species_id) && (
        <div className={`h-40 bg-gradient-to-b from-blue-100 to-blue-50 relative ${isPast ? 'grayscale' : ''}`}>
          {imageLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
            </div>
          ) : thumbnail && !imageError ? (
            <img
              src={thumbnail}
              alt={livestock.common_name || livestock.species_name}
              className="w-full h-full object-contain p-2"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-6xl opacity-50">{getTypeIcon()}</span>
            </div>
          )}
          {/* Quantity badge */}
          {livestock.quantity > 1 && (
            <div className="absolute top-2 right-2 bg-ocean-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-md">
              {livestock.quantity}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Only show icon if no thumbnail */}
            {!(thumbnail && !imageError) && (
              <span className="text-3xl">{getTypeIcon()}</span>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {livestock.common_name || livestock.species_name}
                </h3>
                {livestock.quantity > 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-ocean-100 text-ocean-700">
                    x{livestock.quantity}
                  </span>
                )}
                {getStatusBadge()}
                {livestock.is_archived && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    {tc('archived')}
                  </span>
                )}
              </div>
              {livestock.common_name && (
                <p className="text-sm text-gray-600 italic truncate">
                  {livestock.species_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-1 ml-2">
            {livestock.quantity > 1 && livestock.status === 'alive' && (
              <button
                onClick={() => {
                  setSplitQuantity(1)
                  setSplitStatus('dead')
                  setShowSplitDialog(!showSplitDialog)
                }}
                className={`p-1 rounded ${showSplitDialog ? 'text-amber-800 bg-amber-200' : 'text-amber-600 hover:bg-amber-100'}`}
                title={t('split.title')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
            {livestock.is_archived ? (
              <button
                onClick={() => onUnarchive(livestock.id)}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title={tc('actions.unarchive')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onArchive(livestock.id)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                title={tc('actions.archive')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onEdit(livestock)}
              className="p-1 text-gray-600 hover:bg-gray-200 rounded"
              title={tc('actions.edit')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(livestock.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title={tc('actions.delete')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Tank */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('card.tank')}</span>
          <span className="font-medium text-gray-900">{tank?.name || t('card.unknown')}</span>
        </div>

        {/* Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('card.type')}</span>
          <span className="font-medium text-gray-900">{getTypeLabel()}</span>
        </div>

        {/* Quantity */}
        {livestock.quantity > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('card.quantity')}</span>
            <span className="font-medium text-gray-900">{livestock.quantity}</span>
          </div>
        )}

        {/* Added Date */}
        {livestock.added_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('card.added')}</span>
            <span className="text-gray-900">
              {formatDate(livestock.added_date)}
              {!isPast && age && <span className="text-gray-500 ml-1">({age} {t('card.ago')})</span>}
            </span>
          </div>
        )}

        {/* Removed Date */}
        {isPast && livestock.removed_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{isDead ? t('card.died') : t('card.removed')}</span>
            <span className="text-gray-900">{formatDate(livestock.removed_date)}</span>
          </div>
        )}

        {/* Time in Tank */}
        {livestock.added_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('card.timeInTank')}</span>
            <span className={`font-medium ${isPast ? 'text-gray-500' : 'text-green-700'}`}>
              {getTimeInTank()}
            </span>
          </div>
        )}

        {/* External Database Links */}
        {(livestock.worms_id || livestock.inaturalist_id || livestock.fishbase_species_id) && (
          <div className="pt-2 border-t border-gray-200 space-y-1">
            {livestock.worms_id && (
              <a
                href={`https://www.marinespecies.org/aphia.php?p=taxdetails&id=${livestock.worms_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ocean-600 hover:text-ocean-700 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('card.viewOnWorms')}
              </a>
            )}
            {livestock.inaturalist_id && (
              <a
                href={`https://www.inaturalist.org/taxa/${livestock.inaturalist_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ocean-600 hover:text-ocean-700 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('card.viewOnINaturalist')}
              </a>
            )}
            {livestock.fishbase_species_id && (
              <a
                href={`https://www.fishbase.se/summary/${livestock.fishbase_species_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ocean-600 hover:text-ocean-700 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('card.viewOnFishBase')}
              </a>
            )}
          </div>
        )}

        {/* Notes */}
        {livestock.notes && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 line-clamp-3">{livestock.notes}</p>
          </div>
        )}
      </div>

      {/* Inline Split Dialog */}
      {showSplitDialog && (
        <div className="p-4 bg-amber-50 border-t-2 border-amber-300">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('split.title')}</h4>
          <p className="text-xs text-gray-600 mb-3">
            {t('split.description', { total: livestock.quantity, name: livestock.common_name || livestock.species_name })}
          </p>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('split.quantity')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={livestock.quantity - 1}
                value={splitQuantity}
                onChange={(e) => setSplitQuantity(Math.max(1, Math.min(livestock.quantity - 1, parseInt(e.target.value) || 1)))}
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="text-xs text-gray-500">
                {t('split.remaining', { count: livestock.quantity - splitQuantity })}
              </span>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('split.newStatus')}
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSplitStatus('dead')}
                className={`px-3 py-1 text-xs rounded-md border-2 transition-colors ${
                  splitStatus === 'dead'
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t('status.dead')}
              </button>
              <button
                type="button"
                onClick={() => setSplitStatus('removed')}
                className={`px-3 py-1 text-xs rounded-md border-2 transition-colors ${
                  splitStatus === 'removed'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t('status.removed')}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowSplitDialog(false)}
              className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {tc('actions.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSplit(livestock.id, splitQuantity, splitStatus)
                setShowSplitDialog(false)
              }}
              className="px-3 py-1 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700"
            >
              {t('split.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
