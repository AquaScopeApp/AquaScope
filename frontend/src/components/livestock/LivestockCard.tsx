/**
 * Livestock Card Component
 *
 * Compact card displaying livestock info with multi-source thumbnails.
 * Photo priority: cached_photo_url > iNaturalist > FishBase
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Livestock, Tank } from '../../types'
import { formatDistanceToNow, formatDistance } from 'date-fns'
import { livestockApi } from '../../api'
import { parsePrice } from '../../utils/price'

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
  tanks: _tanks,
  onEdit,
  onDelete,
  onSplit,
  onArchive,
  onUnarchive,
}: LivestockCardProps) {
  const { t } = useTranslation('livestock')
  const { t: tc } = useTranslation('common')
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [splitQuantity, setSplitQuantity] = useState(1)
  const [splitStatus, setSplitStatus] = useState<'dead' | 'removed'>('dead')

  // Load thumbnail with priority: cached_photo_url > iNaturalist > FishBase
  useEffect(() => {
    const loadThumbnail = async () => {
      if (livestock.cached_photo_url) {
        setThumbnail(livestock.cached_photo_url)
        return
      }
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
      if (livestock.fishbase_species_id && livestock.type === 'fish') {
        setImageLoading(true)
        setImageError(false)
        try {
          const images = await livestockApi.getFishBaseSpeciesImages(livestock.fishbase_species_id)
          if (images && images.length > 0) {
            const thumbUrl = images[0].ThumbPic || images[0].Pic
            if (thumbUrl) setThumbnail(thumbUrl)
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
  }, [livestock.cached_photo_url, livestock.inaturalist_id, livestock.fishbase_species_id, livestock.type])

  const getTypeIcon = () => {
    switch (livestock.type) {
      case 'fish': return '🐠'
      case 'coral': return '🪸'
      case 'invertebrate': return '🦐'
      default: return '🐟'
    }
  }

  const isDead = livestock.status === 'dead'
  const isRemoved = livestock.status === 'removed'
  const isPast = isDead || isRemoved

  const getTypeColor = () => {
    if (isPast) return 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
    switch (livestock.type) {
      case 'fish': return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
      case 'coral': return 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30'
      case 'invertebrate': return 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30'
      default: return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
    }
  }

  const getTimeInTank = () => {
    if (!livestock.added_date) return null
    const addedDate = new Date(livestock.added_date)
    if (isPast && livestock.removed_date) {
      return formatDistance(addedDate, new Date(livestock.removed_date))
    }
    return formatDistanceToNow(addedDate, { addSuffix: false })
  }

  const hasThumbnail = livestock.cached_photo_url || livestock.inaturalist_id || livestock.fishbase_species_id
  const timeInTank = getTimeInTank()

  return (
    <div className={`rounded-lg shadow border-2 ${getTypeColor()} overflow-hidden ${isPast ? 'opacity-75' : ''} ${livestock.is_archived ? 'opacity-60' : ''}`}>
      {/* Top row: thumbnail + name + actions */}
      <div className="flex items-start p-3 gap-3">
        {/* Thumbnail - smaller */}
        {hasThumbnail ? (
          <div className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-950/30 ${isPast ? 'grayscale' : ''}`}>
            {imageLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ocean-600"></div>
              </div>
            ) : thumbnail && !imageError ? (
              <img
                src={thumbnail}
                alt={livestock.common_name || livestock.species_name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-2xl opacity-50">{getTypeIcon()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 flex-shrink-0 rounded-md flex items-center justify-center bg-white/50 dark:bg-gray-700/50">
            <span className="text-3xl">{getTypeIcon()}</span>
          </div>
        )}

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
            {livestock.common_name || livestock.species_name}
          </h3>
          {livestock.common_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{livestock.species_name}</p>
          )}
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {livestock.quantity > 1 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-ocean-100 dark:bg-ocean-900/50 text-ocean-700 dark:text-ocean-300">
                x{livestock.quantity}
              </span>
            )}
            {isDead && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                {t('status.dead')}
              </span>
            )}
            {isRemoved && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">
                {t('status.removed')}
              </span>
            )}
            {livestock.is_archived && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                {tc('archivedStatus')}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-0.5 flex-shrink-0">
          {livestock.quantity > 1 && livestock.status === 'alive' && (
            <button
              onClick={() => { setSplitQuantity(1); setSplitStatus('dead'); setShowSplitDialog(!showSplitDialog) }}
              className={`p-1 rounded ${showSplitDialog ? 'text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-900/50' : 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30'}`}
              title={t('split.title')}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          )}
          {livestock.is_archived ? (
            <button onClick={() => onUnarchive(livestock.id)} className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title={tc('actions.unarchive')}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9" />
              </svg>
            </button>
          ) : (
            <button onClick={() => onArchive(livestock.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title={tc('actions.archive')}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          )}
          <button onClick={() => onEdit(livestock)} className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title={tc('actions.edit')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(livestock.id)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title={tc('actions.delete')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Condensed info row with icons */}
      <div className="px-3 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        {/* Price with currency icon */}
        {livestock.purchase_price && (
          <span className="inline-flex items-center gap-0.5" title={livestock.quantity > 1 ? (() => {
            const unitPrice = parsePrice(livestock.purchase_price)
            return unitPrice ? `${t('card.total')}: ${(unitPrice * livestock.quantity).toFixed(2)}` : ''
          })() : ''}>
            <span className="text-gray-400">💰</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{livestock.purchase_price}</span>
            {livestock.quantity > 1 && (() => {
              const unitPrice = parsePrice(livestock.purchase_price)
              if (unitPrice) return <span className="text-gray-400">({(unitPrice * livestock.quantity).toFixed(2)})</span>
              return null
            })()}
          </span>
        )}

        {/* Time in tank with clock */}
        {timeInTank && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">🕐</span>
            <span className={`font-medium ${isPast ? 'text-gray-500 dark:text-gray-400' : 'text-green-700 dark:text-green-400'}`}>{timeInTank}</span>
          </span>
        )}

        {/* Added date */}
        {livestock.added_date && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">📅</span>
            <span>{new Date(livestock.added_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
          </span>
        )}

        {/* Death/removed date */}
        {isPast && livestock.removed_date && (
          <span className="inline-flex items-center gap-0.5">
            <span className="text-gray-400">{isDead ? '🪦' : '📦'}</span>
            <span>{new Date(livestock.removed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
          </span>
        )}

        {/* Purchase URL */}
        {livestock.purchase_url && (
          <a href={livestock.purchase_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-ocean-600 hover:text-ocean-700"
            onClick={(e) => e.stopPropagation()}>
            <span>🛒</span>
            <span className="underline">{t('card.viewStore')}</span>
          </a>
        )}
      </div>

      {/* Database links - single line */}
      {(livestock.worms_id || livestock.inaturalist_id || livestock.fishbase_species_id) && (
        <div className="px-3 pb-2 flex flex-wrap gap-2">
          {livestock.worms_id && (
            <a href={`https://www.marinespecies.org/aphia.php?p=taxdetails&id=${livestock.worms_id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[10px] text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              onClick={(e) => e.stopPropagation()}>
              WoRMS
            </a>
          )}
          {livestock.inaturalist_id && (
            <a href={`https://www.inaturalist.org/taxa/${livestock.inaturalist_id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-[10px] text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              onClick={(e) => e.stopPropagation()}>
              iNaturalist
            </a>
          )}
          {livestock.fishbase_species_id && (
            <a href={`https://www.fishbase.se/summary/${livestock.fishbase_species_id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-900/30 text-[10px] text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
              onClick={(e) => e.stopPropagation()}>
              FishBase
            </a>
          )}
        </div>
      )}

      {/* Notes - compact */}
      {livestock.notes && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 italic">{livestock.notes}</p>
        </div>
      )}

      {/* Inline Split Dialog */}
      {showSplitDialog && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border-t-2 border-amber-300 dark:border-amber-700">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('split.title')}</h4>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
            {t('split.description', { total: livestock.quantity, name: livestock.common_name || livestock.species_name })}
          </p>
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={livestock.quantity - 1} value={splitQuantity}
                onChange={(e) => setSplitQuantity(Math.max(1, Math.min(livestock.quantity - 1, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('split.remaining', { count: livestock.quantity - splitQuantity })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setSplitStatus('dead')}
              className={`px-2 py-0.5 text-[10px] rounded-md border-2 transition-colors ${splitStatus === 'dead' ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'}`}>
              {t('status.dead')}
            </button>
            <button type="button" onClick={() => setSplitStatus('removed')}
              className={`px-2 py-0.5 text-[10px] rounded-md border-2 transition-colors ${splitStatus === 'removed' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'}`}>
              {t('status.removed')}
            </button>
            <div className="flex-1" />
            <button type="button" onClick={() => setShowSplitDialog(false)}
              className="px-2 py-0.5 text-[10px] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              {tc('actions.cancel')}
            </button>
            <button type="button"
              onClick={() => { onSplit(livestock.id, splitQuantity, splitStatus); setShowSplitDialog(false) }}
              className="px-2 py-0.5 text-[10px] bg-amber-600 text-white rounded-md hover:bg-amber-700">
              {t('split.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
