/**
 * Lighting Page
 *
 * Manage LED lighting schedules per tank with channel-based intensity control.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lightingApi, tanksApi } from '../api'
import type { LightingSchedule, LightingScheduleCreate, LightingScheduleUpdate, LightingPreset, Tank } from '../types'
import { useAuth } from '../hooks/useAuth'
import TankSelector from '../components/common/TankSelector'
import LightingScheduleForm from '../components/lighting/LightingScheduleForm'
import LightingChart from '../components/lighting/LightingChart'

export default function Lighting() {
  const { t } = useTranslation('lighting')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [schedules, setSchedules] = useState<LightingSchedule[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [presets, setPresets] = useState<LightingPreset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<LightingSchedule | null>(null)
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [schedulesData, tanksData, presetsData] = await Promise.all([
        lightingApi.list(selectedTank ? { tank_id: selectedTank } : undefined),
        tanksApi.list(),
        lightingApi.getPresets(),
      ])
      setSchedules(schedulesData)
      setTanks(tanksData)
      setPresets(presetsData)
    } catch (error) {
      console.error('Failed to load lighting data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: LightingScheduleCreate | LightingScheduleUpdate) => {
    await lightingApi.create(data as LightingScheduleCreate)
    setShowForm(false)
    loadData()
  }

  const handleUpdate = async (id: string, data: LightingScheduleUpdate) => {
    await lightingApi.update(id, data)
    setEditingSchedule(null)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm', { defaultValue: 'Delete this lighting schedule?' }))) return
    try {
      await lightingApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete schedule:', error)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await lightingApi.activate(id)
      loadData()
    } catch (error) {
      console.error('Failed to activate schedule:', error)
    }
  }

  const handleDuplicate = async (schedule: LightingSchedule) => {
    const data: LightingScheduleCreate = {
      tank_id: schedule.tank_id,
      name: `${schedule.name} (copy)`,
      description: schedule.description,
      channels: schedule.channels,
      schedule_data: schedule.schedule_data,
      notes: schedule.notes,
    }
    await lightingApi.create(data)
    loadData()
  }

  // Filter by selected tank
  const filtered = selectedTank
    ? schedules.filter(s => s.tank_id === selectedTank)
    : schedules

  const activeSchedules = filtered.filter(s => s.is_active)
  const inactiveSchedules = filtered.filter(s => !s.is_active)

  // Tank name lookup
  const tankNameMap: Record<string, string> = {}
  tanks.forEach(t => { tankNameMap[t.id] = t.name })

  // Stats
  const tanksWithSchedules = new Set(schedules.map(s => s.tank_id)).size

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('title', { defaultValue: 'Lighting' })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle', { defaultValue: 'Manage LED lighting schedules for your tanks' })}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingSchedule(null)
          }}
          className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {showForm ? tc('actions.cancel') : t('createSchedule', { defaultValue: 'Create Schedule' })}
        </button>
      </div>

      {/* Tank Filter */}
      {tanks.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <TankSelector
            tanks={tanks}
            value={selectedTank}
            onChange={(val) => {
              setSelectedTank(val)
              lightingApi.list(val ? { tank_id: val } : undefined).then(setSchedules)
            }}
            allLabel={tc('allTanks', { defaultValue: 'All Tanks' })}
            label={t('filterByTank', { defaultValue: 'Filter by tank' })}
            defaultTankId={user?.default_tank_id || undefined}
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                {t('stats.activeSchedules', { defaultValue: 'Active Schedules' })}
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{activeSchedules.length}</p>
            </div>
            <span className="text-3xl">💡</span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {t('stats.totalSchedules', { defaultValue: 'Total Schedules' })}
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{filtered.length}</p>
            </div>
            <span className="text-3xl">📋</span>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {t('stats.tanksWithLighting', { defaultValue: 'Tanks with Lighting' })}
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{tanksWithSchedules}</p>
            </div>
            <span className="text-3xl">🐠</span>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <LightingScheduleForm
          tanks={tanks}
          presets={presets}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          defaultTankId={selectedTank || user?.default_tank_id || undefined}
        />
      )}

      {/* Edit Form */}
      {editingSchedule && (
        <LightingScheduleForm
          tanks={tanks}
          presets={presets}
          schedule={editingSchedule}
          onSubmit={(data) => handleUpdate(editingSchedule.id, data as LightingScheduleUpdate)}
          onCancel={() => setEditingSchedule(null)}
        />
      )}

      {/* Schedule Cards */}
      {schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('noSchedules', { defaultValue: 'No lighting schedules yet' })}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('noSchedulesHint', { defaultValue: 'Create a schedule or start from a preset' })}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('createSchedule', { defaultValue: 'Create Schedule' })}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Schedules */}
          {activeSchedules.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('fields.active', { defaultValue: 'Active' })} ({activeSchedules.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {activeSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    tankName={tankNameMap[schedule.tank_id] || ''}
                    onEdit={() => { setEditingSchedule(schedule); setShowForm(false) }}
                    onDelete={() => handleDelete(schedule.id)}
                    onActivate={() => handleActivate(schedule.id)}
                    onDuplicate={() => handleDuplicate(schedule)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Schedules (hidden by default) */}
          {inactiveSchedules.length > 0 && (
            <div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-4"
              >
                <svg className={`w-4 h-4 transition-transform ${showInactive ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {t('fields.inactive', { defaultValue: 'Inactive' })} ({inactiveSchedules.length})
              </button>
              {showInactive && (
                <div className="grid grid-cols-1 gap-4">
                  {inactiveSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      tankName={tankNameMap[schedule.tank_id] || ''}
                      onEdit={() => { setEditingSchedule(schedule); setShowForm(false) }}
                      onDelete={() => handleDelete(schedule.id)}
                      onActivate={() => handleActivate(schedule.id)}
                      onDuplicate={() => handleDuplicate(schedule)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Inline schedule card with mini chart */
function ScheduleCard({
  schedule,
  tankName,
  onEdit,
  onDelete,
  onActivate,
  onDuplicate,
}: {
  schedule: LightingSchedule
  tankName: string
  onEdit: () => void
  onDelete: () => void
  onActivate: () => void
  onDuplicate: () => void
}) {
  const { t } = useTranslation('lighting')

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 ${
      schedule.is_active ? 'border-yellow-400' : 'border-gray-300 dark:border-gray-600'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{schedule.name}</h3>
              {schedule.is_active && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-full">
                  {t('fields.active', { defaultValue: 'Active' })}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tankName}</p>
            {schedule.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{schedule.description}</p>
            )}
          </div>

          {/* Channel pills */}
          <div className="flex gap-1 flex-wrap justify-end">
            {schedule.channels.map((ch, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                {ch.name}
              </span>
            ))}
          </div>
        </div>

        {/* Mini chart */}
        <div className="mb-3">
          <LightingChart channels={schedule.channels} scheduleData={schedule.schedule_data} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('editSchedule', { defaultValue: 'Edit' })}
          </button>
          {!schedule.is_active && (
            <button
              onClick={onActivate}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/70"
            >
              {t('actions.activate', { defaultValue: 'Activate' })}
            </button>
          )}
          <button
            onClick={onDuplicate}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70"
          >
            {t('actions.duplicate', { defaultValue: 'Duplicate' })}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70 ml-auto"
          >
            {t('deleteSchedule', { defaultValue: 'Delete' })}
          </button>
        </div>
      </div>
    </div>
  )
}
