import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { tanksApi, maintenanceApi, equipmentApi, livestockApi, photosApi, notesApi, consumablesApi } from '../api'
import type { Tank, MaintenanceReminder } from '../types'

interface TankSummary {
  tank: Tank
  equipmentCount: number
  livestockCount: number
  photosCount: number
  notesCount: number
  maintenanceCount: number
  consumablesCount: number
  imageUrl: string | null
  daysUp: number | null
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
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
          const [equipment, livestock, photos, notes, maintenance, consumables, imageUrl] = await Promise.all([
            equipmentApi.list({ tank_id: tank.id }).catch(() => []),
            livestockApi.list({ tank_id: tank.id }).catch(() => []),
            photosApi.list(tank.id).catch(() => []),
            notesApi.list(tank.id).catch(() => []),
            maintenanceApi.listReminders({ tank_id: tank.id }).catch(() => []),
            consumablesApi.list({ tank_id: tank.id }).catch(() => []),
            tank.image_url ? tanksApi.getImageBlobUrl(tank.id).catch(() => null) : Promise.resolve(null),
          ])

          return {
            tank,
            equipmentCount: equipment.length,
            livestockCount: livestock.length,
            photosCount: photos.length,
            notesCount: notes.length,
            maintenanceCount: maintenance.length,
            consumablesCount: consumables.length,
            imageUrl,
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

  const handleSetDefault = async (id: string) => {
    try {
      if (user?.default_tank_id === id) {
        await tanksApi.unsetDefault(id)
      } else {
        await tanksApi.setDefault(id)
      }
      await refreshUser()
    } catch (error) {
      console.error('Failed to set default tank:', error)
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
          {t('welcome', { name: user?.username })}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">{t('stats.totalTanks')}</div>
          <div className="text-3xl font-bold text-ocean-600 mt-2">
            {tankSummaries.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">
            {t('stats.overdueMaintenance')}
          </div>
          <div className="text-3xl font-bold text-coral-600 mt-2">
            {overdueReminders.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">
            {t('quickActions')}
          </div>
          <div className="mt-3 space-y-2">
            <Link
              to="/parameters"
              className="block text-sm text-ocean-600 hover:text-ocean-700"
            >
              {t('quickActions.logParameters')}
            </Link>
            <Link
              to="/tanks"
              className="block text-sm text-ocean-600 hover:text-ocean-700"
            >
              {t('quickActions.manageTanks')}
            </Link>
          </div>
        </div>
      </div>

      {/* Tanks List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">{t('yourTanks')}</h2>
            <button
              onClick={() => navigate('/tanks', { state: { showForm: true } })}
              className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 text-sm"
            >
              {t('addTank')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {tankSummaries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                {t('noTanksYet')}
              </p>
              <button
                onClick={() => navigate('/tanks', { state: { showForm: true } })}
                className="inline-block px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
              >
                {t('addFirstTank')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tankSummaries.map(({ tank, equipmentCount, livestockCount, photosCount, notesCount, maintenanceCount, consumablesCount, imageUrl, daysUp }) => {
                const isDefault = tank.id === user?.default_tank_id
                return (
                <div
                  key={tank.id}
                  className="bg-white border-2 border-gray-200 rounded-lg hover:border-ocean-500 hover:shadow-xl transition-all overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left Section - Tank Info with background image */}
                    <div className={`relative p-6 md:w-64 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200 overflow-hidden ${
                      tank.water_type === 'freshwater' ? 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50' :
                      tank.water_type === 'brackish' ? 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-50' :
                      'bg-gradient-to-br from-ocean-50 via-ocean-100 to-ocean-50'
                    }`}>
                      {/* Background tank image with transparency */}
                      {imageUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-20"
                          style={{ backgroundImage: `url(${imageUrl})` }}
                        />
                      )}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between">
                          <Link to={`/tanks/${tank.id}`} className="group flex-1">
                            <h3 className="font-bold text-xl text-gray-900 group-hover:text-ocean-600 transition-colors">
                              {tank.name}
                            </h3>
                          </Link>
                          {/* Default star */}
                          <button
                            onClick={() => handleSetDefault(tank.id)}
                            className={`ml-2 p-1 rounded-md transition-colors flex-shrink-0 ${
                              isDefault
                                ? 'text-yellow-400 hover:text-yellow-500'
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                            title={isDefault ? t('defaultTank') : t('setDefault')}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isDefault ? 'currentColor' : 'none'} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </div>
                        {(tank.water_type || tank.aquarium_subtype) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              tank.water_type === 'freshwater' ? 'bg-emerald-200 text-emerald-800' :
                              tank.water_type === 'brackish' ? 'bg-teal-200 text-teal-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {tank.water_type === 'freshwater' ? '🌿' : tank.water_type === 'brackish' ? '🌊' : '🪸'}{' '}
                              {tank.water_type?.charAt(0).toUpperCase()}{tank.water_type?.slice(1)}
                            </span>
                            {tank.aquarium_subtype && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/70 text-gray-600 capitalize">
                                {tank.aquarium_subtype.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        )}
                        {tank.total_volume_liters > 0 && (
                          <div className="mt-2 flex items-center">
                            <span className="text-2xl font-bold text-ocean-700">
                              {tank.total_volume_liters}
                            </span>
                            <span className="ml-1 text-sm text-ocean-600 font-medium">{t('liters')}</span>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 mt-4 space-y-2">
                        {daysUp !== null && (
                          <div className="inline-block px-3 py-1 bg-ocean-600 text-white text-sm font-semibold rounded-full">
                            {daysUp} {t('daysUp')}
                          </div>
                        )}
                        {tank.setup_date && (
                          <div className="text-xs text-gray-600">
                            {t('setup')} {new Date(tank.setup_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Stats Grid */}
                    <div className="flex-1 p-6">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {/* Equipment */}
                        <Link
                          to={`/equipment?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">⚙️</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {equipmentCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('equipment')}</div>
                        </Link>

                        {/* Livestock */}
                        <Link
                          to={`/livestock?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">🐟</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {livestockCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('livestock')}</div>
                        </Link>

                        {/* Consumables */}
                        <Link
                          to={`/consumables?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">🧪</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {consumablesCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('consumables')}</div>
                        </Link>

                        {/* Photos */}
                        <Link
                          to={`/photos?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">📷</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {photosCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('photos')}</div>
                        </Link>

                        {/* Notes */}
                        <Link
                          to={`/notes?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-ocean-400 hover:bg-ocean-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">📝</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-ocean-600">
                            {notesCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('notes')}</div>
                        </Link>

                        {/* Maintenance */}
                        <Link
                          to={`/maintenance?tank=${tank.id}`}
                          className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-coral-400 hover:bg-coral-50 transition-all group"
                        >
                          <span className="text-3xl mb-2">🔧</span>
                          <div className="text-2xl font-bold text-gray-900 group-hover:text-coral-600">
                            {maintenanceCount}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">{t('maintenance')}</div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Maintenance */}
      {overdueReminders.length > 0 && (
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-coral-900 mb-4">
            {t('overdueMaintenance')} ({overdueReminders.length})
          </h2>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => {
              const tank = tankSummaries.find(s => s.tank.id === reminder.tank_id)?.tank
              return (
                <div
                  key={reminder.id}
                  className="flex justify-between items-center py-3 border-b border-coral-100 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{reminder.title}</p>
                    {tank && (
                      <p className="text-sm text-ocean-600 font-medium mt-1">
                        🏠 {t('tank')} {tank.name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {t('due')} {new Date(reminder.next_due).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to="/maintenance"
                    className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
                  >
                    {t('view')}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
