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
            photosApi.list(tank.id).catch(() => []),
            notesApi.list(tank.id).catch(() => []),
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
            <div className="space-y-4">
              {tankSummaries.map(({ tank, equipmentCount, livestockCount, photosCount, notesCount, maintenanceCount, daysUp }) => (
                <div
                  key={tank.id}
                  className="bg-white border-2 border-gray-200 rounded-lg hover:border-ocean-500 hover:shadow-xl transition-all overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left Section - Tank Info */}
                    <div className="bg-gradient-to-br from-ocean-50 via-ocean-100 to-ocean-50 p-6 md:w-64 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200">
                      <div>
                        <Link to={`/tanks/${tank.id}`} className="group">
                          <h3 className="font-bold text-xl text-gray-900 group-hover:text-ocean-600 transition-colors">
                            {tank.name}
                          </h3>
                        </Link>
                        {tank.total_volume_liters > 0 && (
                          <div className="mt-2 flex items-center">
                            <span className="text-2xl font-bold text-ocean-700">
                              {tank.total_volume_liters}
                            </span>
                            <span className="ml-1 text-sm text-ocean-600 font-medium">Liters</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {daysUp !== null && (
                          <div className="inline-block px-3 py-1 bg-ocean-600 text-white text-sm font-semibold rounded-full">
                            {daysUp} days up
                          </div>
                        )}
                        {tank.setup_date && (
                          <div className="text-xs text-gray-600">
                            Setup: {new Date(tank.setup_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Stats Grid */}
                    <div className="flex-1 p-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Equipment */}
                        <Link
                          to="/equipment"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">⚙️</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {equipmentCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Equipment</div>
                        </Link>

                        {/* Livestock */}
                        <Link
                          to="/livestock"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">🐟</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {livestockCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Livestock</div>
                        </Link>

                        {/* Photos */}
                        <Link
                          to="/photos"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">📷</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {photosCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Photos</div>
                        </Link>

                        {/* Notes */}
                        <Link
                          to="/notes"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">📝</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {notesCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Notes</div>
                        </Link>

                        {/* Maintenance */}
                        <Link
                          to="/maintenance"
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-coral-400 hover:bg-coral-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">🔧</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-coral-600">
                            {maintenanceCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">Maintenance</div>
                        </Link>
                      </div>
                    </div>
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
