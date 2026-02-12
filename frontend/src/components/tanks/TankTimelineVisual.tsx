/**
 * TankTimelineVisual Component
 *
 * A horizontal, zoomable SVG timeline that aggregates events from all data sources.
 * Supports drag-to-pan, zoom controls, category filtering, and click-to-inspect markers.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  addMonths,
  addWeeks,
  addDays,
  startOfMonth,
  startOfWeek,
  startOfYear,
  format,
  differenceInDays,
  differenceInMonths,
  isAfter,
  isBefore,
  subMonths,
} from 'date-fns'
import type { TimelineEntry, TimelineCategory } from '../../types'
import { getCategoryColor, groupEntriesByDate, CATEGORY_COLORS } from '../../utils/timeline'
import TimelineTooltip from './TimelineTooltip'

interface TankTimelineVisualProps {
  entries: TimelineEntry[]
  height?: number
  compact?: boolean
  hiddenCategories?: Set<TimelineCategory>
  onEntryClick?: (entry: TimelineEntry) => void
}

type ZoomLevel = 'all' | 'year' | 'quarter' | 'month'

export const CATEGORY_LABELS: Record<TimelineCategory, string> = {
  setup: 'Setup',
  event: 'Events',
  livestock: 'Livestock',
  equipment: 'Equipment',
  photo: 'Photos',
  icp_test: 'ICP Tests',
}

const PADDING_LEFT = 12
const PADDING_RIGHT = 12
const TRACK_Y_RATIO = 0.5
const MARKER_RADIUS = 7
const MARKER_RADIUS_COMPACT = 5
const AXIS_HEIGHT = 24

export default function TankTimelineVisual({
  entries,
  height = 160,
  compact = false,
  hiddenCategories: hiddenCategoriesProp,
  onEntryClick,
}: TankTimelineVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgWidth, setSvgWidth] = useState(600)

  // View window
  const [viewStart, setViewStart] = useState<Date>(new Date())
  const [viewEnd, setViewEnd] = useState<Date>(new Date())
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('all')

  // Interaction
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragViewStart, setDragViewStart] = useState<Date>(new Date())
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Category filters (use prop if provided, otherwise internal state)
  const [internalHidden, setInternalHidden] = useState<Set<TimelineCategory>>(new Set())
  const hiddenCategories = hiddenCategoriesProp ?? internalHidden

  const svgHeight = compact ? 120 : height
  const trackY = svgHeight * TRACK_Y_RATIO
  const markerR = compact ? MARKER_RADIUS_COMPACT : MARKER_RADIUS

  // Compute data range
  const dataRange = useMemo(() => {
    if (entries.length === 0) return { min: new Date(), max: new Date() }
    const dates = entries.map(e => new Date(e.date))
    const min = new Date(Math.min(...dates.map(d => d.getTime())))
    const max = new Date(Math.max(...dates.map(d => d.getTime())))
    return { min, max }
  }, [entries])

  // Initialize view window
  useEffect(() => {
    if (entries.length === 0) return
    const paddedMin = addDays(dataRange.min, -14)
    const paddedMax = addDays(new Date(), 14)
    setViewStart(paddedMin)
    setViewEnd(paddedMax)
    setZoomLevel('all')
  }, [entries.length, dataRange.min])

  // Observe container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((_entries) => {
      setSvgWidth(_entries[0].contentRect.width)
    })
    observer.observe(el)
    setSvgWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Filter visible entries
  const visibleEntries = useMemo(() => {
    return entries.filter(e => !hiddenCategories.has(e.category))
  }, [entries, hiddenCategories])

  // Group for clustering
  const grouped = useMemo(() => groupEntriesByDate(visibleEntries), [visibleEntries])

  // Position helpers
  const dateToX = useCallback((date: Date): number => {
    const totalMs = viewEnd.getTime() - viewStart.getTime()
    if (totalMs <= 0) return PADDING_LEFT
    const offsetMs = date.getTime() - viewStart.getTime()
    const usableWidth = svgWidth - PADDING_LEFT - PADDING_RIGHT
    return PADDING_LEFT + (offsetMs / totalMs) * usableWidth
  }, [viewStart, viewEnd, svgWidth])

  // Generate axis ticks
  const ticks = useMemo(() => {
    const result: { x: number; label: string; minor: boolean }[] = []
    const totalDays = differenceInDays(viewEnd, viewStart)
    const totalMonths = differenceInMonths(viewEnd, viewStart)

    if (totalMonths > 18) {
      // Year ticks
      let year = viewStart.getFullYear()
      while (year <= viewEnd.getFullYear() + 1) {
        const d = startOfYear(new Date(year, 0, 1))
        if (!isBefore(d, viewStart) && !isAfter(d, viewEnd)) {
          result.push({ x: dateToX(d), label: String(year), minor: false })
        }
        year++
      }
      // Month minor ticks
      let monthCur = startOfMonth(viewStart)
      while (!isAfter(monthCur, viewEnd)) {
        if (monthCur.getMonth() !== 0) {
          result.push({ x: dateToX(monthCur), label: '', minor: true })
        }
        monthCur = addMonths(monthCur, 1)
      }
    } else if (totalDays > 90) {
      // Month ticks
      let cur = startOfMonth(viewStart)
      while (!isAfter(cur, viewEnd)) {
        if (!isBefore(cur, viewStart)) {
          result.push({ x: dateToX(cur), label: format(cur, 'MMM yyyy'), minor: false })
        }
        cur = addMonths(cur, 1)
      }
    } else if (totalDays > 28) {
      // Week ticks
      let cur = startOfWeek(viewStart, { weekStartsOn: 1 })
      while (!isAfter(cur, viewEnd)) {
        if (!isBefore(cur, viewStart)) {
          result.push({ x: dateToX(cur), label: format(cur, 'MMM d'), minor: false })
        }
        cur = addWeeks(cur, 1)
      }
    } else {
      // Day ticks
      let cur = new Date(viewStart)
      cur.setHours(0, 0, 0, 0)
      while (!isAfter(cur, viewEnd)) {
        if (!isBefore(cur, viewStart)) {
          result.push({ x: dateToX(cur), label: format(cur, 'MMM d'), minor: differenceInDays(viewEnd, viewStart) > 14 })
        }
        cur = addDays(cur, 1)
      }
    }

    return result
  }, [viewStart, viewEnd, dateToX])

  // Today marker
  const todayX = dateToX(new Date())
  const showToday = todayX >= PADDING_LEFT && todayX <= svgWidth - PADDING_RIGHT

  // Zoom handlers
  const handleZoom = (level: ZoomLevel) => {
    setZoomLevel(level)
    setSelectedEntry(null)
    setTooltipPos(null)

    if (level === 'all') {
      setViewStart(addDays(dataRange.min, -14))
      setViewEnd(addDays(new Date(), 14))
    } else {
      const now = new Date()
      if (level === 'year') {
        setViewStart(subMonths(now, 12))
        setViewEnd(addDays(now, 14))
      } else if (level === 'quarter') {
        setViewStart(subMonths(now, 3))
        setViewEnd(addDays(now, 7))
      } else if (level === 'month') {
        setViewStart(subMonths(now, 1))
        setViewEnd(addDays(now, 3))
      }
    }
  }

  // Drag pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragViewStart(viewStart)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartX
    const totalMs = viewEnd.getTime() - viewStart.getTime()
    const usableWidth = svgWidth - PADDING_LEFT - PADDING_RIGHT
    const msPerPx = totalMs / usableWidth
    const shiftMs = -dx * msPerPx
    const newStart = new Date(dragViewStart.getTime() + shiftMs)
    const newEnd = new Date(newStart.getTime() + totalMs)
    setViewStart(newStart)
    setViewEnd(newEnd)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const totalMs = viewEnd.getTime() - viewStart.getTime()
    const factor = e.deltaY > 0 ? 1.15 : 0.87
    const newTotalMs = Math.max(7 * 86400000, Math.min(totalMs * factor, 10 * 365 * 86400000))

    // Zoom centered on cursor
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cursorRatio = (e.clientX - rect.left - PADDING_LEFT) / (svgWidth - PADDING_LEFT - PADDING_RIGHT)
    const cursorTime = viewStart.getTime() + totalMs * cursorRatio
    const newStart = new Date(cursorTime - newTotalMs * cursorRatio)
    const newEnd = new Date(cursorTime + newTotalMs * (1 - cursorRatio))
    setViewStart(newStart)
    setViewEnd(newEnd)
    setZoomLevel('all') // Free zoom
  }, [viewStart, viewEnd, svgWidth])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Marker click
  const handleMarkerClick = (entry: TimelineEntry, px: number) => {
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(null)
      setTooltipPos(null)
    } else {
      setSelectedEntry(entry)
      setTooltipPos({ x: px, y: trackY - 30 })
      onEntryClick?.(entry)
    }
  }

  // Category toggle (only used when no external prop)
  const toggleCategory = (cat: TimelineCategory) => {
    setInternalHidden(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  // Active categories from data
  const activeCategories = useMemo(() => {
    const cats = new Set<TimelineCategory>()
    entries.forEach(e => cats.add(e.category))
    return cats
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 mb-3 text-4xl">📅</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">No events to display on the timeline</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {/* Zoom buttons */}
        <div className="flex items-center gap-1 mr-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Zoom:</span>
          {(['all', 'year', 'quarter', 'month'] as ZoomLevel[]).map(level => (
            <button
              key={level}
              onClick={() => handleZoom(level)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                zoomLevel === level
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {level === 'all' ? 'All' : level === 'year' ? '1Y' : level === 'quarter' ? '3M' : '1M'}
            </button>
          ))}
        </div>

        {/* Category filters only when using internal state (no external prop) */}
        {!hiddenCategoriesProp && !compact && (
          <>
            <div className="w-px h-5 bg-gray-300 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-1">
              {(Object.keys(CATEGORY_LABELS) as TimelineCategory[])
                .filter(cat => activeCategories.has(cat))
                .map(cat => {
                  const isHidden = hiddenCategories.has(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition border ${
                        isHidden
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
                          : 'text-white border-transparent'
                      }`}
                      style={!isHidden ? { backgroundColor: CATEGORY_COLORS[cat] } : undefined}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {/* SVG Timeline */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={svgHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          {/* Track line */}
          <line
            x1={PADDING_LEFT}
            y1={trackY}
            x2={svgWidth - PADDING_RIGHT}
            y2={trackY}
            stroke="#e5e7eb"
            strokeWidth={2}
          />

          {/* Axis ticks */}
          {ticks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={svgHeight - AXIS_HEIGHT}
                x2={tick.x}
                y2={svgHeight - AXIS_HEIGHT + (tick.minor ? 4 : 8)}
                stroke={tick.minor ? '#d1d5db' : '#9ca3af'}
                strokeWidth={1}
              />
              {!tick.minor && tick.label && (
                <text
                  x={tick.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                >
                  {tick.label}
                </text>
              )}
              {/* Faint vertical guide */}
              {!tick.minor && (
                <line
                  x1={tick.x}
                  y1={8}
                  x2={tick.x}
                  y2={svgHeight - AXIS_HEIGHT}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
              )}
            </g>
          ))}

          {/* Today marker */}
          {showToday && (
            <g>
              <line
                x1={todayX}
                y1={8}
                x2={todayX}
                y2={svgHeight - AXIS_HEIGHT}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={todayX}
                y={6}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={9}
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
              >
                Today
              </text>
            </g>
          )}

          {/* Event markers */}
          {Array.from(grouped.entries()).map(([dateKey, group]) => {
            const d = new Date(dateKey + 'T12:00:00')
            const x = dateToX(d)

            // Skip if off-screen
            if (x < PADDING_LEFT - 20 || x > svgWidth - PADDING_RIGHT + 20) return null

            if (group.length === 1) {
              const entry = group[0]
              const color = getCategoryColor(entry.category, entry.eventType)
              const isSelected = selectedEntry?.id === entry.id
              return (
                <g
                  key={entry.id}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleMarkerClick(entry, x) }}
                >
                  <circle
                    cx={x}
                    cy={trackY}
                    r={isSelected ? markerR + 3 : markerR}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                    opacity={isSelected ? 1 : 0.9}
                  />
                  {entry.category === 'setup' && (
                    <circle
                      cx={x}
                      cy={trackY}
                      r={markerR + 5}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  )}
                </g>
              )
            }

            // Cluster: multiple events on same day
            const primaryEntry = group[0]
            const isSelected = group.some(e => selectedEntry?.id === e.id)
            return (
              <g
                key={dateKey}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); handleMarkerClick(primaryEntry, x) }}
              >
                {/* Stacked colored dots */}
                {group.slice(0, 3).map((entry, i) => {
                  const color = getCategoryColor(entry.category, entry.eventType)
                  return (
                    <circle
                      key={entry.id}
                      cx={x + (i - 1) * 4}
                      cy={trackY - (i * 3)}
                      r={markerR - 1}
                      fill={color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  )
                })}
                {/* Count badge */}
                <rect
                  x={x - 8}
                  y={trackY - markerR - 16}
                  width={16}
                  height={14}
                  rx={7}
                  fill={isSelected ? '#374151' : '#6b7280'}
                />
                <text
                  x={x}
                  y={trackY - markerR - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="system-ui, sans-serif"
                >
                  {group.length}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Tooltip overlay */}
        {selectedEntry && tooltipPos && (
          <TimelineTooltip
            entry={selectedEntry}
            x={tooltipPos.x}
            y={tooltipPos.y}
            containerWidth={svgWidth}
            onClose={() => { setSelectedEntry(null); setTooltipPos(null) }}
          />
        )}
      </div>

      {/* Legend (compact only shows entry count) */}
      {compact && (
        <div className="px-4 py-1.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {visibleEntries.length} event{visibleEntries.length !== 1 ? 's' : ''} across{' '}
            {activeCategories.size} categor{activeCategories.size !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}
    </div>
  )
}
