/**
 * TankTabs Component
 *
 * Tabbed interface for viewing tank-specific data (events, equipment, livestock, etc.)
 * Cards are clickable and navigate to the full module page pre-filtered by tank.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Tank, TankEvent, Equipment, Livestock, Consumable, Photo, Note, MaintenanceReminder, ICPTestSummary, TimelineCategory } from '../../types'
import TankOverview from './TankOverview'
import TankTimeline from './TankTimeline'
import TankTimelineVisual, { CATEGORY_LABELS } from './TankTimelineVisual'
import { buildTimelineEntries, CATEGORY_COLORS } from '../../utils/timeline'
import { photosApi } from '../../api'
import Pagination from '../common/Pagination'

const ITEMS_PER_PAGE = 10
const PHOTOS_PER_PAGE = 12

// Chevron right arrow for clickable rows
const ChevronRight = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

interface TankTabsProps {
  tank: Tank
  events: TankEvent[]
  equipment: Equipment[]
  livestock: Livestock[]
  consumables: Consumable[]
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
  tank,
  events,
  equipment,
  livestock,
  consumables,
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  // Pagination state per tab
  const [equipPage, setEquipPage] = useState(1)
  const [livestockPage, setLivestockPage] = useState(1)
  const [photosPage, setPhotosPage] = useState(1)
  const [notesPage, setNotesPage] = useState(1)
  const [icpPage, setIcpPage] = useState(1)
  const [maintenancePage, setMaintenancePage] = useState(1)

  // Filter state per tab
  const [equipTypeFilter, setEquipTypeFilter] = useState('')
  const [livestockTypeFilter, setLivestockTypeFilter] = useState('')
  const [livestockStatusFilter, setLivestockStatusFilter] = useState('')

  // Shared category filter for Events tab (timeline + event list)
  const [hiddenCategories, setHiddenCategories] = useState<Set<TimelineCategory>>(new Set())

  // Category-to-eventType mapping for filtering the event list
  const CATEGORY_EVENT_TYPES: Record<string, string[]> = {
    setup: ['setup'],
    livestock: ['livestock_added', 'livestock_lost'],
    equipment: ['equipment_added', 'equipment_removed'],
    event: ['water_change', 'rescape', 'cleaning', 'upgrade', 'issue', 'crash', 'milestone', 'other'],
  }

  const toggleCategory = (cat: TimelineCategory) => {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Navigation helpers
  const tankParam = `?tank=${tank.id}`
  const TAB_ROUTES: Partial<Record<TabId, string>> = {
    equipment: `/equipment${tankParam}`,
    livestock: `/livestock${tankParam}`,
    photos: `/photos${tankParam}`,
    notes: `/notes${tankParam}`,
    icp: `/icp-tests${tankParam}`,
    maintenance: `/maintenance${tankParam}`,
  }
  const itemRoute = (tabId: TabId, itemId: string) => `${TAB_ROUTES[tabId]}&item=${itemId}`

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

  // Unique types for filter dropdowns
  const equipmentTypes = useMemo(() => [...new Set(equipment.map(e => e.equipment_type))].sort(), [equipment])
  const livestockTypes = useMemo(() => [...new Set(livestock.map(l => l.type))].sort(), [livestock])

  // Reset page when filter changes
  useEffect(() => { setEquipPage(1) }, [equipTypeFilter])
  useEffect(() => { setLivestockPage(1) }, [livestockTypeFilter, livestockStatusFilter])

  /** Shared tab header with title, count, filters, and "View all →" link */
  const TabHeader = ({ tabId, title, count, children }: { tabId: TabId; title: string; count: number; children?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="flex items-center gap-3">
        {children}
        <span className="text-sm text-gray-500 dark:text-gray-400">{count} {t('items')}</span>
        {TAB_ROUTES[tabId] && (
          <button
            onClick={() => navigate(TAB_ROUTES[tabId]!)}
            className="text-sm text-ocean-600 hover:text-ocean-700 font-medium whitespace-nowrap"
          >
            {t('viewAll', { defaultValue: 'View all' })} →
          </button>
        )}
      </div>
    </div>
  )

  /** Shared empty state */
  const EmptyState = ({ icon, messageKey, goToKey }: { icon: string; messageKey: string; goToKey: string }) => (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-gray-600 dark:text-gray-400">{t(messageKey)}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t(goToKey)}</p>
    </div>
  )

  /** Shared row style for uniform cards */
  const ROW_CLASS = 'flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors'

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <TankOverview
            tank={tank}
            events={events}
            equipment={equipment}
            livestock={livestock}
            consumables={consumables}
            photos={photos}
            notes={notes}
            icpTests={icpTests}
          />
        )

      case 'events': {
        const timelineEntries = buildTimelineEntries(tank, events, livestock, equipment, photos, icpTests)
        const activeCategories = new Set<TimelineCategory>(timelineEntries.map(e => e.category))

        // Filter events based on hidden categories
        const hiddenEventTypes = new Set<string>()
        hiddenCategories.forEach(cat => {
          const types = CATEGORY_EVENT_TYPES[cat]
          if (types) types.forEach(t => hiddenEventTypes.add(t))
        })
        const filteredEvents = hiddenCategories.has('event') && !hiddenEventTypes.size
          ? events
          : events.filter(e => !e.event_type || !hiddenEventTypes.has(e.event_type))

        return (
          <div className="space-y-4">
            {/* Unified category filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as TimelineCategory[])
                .filter(cat => activeCategories.has(cat))
                .map(cat => {
                  const isHidden = hiddenCategories.has(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition border ${
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
              {hiddenCategories.size > 0 && (
                <button
                  onClick={() => setHiddenCategories(new Set())}
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition"
                >
                  Show all
                </button>
              )}
            </div>

            <TankTimelineVisual entries={timelineEntries} hiddenCategories={hiddenCategories} />
            <TankTimeline
              events={filteredEvents}
              onCreateEvent={onCreateEvent}
              onUpdateEvent={onUpdateEvent}
              onDeleteEvent={onDeleteEvent}
              onRefresh={onRefresh}
            />
          </div>
        )
      }

      case 'equipment': {
        const filteredEquip = equipTypeFilter
          ? equipment.filter(e => e.equipment_type === equipTypeFilter)
          : equipment
        const totalPages = Math.ceil(filteredEquip.length / ITEMS_PER_PAGE)
        const paged = filteredEquip.slice((equipPage - 1) * ITEMS_PER_PAGE, equipPage * ITEMS_PER_PAGE)

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="equipment" title={t('tabs.equipment')} count={filteredEquip.length}>
              {equipmentTypes.length > 1 && (
                <select
                  value={equipTypeFilter}
                  onChange={(e) => setEquipTypeFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:ring-1 focus:ring-ocean-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{tc('all', { defaultValue: 'All' })} ({equipment.length})</option>
                  {equipmentTypes.map(t => (
                    <option key={t} value={t}>{t} ({equipment.filter(e => e.equipment_type === t).length})</option>
                  ))}
                </select>
              )}
            </TabHeader>
            {filteredEquip.length === 0 ? (
              <EmptyState icon="⚙️" messageKey="emptyState.noEquipment" goToKey="emptyState.goToEquipment" />
            ) : (
              <div className="space-y-2">
                {paged.map((item) => (
                  <div
                    key={item.id}
                    className={ROW_CLASS}
                    onClick={() => navigate(itemRoute('equipment', item.id))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">⚙️</span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {item.equipment_type}{item.manufacturer ? ` · ${item.manufacturer}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.status}
                      </span>
                      <ChevronRight />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={equipPage} totalPages={totalPages} totalItems={filteredEquip.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setEquipPage} />
          </div>
        )
      }

      case 'livestock': {
        const filteredLivestock = livestock
          .filter(l => !livestockTypeFilter || l.type === livestockTypeFilter)
          .filter(l => !livestockStatusFilter || l.status === livestockStatusFilter)
        const totalPages = Math.ceil(filteredLivestock.length / ITEMS_PER_PAGE)
        const paged = filteredLivestock.slice((livestockPage - 1) * ITEMS_PER_PAGE, livestockPage * ITEMS_PER_PAGE)

        const getTypeIcon = (type: string) => {
          switch (type) {
            case 'fish': return '🐠'
            case 'coral': return '🪸'
            case 'invertebrate': return '🦐'
            default: return '🐟'
          }
        }

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="livestock" title={t('tabs.livestock')} count={filteredLivestock.length}>
              {livestockTypes.length > 1 && (
                <select
                  value={livestockTypeFilter}
                  onChange={(e) => setLivestockTypeFilter(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:ring-1 focus:ring-ocean-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">{tc('all', { defaultValue: 'All' })} ({livestock.length})</option>
                  {livestockTypes.map(t => (
                    <option key={t} value={t}>{t} ({livestock.filter(l => l.type === t).length})</option>
                  ))}
                </select>
              )}
              <select
                value={livestockStatusFilter}
                onChange={(e) => setLivestockStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:ring-1 focus:ring-ocean-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{tc('allStatus', { defaultValue: 'All Status' })}</option>
                <option value="alive">{tc('alive', { defaultValue: 'Alive' })}</option>
                <option value="dead">{tc('dead', { defaultValue: 'Dead' })}</option>
                <option value="removed">{tc('removed', { defaultValue: 'Removed' })}</option>
              </select>
            </TabHeader>
            {filteredLivestock.length === 0 ? (
              <EmptyState icon="🐟" messageKey="emptyState.noLivestock" goToKey="emptyState.goToLivestock" />
            ) : (
              <div className="space-y-2">
                {paged.map((item) => (
                  <div
                    key={item.id}
                    className={ROW_CLASS}
                    onClick={() => navigate(itemRoute('livestock', item.id))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{getTypeIcon(item.type)}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.common_name || item.species_name}
                        </div>
                        {item.common_name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic truncate">{item.species_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-ocean-100 dark:bg-ocean-900/50 text-ocean-700 dark:text-ocean-300 capitalize">
                        {item.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'alive' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                        item.status === 'dead' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {item.status}
                      </span>
                      <ChevronRight />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={livestockPage} totalPages={totalPages} totalItems={filteredLivestock.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setLivestockPage} />
          </div>
        )
      }

      case 'photos': {
        const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE)
        const paged = photos.slice((photosPage - 1) * PHOTOS_PER_PAGE, photosPage * PHOTOS_PER_PAGE)

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="photos" title={t('tabs.photos')} count={photos.length} />
            {photos.length === 0 ? (
              <EmptyState icon="📷" messageKey="emptyState.noPhotos" goToKey="emptyState.goToPhotos" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paged.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-ocean-100 rounded-lg overflow-hidden group relative flex items-center justify-center cursor-pointer"
                    onClick={() => navigate(itemRoute('photos', photo.id))}
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
            <Pagination currentPage={photosPage} totalPages={totalPages} totalItems={photos.length} itemsPerPage={PHOTOS_PER_PAGE} onPageChange={setPhotosPage} />
          </div>
        )
      }

      case 'notes': {
        const totalPages = Math.ceil(notes.length / ITEMS_PER_PAGE)
        const paged = notes.slice((notesPage - 1) * ITEMS_PER_PAGE, notesPage * ITEMS_PER_PAGE)

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="notes" title={t('tabs.notes')} count={notes.length} />
            {notes.length === 0 ? (
              <EmptyState icon="📝" messageKey="emptyState.noNotes" goToKey="emptyState.goToNotes" />
            ) : (
              <div className="space-y-2">
                {paged.map((note) => (
                  <div
                    key={note.id}
                    className={ROW_CLASS}
                    onClick={() => navigate(itemRoute('notes', note.id))}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xl flex-shrink-0">📝</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-gray-800 dark:text-gray-200 line-clamp-2">{note.content}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      <ChevronRight />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={notesPage} totalPages={totalPages} totalItems={notes.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setNotesPage} />
          </div>
        )
      }

      case 'icp': {
        const totalPages = Math.ceil(icpTests.length / ITEMS_PER_PAGE)
        const paged = icpTests.slice((icpPage - 1) * ITEMS_PER_PAGE, icpPage * ITEMS_PER_PAGE)

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="icp" title={t('tabs.icpTests')} count={icpTests.length} />
            {icpTests.length === 0 ? (
              <EmptyState icon="🔬" messageKey="emptyState.noIcpTests" goToKey="emptyState.goToIcpTests" />
            ) : (
              <div className="space-y-2">
                {paged.map((test) => (
                  <div
                    key={test.id}
                    className={ROW_CLASS}
                    onClick={() => navigate(itemRoute('icp', test.id))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">🔬</span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{test.lab_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(test.test_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {test.score_overall && (
                        <span className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-ocean-100 dark:bg-ocean-900/50 text-ocean-700 dark:text-ocean-300">
                          {test.score_overall}
                        </span>
                      )}
                      <ChevronRight />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination currentPage={icpPage} totalPages={totalPages} totalItems={icpTests.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setIcpPage} />
          </div>
        )
      }

      case 'maintenance': {
        const activeReminders = maintenance.filter(m => m.is_active)
        const totalPages = Math.ceil(activeReminders.length / ITEMS_PER_PAGE)
        const paged = activeReminders.slice((maintenancePage - 1) * ITEMS_PER_PAGE, maintenancePage * ITEMS_PER_PAGE)

        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <TabHeader tabId="maintenance" title={t('maintenance.reminders')} count={activeReminders.length} />
            {activeReminders.length === 0 ? (
              <EmptyState icon="🔧" messageKey="emptyState.noMaintenance" goToKey="emptyState.goToMaintenance" />
            ) : (
              <div className="space-y-2">
                {paged.map((reminder) => {
                  const isOverdue = new Date(reminder.next_due) < new Date()
                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        isOverdue
                          ? 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => navigate(itemRoute('maintenance', reminder.id))}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{isOverdue ? '⚠️' : '🔧'}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{reminder.title}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('maintenance.everyDays', { count: reminder.frequency_days })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isOverdue ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                        }`}>
                          {new Date(reminder.next_due).toLocaleDateString()}
                        </span>
                        <ChevronRight />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Pagination currentPage={maintenancePage} totalPages={totalPages} totalItems={activeReminders.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setMaintenancePage} />
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-ocean-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-ocean-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
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
