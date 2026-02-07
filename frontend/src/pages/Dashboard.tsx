import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { tanksApi, maintenanceApi } from '../api/client'
import type { Tank, MaintenanceReminder } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [overdueReminders, setOverdueReminders] = useState<MaintenanceReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [tanksData, remindersData] = await Promise.all([
        tanksApi.list(),
        maintenanceApi.listReminders({ overdue_only: true }),
      ])
      setTanks(tanksData)
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
            {tanks.length}
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
          {tanks.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tanks.map((tank) => (
                <Link
                  key={tank.id}
                  to={`/tanks/${tank.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-ocean-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900">{tank.name}</h3>
                  {tank.total_volume_liters > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {tank.total_volume_liters}L
                    </p>
                  )}
                  {tank.setup_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Since {new Date(tank.setup_date).toLocaleDateString()}
                    </p>
                  )}
                </Link>
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
