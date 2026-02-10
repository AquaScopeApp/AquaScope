/**
 * TankTabs Component
 *
 * Tabbed interface for viewing tank-specific data (events, equipment, livestock, etc.)
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TankEvent, Equipment, Livestock, Photo, Note, MaintenanceReminder, ICPTestSummary } from '../../types'
import TankOverview from './TankOverview'
import TankTimeline from './TankTimeline'
import { photosApi, livestockApi } from '../../api/client'

interface TankTabsProps {
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
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [livestockThumbnails, setLivestockThumbnails] = useState<Record<string, string>>({})

  // Load photo thumbnails when photos change
  useEffect(() => {
    const loadPhotoThumbnails = async () => {
      const urls: Record<string, string> = {}
      for (const photo of photos) {
        try {
          urls[photo.id] = await photosApi.getFileBlobUrl(photo.id, true)
        } catch (error) {
          console.error(`Failed to load thumbnail for photo ${photo.id}:`, error)
        }
      }
      setPhotoUrls(urls)
    }

    if (photos.length > 0) {
      loadPhotoThumbnails()
    }

    // Cleanup: revoke blob URLs when component unmounts or photos change
    return () => {
      Object.values(photoUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  // Load livestock thumbnails from FishBase
  useEffect(() => {
    const loadLivestockThumbnails = async () => {
      const thumbnails: Record<string, string> = {}
      for (const item of livestock) {
        if (item.type === 'fish' && item.fishbase_species_id) {
          try {
            const images = await livestockApi.getFishBaseSpeciesImages(item.fishbase_species_id)
            if (images && images.length > 0) {
              thumbnails[item.id] = images[0].ThumbPic || images[0].Pic
            }
          } catch (error) {
            console.error(`Failed to load FishBase thumbnail for livestock ${item.id}:`, error)
          }
        }
      }
      setLivestockThumbnails(thumbnails)
    }

    if (livestock.length > 0) {
      loadLivestockThumbnails()
    }
  }, [livestock])

  const tabs: Tab[] = [
    { id: 'overview', label: t('tabs.overview'), icon: '📊' },
    { id: 'events', label: t('tabs.events'), icon: '📅', count: events.length },
    { id: 'equipment', label: t('tabs.equipment'), icon: '⚙️', count: equipment.length },
    { id: 'livestock', label: t('tabs.livestock'), icon: '🐟', count: livestock.length },
    { id: 'photos', label: t('tabs.photos'), icon: '📷', count: photos.length },
    { id: 'notes', label: t('tabs.notes'), icon: '📝', count: notes.length },
    { id: 'icp', label: t('tabs.icpTests'), icon: '🔬', count: icpTests.length },
    { id: 'maintenance', label: t('tabs.maintenance'), icon: '🔧', count: maintenance.filter(m => m.is_active).length },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <TankOverview
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
              <h3 className="text-lg font-semibold text-gray-900">{t('tabs.equipment')}</h3>
              <span className="text-sm text-gray-500">{equipment.length} {t('items')}</span>
            </div>
            {equipment.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⚙️</div>
                <p className="text-gray-600">{t('emptyState.noEquipment')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToEquipment')}
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
              <h3 className="text-lg font-semibold text-gray-900">{t('tabs.livestock')}</h3>
              <span className="text-sm text-gray-500">{livestock.length} {t('items')}</span>
            </div>
            {livestock.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🐟</div>
                <p className="text-gray-600">{t('emptyState.noLivestock')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToLivestock')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {livestock.map((item) => {
                  const thumbnail = livestockThumbnails[item.id]
                  const getIcon = () => {
                    switch (item.type) {
                      case 'fish': return '🐠'
                      case 'coral': return '🪸'
                      case 'invertebrate': return '🦐'
                      default: return '🐟'
                    }
                  }

                  return (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-ocean-50 to-white rounded-lg border border-ocean-100 overflow-hidden"
                    >
                      {/* Thumbnail if available */}
                      {thumbnail && item.type === 'fish' && (
                        <div className="h-24 bg-gradient-to-b from-blue-100 to-blue-50 flex items-center justify-center p-2">
                          <img
                            src={thumbnail}
                            alt={item.common_name || item.species_name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {item.common_name || item.species_name}
                            </div>
                            {item.common_name && (
                              <div className="text-sm text-gray-600 italic">{item.species_name}</div>
                            )}
                            <div className="mt-2">
                              <span className="inline-block px-2 py-1 bg-ocean-100 text-ocean-700 rounded text-xs font-medium capitalize">
                                {item.type}
                              </span>
                            </div>
                          </div>
                          {/* Only show emoji if no thumbnail */}
                          {!(thumbnail && item.type === 'fish') && (
                            <div className="text-2xl">{getIcon()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'photos':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('tabs.photos')}</h3>
              <span className="text-sm text-gray-500">{photos.length} {t('stats.photoCount').toLowerCase()}</span>
            </div>
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📷</div>
                <p className="text-gray-600">{t('emptyState.noPhotos')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToPhotos')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-ocean-100 rounded-lg overflow-hidden group relative flex items-center justify-center"
                  >
                    {photoUrls[photo.id] ? (
                      <>
                        <img
                          src={photoUrls[photo.id]}
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
                      </>
                    ) : (
                      <div className="text-ocean-400 text-sm">{tc('common.loading')}</div>
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
              <h3 className="text-lg font-semibold text-gray-900">{t('tabs.notes')}</h3>
              <span className="text-sm text-gray-500">{notes.length} {t('stats.noteCount').toLowerCase()}</span>
            </div>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600">{t('emptyState.noNotes')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToNotes')}
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
              <h3 className="text-lg font-semibold text-gray-900">{t('tabs.icpTests')}</h3>
              <span className="text-sm text-gray-500">{icpTests.length} {t('stats.icpTestCount').toLowerCase()}</span>
            </div>
            {icpTests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔬</div>
                <p className="text-gray-600">{t('emptyState.noIcpTests')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToIcpTests')}
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
                        <div className="text-xs text-gray-600">{t('score')}</div>
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
              <h3 className="text-lg font-semibold text-gray-900">{t('maintenance.reminders')}</h3>
              <span className="text-sm text-gray-500">
                {maintenance.filter(m => m.is_active).length} {t('maintenance.active')}
              </span>
            </div>
            {maintenance.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔧</div>
                <p className="text-gray-600">{t('emptyState.noMaintenance')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('emptyState.goToMaintenance')}
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
                            {t('maintenance.everyDays', { count: reminder.frequency_days })}
                          </div>
                          <div className={`text-sm mt-2 ${
                            isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                          }`}>
                            {isOverdue ? t('maintenance.overdue') + ' ' : t('maintenance.next') + ' '}
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
