/**
 * TankTimeline Component
 *
 * Displays tank events in chronological order with CRUD functionality
 */

import { useState } from 'react'
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

export default function TankTimeline({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRefresh,
}: TankTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TankEvent | null>(null)

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

  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  const getEventIcon = (eventType: string | null) => {
    const icons: Record<string, string> = {
      setup: '🏗️',
      water_change: '💧',
      rescape: '🪨',
      equipment_added: '⚙️',
      equipment_removed: '⚙️',
      livestock_added: '🐟',
      livestock_lost: '💔',
      cleaning: '🧹',
      upgrade: '⬆️',
      issue: '⚠️',
      crash: '💥',
      milestone: '🎉',
      other: '📝',
    }
    return eventType ? icons[eventType] || '📅' : '📅'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Tank Timeline</h3>
        {!showAddForm && !editingEvent && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium transition"
          >
            + Add Event
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
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-600 mb-6">
            Start tracking important events in your tank's history
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 font-medium"
          >
            Add First Event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow relative"
            >
              {/* Timeline connector line */}
              {index < sortedEvents.length - 1 && (
                <div className="absolute left-8 top-full h-4 w-0.5 bg-ocean-200"></div>
              )}

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Event Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-ocean-100 rounded-full flex items-center justify-center text-2xl">
                    {getEventIcon(event.event_type)}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                          <span>
                            {new Date(event.event_date).toLocaleDateString('en-US', {
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
                              <span className="px-2 py-0.5 bg-ocean-100 text-ocean-700 rounded text-xs font-medium">
                                {event.event_type.replace('_', ' ')}
                              </span>
                            </>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-gray-600 text-sm whitespace-pre-wrap">
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
      )}
    </div>
  )
}
