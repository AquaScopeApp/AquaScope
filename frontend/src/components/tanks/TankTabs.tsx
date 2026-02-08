/**
 * TankTabs Component
 *
 * Tabbed interface for viewing tank-specific data (events, equipment, livestock, etc.)
 */

import { useState } from 'react'
import type { TankEvent, Equipment, Livestock, Photo, Note, MaintenanceReminder, ICPTestSummary } from '../../types'
import TankOverview from './TankOverview'
import TankTimeline from './TankTimeline'

interface TankTabsProps {
  tankId: string
  events: TankEvent[]
  equipment: Equipment[]
  livestock: Livestock[]
  photos: Photo[]
  notes: Note[]
  maintenance: MaintenanceReminder[]
  icpTests: ICPTestSummary[]
  onCreateEvent: (data: any) => Promise<void>
  onUpdateEvent: (eventId: string, data: any) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onRefresh: () => void
}

type TabId = 'overview' | 'events' | 'equipment' | 'livestock' | 'photos' | 'notes' | 'icp' | 'maintenance'

interface Tab {
  id: TabId
  label: string
  icon: string
  count?: number
}

export default function TankTabs({
  tankId,
  events,
  equipment,
  livestock,
  photos,
  notes,
  maintenance,
  icpTests,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRefresh,
}: TankTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'events', label: 'Events', icon: '📅', count: events.length },
    { id: 'equipment', label: 'Equipment', icon: '⚙️', count: equipment.length },
    { id: 'livestock', label: 'Livestock', icon: '🐟', count: livestock.length },
    { id: 'photos', label: 'Photos', icon: '📷', count: photos.length },
    { id: 'notes', label: 'Notes', icon: '📝', count: notes.length },
    { id: 'icp', label: 'ICP Tests', icon: '🔬', count: icpTests.length },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧', count: maintenance.filter(m => m.is_active).length },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <TankOverview
            tankId={tankId}
            events={events}
            equipment={equipment}
            livestock={livestock}
            photos={photos}
            notes={notes}
            icpTests={icpTests}
          />
        )

      case 'events':
        return (
          <TankTimeline
            events={events}
            onCreateEvent={onCreateEvent}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={onDeleteEvent}
            onRefresh={onRefresh}
          />
        )

      case 'equipment':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Equipment</h3>
              <span className="text-sm text-gray-500">{equipment.length} items</span>
            </div>
            {equipment.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⚙️</div>
                <p className="text-gray-600">No equipment added yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the Equipment page to add devices
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {equipment.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.equipment_type}</div>
                      {item.manufacturer && (
                        <div className="text-xs text-gray-500">{item.manufacturer}</div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'livestock':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Livestock</h3>
              <span className="text-sm text-gray-500">{livestock.length} items</span>
            </div>
            {livestock.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🐟</div>
                <p className="text-gray-600">No livestock added yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the Livestock page to add fish and corals
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {livestock.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gradient-to-br from-ocean-50 to-white rounded-lg border border-ocean-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{item.species_name}</div>
                        {item.common_name && (
                          <div className="text-sm text-gray-600">{item.common_name}</div>
                        )}
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-ocean-100 text-ocean-700 rounded text-xs font-medium">
                            {item.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl">
                        {item.type === 'fish' ? '🐠' : item.type === 'coral' ? '🪸' : '🦐'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'photos':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Photos</h3>
              <span className="text-sm text-gray-500">{photos.length} photos</span>
            </div>
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📷</div>
                <p className="text-gray-600">No photos yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the Photos page to upload images
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-ocean-100 rounded-lg overflow-hidden group relative"
                  >
                    <img
                      src={photo.thumbnail_path || photo.file_path}
                      alt={photo.description || 'Tank photo'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {photo.description && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-end p-3">
                        <p className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                          {photo.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'notes':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <span className="text-sm text-gray-500">{notes.length} notes</span>
            </div>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600">No notes yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the Notes page to add observations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="text-gray-800 whitespace-pre-wrap">{note.content}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'icp':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">ICP Tests</h3>
              <span className="text-sm text-gray-500">{icpTests.length} tests</span>
            </div>
            {icpTests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔬</div>
                <p className="text-gray-600">No ICP tests yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the ICP Tests page to upload results
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {icpTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-br from-ocean-50 to-white rounded-lg border border-ocean-100"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{test.lab_name}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(test.test_date).toLocaleDateString()}
                      </div>
                    </div>
                    {test.score_overall && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-ocean-600">
                          {test.score_overall}
                        </div>
                        <div className="text-xs text-gray-600">Score</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'maintenance':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Maintenance Reminders</h3>
              <span className="text-sm text-gray-500">
                {maintenance.filter(m => m.is_active).length} active
              </span>
            </div>
            {maintenance.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔧</div>
                <p className="text-gray-600">No maintenance reminders yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Go to the Maintenance page to set up reminders
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenance.filter(m => m.is_active).map((reminder) => {
                  const isOverdue = new Date(reminder.next_due) < new Date()
                  return (
                    <div
                      key={reminder.id}
                      className={`p-4 rounded-lg ${
                        isOverdue
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{reminder.title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Every {reminder.frequency_days} days
                          </div>
                          <div className={`text-sm mt-2 ${
                            isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                          }`}>
                            {isOverdue ? 'Overdue: ' : 'Next: '}
                            {new Date(reminder.next_due).toLocaleDateString()}
                          </div>
                        </div>
                        {isOverdue && (
                          <span className="text-red-500 text-2xl">⚠️</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-ocean-700 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  )
}
