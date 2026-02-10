/**
 * TankDetail Page - Detailed view of a single tank
 *
 * Shows tank info, statistics, timeline, and related data in a split-view layout
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  tanksApi,
  equipmentApi,
  livestockApi,
  photosApi,
  notesApi,
  maintenanceApi,
  icpTestsApi,
} from '../api/client'
import type { Tank, TankEvent, Equipment, Livestock, Photo, Note, MaintenanceReminder, ICPTestSummary } from '../types'
import TankSidebar from '../components/tanks/TankSidebar'
import TankTabs from '../components/tanks/TankTabs'

export default function TankDetail() {
  const { tankId } = useParams<{ tankId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('tanks')

  const [tank, setTank] = useState<Tank | null>(null)
  const [events, setEvents] = useState<TankEvent[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [livestock, setLivestock] = useState<Livestock[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceReminder[]>([])
  const [icpTests, setIcpTests] = useState<ICPTestSummary[]>([])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (tankId) {
      loadAllData()
    }
  }, [tankId])

  const loadAllData = async () => {
    if (!tankId) return

    setIsLoading(true)
    try {
      // Load all data in parallel for better performance
      const [
        tankData,
        eventsData,
        equipmentData,
        livestockData,
        photosData,
        notesData,
        maintenanceData,
        icpTestsData,
      ] = await Promise.all([
        tanksApi.get(tankId),
        tanksApi.listEvents(tankId).catch(() => []),
        equipmentApi.list({ tank_id: tankId }).catch(() => []),
        livestockApi.list({ tank_id: tankId }).catch(() => []),
        photosApi.list(tankId).catch(() => []),
        notesApi.list(tankId).catch(() => []),
        maintenanceApi.listReminders({ tank_id: tankId }).catch(() => []),
        icpTestsApi.list({ tank_id: tankId }).catch(() => []),
      ])

      setTank(tankData)
      setEvents(eventsData)
      setEquipment(equipmentData)
      setLivestock(livestockData)
      setPhotos(photosData)
      setNotes(notesData)
      setMaintenance(maintenanceData)
      setIcpTests(icpTestsData)
    } catch (error) {
      console.error('Failed to load tank data:', error)
      alert('Failed to load tank. Returning to tank list.')
      navigate('/tanks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async (data: any) => {
    if (!tankId) return
    await tanksApi.createEvent(tankId, data)
  }

  const handleUpdateEvent = async (eventId: string, data: any) => {
    if (!tankId) return
    await tanksApi.updateEvent(tankId, eventId, data)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!tankId) return
    await tanksApi.deleteEvent(tankId, eventId)
  }

  const handleRefresh = () => {
    loadAllData()
  }

  // Calculate statistics from loaded data
  const stats = tank ? {
    event_count: events.length,
    equipment_count: equipment.length,
    livestock_count: livestock.length,
    photo_count: photos.length,
    note_count: notes.length,
    maintenance_count: maintenance.filter(r => r.is_active).length,
    icp_test_count: icpTests.length,
  } : undefined

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    )
  }

  if (!tank) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('tankNotFound')}</h3>
        <Link to="/tanks" className="text-ocean-600 hover:text-ocean-700">
          {t('returnToList')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tanks')}
          className="p-2 hover:bg-gray-100 rounded-md transition"
          title="Back to tanks"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tank.name}</h1>
          <p className="text-gray-600 mt-1">{t('detailsAndManagement')}</p>
        </div>
      </div>

      {/* Split view layout - Following ICPTests pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Tank Info & Quick Actions */}
        <div className="lg:col-span-1">
          <TankSidebar
            tank={tank}
            stats={stats}
            onEdit={() => alert('Edit tank functionality - to be implemented')}
            onAddEvent={() => alert('Add event - switch to Events tab')}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Right Content Area - Tabbed Data Views */}
        <div className="lg:col-span-2">
          <TankTabs
            events={events}
            equipment={equipment}
            livestock={livestock}
            photos={photos}
            notes={notes}
            maintenance={maintenance}
            icpTests={icpTests}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </div>
  )
}
