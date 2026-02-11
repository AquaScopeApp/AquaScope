/**
 * TankSelector — reusable tank filter dropdown with thumbnail preview.
 *
 * Shows a standard <select> for tank choice plus a small thumbnail
 * of the selected tank's image next to it. When no custom image exists,
 * uses the default water-type image as fallback.
 */

import { useState, useEffect } from 'react'
import { tanksApi } from '../../api'
import type { Tank } from '../../types'

interface TankSelectorProps {
  tanks: Tank[]
  value: string            // '' or 'all' = no specific tank selected
  onChange: (value: string) => void
  allLabel: string         // e.g. "All Tanks" — translated by the caller
  label?: string           // e.g. "Filter by tank" — optional label above
  className?: string       // extra wrapper classes
  showAllOption?: boolean  // default true — show "All Tanks" option
}

const DEFAULT_IMAGES: Record<string, string> = {
  saltwater: '/images/defaults/saltwater.png',
  freshwater: '/images/defaults/freshwater.png',
  brackish: '/images/defaults/brackish.png',
}

export default function TankSelector({
  tanks,
  value,
  onChange,
  allLabel,
  label,
  className = '',
  showAllOption = true,
}: TankSelectorProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  // Resolve which tank is currently selected (ignoring 'all' / '')
  const selectedTank = tanks.find(t => t.id === value) || null

  // Load the thumbnail blob URL when the selected tank changes
  useEffect(() => {
    let cancelled = false
    let blobUrl: string | null = null

    if (selectedTank?.image_url) {
      tanksApi.getImageBlobUrl(selectedTank.id)
        .then(url => {
          if (!cancelled) {
            blobUrl = url
            setThumbUrl(url)
          } else {
            URL.revokeObjectURL(url)
          }
        })
        .catch(() => {
          if (!cancelled) setThumbUrl(null)
        })
    } else {
      setThumbUrl(null)
    }

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [selectedTank?.id, selectedTank?.image_url])

  // Thumbnail source: custom image blob URL or default water-type image
  const imgSrc = selectedTank
    ? thumbUrl || DEFAULT_IMAGES[selectedTank.water_type] || DEFAULT_IMAGES.saltwater
    : null

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
        >
          {showAllOption && <option value="">{allLabel}</option>}
          {tanks.map(tank => (
            <option key={tank.id} value={tank.id}>
              {tank.name}{tank.total_volume_liters > 0 ? ` (${tank.total_volume_liters}L)` : ''}
            </option>
          ))}
        </select>

        {/* Tank thumbnail */}
        {selectedTank && imgSrc && (
          <img
            src={imgSrc}
            alt={selectedTank.name}
            className="w-10 h-10 rounded-md object-cover border border-gray-200 shadow-sm flex-shrink-0"
          />
        )}
      </div>
    </div>
  )
}
