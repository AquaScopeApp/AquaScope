/**
 * Livestock Card Component
 *
 * Displays livestock information in a card layout with FishBase thumbnail
 */

import { useState, useEffect } from 'react'
import { Livestock, Tank } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import { livestockApi } from '../../api/client'

interface LivestockCardProps {
  livestock: Livestock
  tanks: Tank[]
  onEdit: (livestock: Livestock) => void
  onDelete: (id: string) => void
}

export default function LivestockCard({
  livestock,
  tanks,
  onEdit,
  onDelete,
}: LivestockCardProps) {
  const tank = tanks.find((t) => t.id === livestock.tank_id)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Load thumbnail from FishBase if species_id exists
  useEffect(() => {
    const loadThumbnail = async () => {
      if (livestock.fishbase_species_id && livestock.type === 'fish') {
        setImageLoading(true)
        setImageError(false)
        try {
          const images = await livestockApi.getFishBaseSpeciesImages(
            livestock.fishbase_species_id
          )
          if (images && images.length > 0) {
            // Get the first thumbnail
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
  }, [livestock.fishbase_species_id, livestock.type])

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

  const getTypeColor = () => {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const age = getAge()

  return (
    <div className={`rounded-lg shadow border-2 ${getTypeColor()} overflow-hidden`}>
      {/* Thumbnail Image - Only for fish with FishBase data */}
      {livestock.type === 'fish' && livestock.fishbase_species_id && (
        <div className="h-40 bg-gradient-to-b from-blue-100 to-blue-50 relative">
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
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Only show icon if no thumbnail */}
            {!(livestock.type === 'fish' && livestock.fishbase_species_id && thumbnail && !imageError) && (
              <span className="text-3xl">{getTypeIcon()}</span>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {livestock.common_name || livestock.species_name}
              </h3>
              {livestock.common_name && (
                <p className="text-sm text-gray-600 italic truncate">
                  {livestock.species_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-1 ml-2">
            <button
              onClick={() => onEdit(livestock)}
              className="p-1 text-gray-600 hover:bg-gray-200 rounded"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(livestock.id)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Remove"
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
          <span className="text-gray-600">Tank</span>
          <span className="font-medium text-gray-900">{tank?.name || 'Unknown'}</span>
        </div>

        {/* Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Type</span>
          <span className="font-medium text-gray-900 capitalize">{livestock.type}</span>
        </div>

        {/* Added Date */}
        {livestock.added_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Added</span>
            <span className="text-gray-900">
              {formatDate(livestock.added_date)}
              {age && <span className="text-gray-500 ml-1">({age} ago)</span>}
            </span>
          </div>
        )}

        {/* FishBase Link */}
        {livestock.fishbase_species_id && (
          <div className="pt-2 border-t border-gray-200">
            <a
              href={`https://www.fishbase.se/summary/${livestock.fishbase_species_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ocean-600 hover:text-ocean-700 flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View on FishBase
            </a>
          </div>
        )}

        {/* Notes */}
        {livestock.notes && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 line-clamp-3">{livestock.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
