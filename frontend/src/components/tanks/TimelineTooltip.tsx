/**
 * TimelineTooltip Component
 *
 * Popover shown when clicking a timeline marker, displaying event details.
 */

import { useEffect, useRef } from 'react'
import type { TimelineEntry } from '../../types'
import { getCategoryColor } from '../../utils/timeline'

interface TimelineTooltipProps {
  entry: TimelineEntry
  x: number
  y: number
  containerWidth: number
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Setup',
  event: 'Event',
  livestock: 'Livestock',
  equipment: 'Equipment',
  photo: 'Photo',
  icp_test: 'ICP Test',
}

export default function TimelineTooltip({ entry, x, y, containerWidth, onClose }: TimelineTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Position tooltip: flip left if near right edge
  const tooltipWidth = 260
  const flipLeft = x + tooltipWidth + 16 > containerWidth
  const left = flipLeft ? x - tooltipWidth - 8 : x + 8
  const top = y - 8

  const color = getCategoryColor(entry.category, entry.eventType)

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4"
      style={{
        left: Math.max(4, left),
        top: Math.max(4, top),
        width: tooltipWidth,
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
      >
        &times;
      </button>

      {/* Icon + Title */}
      <div className="flex items-start gap-2 mb-2 pr-4">
        <span className="text-xl flex-shrink-0">{entry.icon}</span>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{entry.title}</div>
        </div>
      </div>

      {/* Date */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      {/* Category badge */}
      <div className="mb-2">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {CATEGORY_LABELS[entry.category] || entry.category}
        </span>
        {entry.eventType && entry.category === 'event' && (
          <span className="ml-1 inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {entry.eventType.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Subtitle / Description */}
      {entry.subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{entry.subtitle}</p>
      )}
    </div>
  )
}
