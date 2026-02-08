import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { tanksApi, maintenanceApi, equipmentApi, livestockApi, photosApi, notesApi } from '../api/client'
import type { Tank, MaintenanceReminder } from '../types'

interface TankSummary {
  tank: Tank
  equipmentCount: number
  livestockCount: number
  photosCount: number
  notesCount: number
  maintenanceCount: number
  daysUp: number | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tankSummaries, setTankSummaries] = useState<TankSummary[]>([])
  const [overdueReminders, setOverdueReminders] = useState<MaintenanceReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const calculateDaysUp = (setupDate: string | null): number | null => {
    if (!setupDate) return null
    const setup = new Date(setupDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - setup.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const loadDashboardData = async () => {
    try {
      const [tanksData, remindersData] = await Promise.all([
        tanksApi.list(),
        maintenanceApi.listReminders({ overdue_only: true }),
      ])

      // Load counts for each tank
      const summaries = await Promise.all(
        tanksData.map(async (tank) => {
          const [equipment, livestock, photos, notes, maintenance] = await Promise.all([
            equipmentApi.list({ tank_id: tank.id }).catch(() => []),
            livestockApi.list({ tank_id: tank.id }).catch(() => []),
            photosApi.list({ tank_id: tank.id }).catch(() => []),
            notesApi.list({ tank_id: tank.id }).catch(() => []),
            maintenanceApi.listReminders({ tank_id: tank.id }).catch(() => []),
          ])

          return {
            tank,
            equipmentCount: equipment.length,
            livestockCount: livestock.length,
            photosCount: photos.length,
            notesCount: notes.length,
            maintenanceCount: maintenance.length,
            daysUp: calculateDaysUp(tank.setup_date),
          }
        })
      )

      setTankSummaries(summaries)
      setOverdueReminders(remindersData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your reef systems
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Tanks</div>
          <div className="text-3xl font-bold text-ocean-600 mt-2">
            {tankSummaries.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">
            Overdue Maintenance
          </div>
          <div className="text-3xl font-bold text-coral-600 mt-2">
            {overdueReminders.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">
            Quick Actions
          </div>
          <div className="mt-3 space-y-2">
            <Link
              to="/parameters"
              className="block text-sm text-ocean-600 hover:text-ocean-700"
            >
              → Log Parameters
            </Link>
            <Link
              to="/tanks"
              className="block text-sm text-ocean-600 hover:text-ocean-700"
            >
              → Manage Tanks
            </Link>
          </div>
        </div>
      </div>

      {/* Tanks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Your Tanks</h2>
            <Link
              to="/tanks/new"
              className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 text-sm"
            >
              Add Tank
            </Link>
          </div>
        </div>

        <div className="p-6">
          {tankSummaries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                You haven't added any tanks yet
              </p>
              <Link
                to="/tanks/new"
                className="inline-block px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
              >
                Add Your First Tank
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tankSummaries.map(({ tank, equipmentCount, livestockCount, photosCount, notesCount, maintenanceCount, daysUp }) => (
                <div
                  key={tank.id}
                  className="bg-white border border-gray-200 rounded-lg hover:border-ocean-500 hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Tank Header */}
                  <Link to={`/tanks/${tank.id}`} className="block p-4 border-b border-gray-100 bg-gradient-to-r from-ocean-50 to-ocean-100">
                    <h3 className="font-bold text-lg text-gray-900">{tank.name}</h3>
                    <div className="flex items-center justify-between mt-2">
                      {tank.total_volume_liters > 0 && (
                        <span className="text-sm font-medium text-ocean-700">
                          {tank.total_volume_liters}L
                        </span>
                      )}
                      {daysUp !== null && (
                        <span className="text-xs text-ocean-600 bg-white px-2 py-1 rounded-full">
                          {daysUp} days up
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Tank Stats Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/equipment"
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl">⚙️</span>
                        <div>
                          <div className="text-xs text-gray-500">Equipment</div>
                          <div className="font-semibold text-gray-900 group-hover:text-ocean-600">
                            {equipmentCount}
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/livestock"
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl">🐟</span>
                        <div>
                          <div className="text-xs text-gray-500">Livestock</div>
                          <div className="font-semibold text-gray-900 group-hover:text-ocean-600">
                            {livestockCount}
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/photos"
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl">📷</span>
                        <div>
                          <div className="text-xs text-gray-500">Photos</div>
                          <div className="font-semibold text-gray-900 group-hover:text-ocean-600">
                            {photosCount}
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/notes"
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-xl">📝</span>
                        <div>
                          <div className="text-xs text-gray-500">Notes</div>
                          <div className="font-semibold text-gray-900 group-hover:text-ocean-600">
                            {notesCount}
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Maintenance Status */}
                    <Link
                      to="/maintenance"
                      className="mt-3 flex items-center justify-between p-2 rounded bg-gray-50 hover:bg-ocean-50 transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🔧</span>
                        <span className="text-xs font-medium text-gray-700">Maintenance Tasks</span>
                      </div>
                      <span className="text-sm font-bold text-ocean-600 group-hover:text-ocean-700">
                        {maintenanceCount}
                      </span>
                    </Link>

                    {/* Setup Date */}
                    {tank.setup_date && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Setup:</span>
                          <span className="font-medium">
                            {new Date(tank.setup_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Maintenance */}
      {overdueReminders.length > 0 && (
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-coral-900 mb-4">
            Overdue Maintenance ({overdueReminders.length})
          </h2>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex justify-between items-center py-2"
              >
                <div>
                  <p className="font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-sm text-gray-600">
                    Due: {new Date(reminder.next_due).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to="/maintenance"
                  className="text-sm text-ocean-600 hover:text-ocean-700"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
