/**
 * TankTimeline Component
 *
 * Displays tank events in chronological order with CRUD functionality,
 * category filtering, and pagination.
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TankEvent } from '../../types'
import TankEventForm from './TankEventForm'
import { formatDistanceToNow } from 'date-fns'

interface TankTimelineProps {
  events: TankEvent[]
  onCreateEvent: (data: any) => Promise<void>
  onUpdateEvent: (eventId: string, data: any) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onRefresh: () => void
}

const PAGE_SIZE = 10

const EVENT_TYPE_META: Record<string, { icon: string; color: string }> = {
  setup:             { icon: '🏗️', color: '#0284c7' },
  water_change:      { icon: '💧', color: '#0284c7' },
  rescape:           { icon: '🪨', color: '#d97706' },
  equipment_added:   { icon: '⚙️', color: '#d97706' },
  equipment_removed: { icon: '⚙️', color: '#d97706' },
  livestock_added:   { icon: '🐟', color: '#16a34a' },
  livestock_lost:    { icon: '💔', color: '#e11d48' },
  cleaning:          { icon: '🧹', color: '#0284c7' },
  upgrade:           { icon: '⬆️', color: '#2563eb' },
  issue:             { icon: '⚠️', color: '#d97706' },
  crash:             { icon: '💥', color: '#e11d48' },
  milestone:         { icon: '🎉', color: '#16a34a' },
  other:             { icon: '📝', color: '#6b7280' },
}

function getEventIcon(eventType: string | null): string {
  return eventType ? EVENT_TYPE_META[eventType]?.icon ?? '📅' : '📅'
}

function getEventBadgeColor(eventType: string | null): string {
  return eventType ? EVENT_TYPE_META[eventType]?.color ?? '#0284c7' : '#0284c7'
}

export default function TankTimeline({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRefresh,
}: TankTimelineProps) {
  const { t } = useTranslation('tanks')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TankEvent | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const handleCreate = async (data: any) => {
    await onCreateEvent(data)
    setShowAddForm(false)
    onRefresh()
  }

  const handleUpdate = async (data: any) => {
    if (!editingEvent) return
    await onUpdateEvent(editingEvent.id, data)
    setEditingEvent(null)
    onRefresh()
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    await onDeleteEvent(eventId)
    onRefresh()
  }

  // Sort (filtering is done by parent via shared category filters)
  const sortedEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [events])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedEvents = sortedEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('tabs.events')}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({sortedEvents.length})
          </span>
        </h3>
        {!showAddForm && !editingEvent && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium transition"
          >
            + {t('actions.addEvent')}
          </button>
        )}
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <TankEventForm onSubmit={handleCreate} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Edit Event Form */}
      {editingEvent && (
        <TankEventForm
          event={editingEvent}
          onSubmit={handleUpdate}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {/* Timeline */}
      {sortedEvents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('emptyState.noEvents')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('emptyState.startStory')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium"
          >
            + {t('actions.addEvent')}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {pagedEvents.map((event, index) => (
              <div
                key={event.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow relative"
              >
                {/* Timeline connector line */}
                {index < pagedEvents.length - 1 && (
                  <div className="absolute left-8 top-full h-4 w-0.5 bg-ocean-200"></div>
                )}

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Event Icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-ocean-100 dark:bg-ocean-900/50 rounded-full flex items-center justify-center text-2xl">
                      {getEventIcon(event.event_type)}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {event.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span>
                              {new Date(event.event_date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(event.event_date), {
                                addSuffix: true,
                              })}
                            </span>
                            {event.event_type && (
                              <>
                                <span>•</span>
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ backgroundColor: getEventBadgeColor(event.event_type) }}
                                >
                                  {event.event_type.replace(/_/g, ' ')}
                                </span>
                              </>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingEvent(event)}
                            className="p-2 text-gray-400 hover:text-ocean-600 transition"
                            title="Edit event"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition"
                            title="Delete event"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md px-4 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedEvents.length)} / {sortedEvents.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  className="px-2 py-1 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  &lsaquo;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | 'gap')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1]) > 1) acc.push('gap')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, i) =>
                    item === 'gap' ? (
                      <span key={`gap-${i}`} className="px-1 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`px-2.5 py-1 rounded text-sm font-medium transition ${
                          item === safePage
                            ? 'bg-ocean-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {item}
                      </button>
                    )
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  &raquo;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
