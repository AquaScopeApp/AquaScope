/**
 * Maintenance Page
 *
 * Manage recurring maintenance tasks and reminders
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { maintenanceApi, tanksApi } from '../api'
import type { MaintenanceReminder, Tank } from '../types'
import { useScrollToItem } from '../hooks/useScrollToItem'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import ReminderCard from '../components/maintenance/ReminderCard'
import ReminderForm from '../components/maintenance/ReminderForm'

export default function Maintenance() {
  const { t } = useTranslation('maintenance')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState<MaintenanceReminder | null>(null)
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  useScrollToItem(reminders)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [remindersData, tanksData] = await Promise.all([
        maintenanceApi.listReminders(),
        tanksApi.list(),
      ])
      setReminders(remindersData)
      setTanks(tanksData)
    } catch (error) {
      console.error('Failed to load maintenance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateReminder = async (data: any) => {
    await maintenanceApi.createReminder(data)
    setShowForm(false)
    loadData()
  }

  const handleUpdateReminder = async (id: string, data: any) => {
    await maintenanceApi.updateReminder(id, data)
    setEditingReminder(null)
    loadData()
  }

  const handleCompleteReminder = async (id: string) => {
    await maintenanceApi.completeReminder(id)
    loadData()
  }

  const handleDeleteReminder = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }
    try {
      await maintenanceApi.deleteReminder(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete reminder:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleEdit = (reminder: MaintenanceReminder) => {
    setEditingReminder(reminder)
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditingReminder(null)
  }

  // Filter by selected tank
  const filtered = selectedTank
    ? reminders.filter(r => r.tank_id === selectedTank)
    : reminders

  // Categorize reminders
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueReminders = filtered.filter(r => {
    const dueDate = new Date(r.next_due)
    return dueDate < today && r.is_active
  })

  const dueSoonReminders = filtered.filter(r => {
    const dueDate = new Date(r.next_due)
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff >= 0 && daysDiff <= 7 && r.is_active
  })

  const upcomingReminders = filtered.filter(r => {
    const dueDate = new Date(r.next_due)
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff > 7 && r.is_active
  })

  const inactiveReminders = filtered.filter(r => !r.is_active)

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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingReminder(null)
          }}
          className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {showForm ? tc('actions.cancel') : t('addReminder')}
        </button>
      </div>

      {/* Tank Filter */}
      {tanks.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <TankSelector
            tanks={tanks}
            value={selectedTank}
            onChange={setSelectedTank}
            allLabel={tc('allTanks', { defaultValue: 'All Tanks' })}
            label={t('filterByTank', { defaultValue: 'Filter by tank' })}
            defaultTankId={user?.default_tank_id || undefined}
          />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">{t('overdue')}</p>
              <p className="text-2xl font-bold text-red-900">{overdueReminders.length}</p>
            </div>
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">{t('dueSoon')}</p>
              <p className="text-2xl font-bold text-yellow-900">{dueSoonReminders.length}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">{t('upcoming')}</p>
              <p className="text-2xl font-bold text-green-900">{upcomingReminders.length}</p>
            </div>
            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Create Reminder Form */}
      {showForm && (
        <ReminderForm
          tanks={tanks}
          onSubmit={handleCreateReminder}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Reminder Form */}
      {editingReminder && (
        <ReminderForm
          tanks={tanks}
          reminder={editingReminder}
          onSubmit={(data) => handleUpdateReminder(editingReminder.id, data)}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Reminders Lists */}
      {reminders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noReminders')}</h3>
          <p className="text-gray-600 mb-6">
            {t('noRemindersDescription')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                {t('overdue')} ({overdueReminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overdueReminders.map((reminder) => (
                  <div key={reminder.id} id={`card-${reminder.id}`}>
                    <ReminderCard
                      reminder={reminder}
                      tanks={tanks}
                      onComplete={handleCompleteReminder}
                      onEdit={handleEdit}
                      onDelete={handleDeleteReminder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Soon */}
          {dueSoonReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-yellow-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                {t('dueSoon')} ({dueSoonReminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueSoonReminders.map((reminder) => (
                  <div key={reminder.id} id={`card-${reminder.id}`}>
                    <ReminderCard
                      reminder={reminder}
                      tanks={tanks}
                      onComplete={handleCompleteReminder}
                      onEdit={handleEdit}
                      onDelete={handleDeleteReminder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                {t('upcoming')} ({upcomingReminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} id={`card-${reminder.id}`}>
                    <ReminderCard
                      reminder={reminder}
                      tanks={tanks}
                      onComplete={handleCompleteReminder}
                      onEdit={handleEdit}
                      onDelete={handleDeleteReminder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive */}
          {inactiveReminders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-600 mb-4 flex items-center">
                <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                {t('inactive')} ({inactiveReminders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveReminders.map((reminder) => (
                  <div key={reminder.id} id={`card-${reminder.id}`}>
                    <ReminderCard
                      reminder={reminder}
                      tanks={tanks}
                      onComplete={handleCompleteReminder}
                      onEdit={handleEdit}
                      onDelete={handleDeleteReminder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
