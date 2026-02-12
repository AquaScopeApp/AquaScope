import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../hooks/useCurrency'
import { dashboardApi, tanksApi, maintenanceApi, adminApi } from '../api'
import { banners } from '../components/banners'
import BannerEditor from '../components/banners/BannerEditor'
import { useNotifications } from '../hooks/useNotifications'
import Sparkline from '../components/dashboard/Sparkline'
import type { MaintenanceReminder, DashboardTankSummary } from '../types'

interface TankCard {
  summary: DashboardTankSummary
  imageUrl: string | null
  daysUp: number | null
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const { bannerTheme } = useCurrency()
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const BannerComponent = banners[bannerTheme] || banners.reef
  const { isSupported: notifSupported, permission: notifPermission, requestPermission, notifyOverdue } = useNotifications()
  const [tankCards, setTankCards] = useState<TankCard[]>([])
  const [overdueReminders, setOverdueReminders] = useState<MaintenanceReminder[]>([])
  const [totalOverdue, setTotalOverdue] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(null)
  const [showBannerEditor, setShowBannerEditor] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (bannerTheme === 'custom') {
      adminApi.getBannerImageBlobUrl().then(setCustomBannerUrl).catch(() => setCustomBannerUrl(null))
    }
  }, [bannerTheme])

  const calculateDaysUp = (setupDate: string | null): number | null => {
    if (!setupDate) return null
    const setup = new Date(setupDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - setup.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const defaultImages: Record<string, string> = {
    saltwater: '/images/defaults/saltwater.png',
    freshwater: '/images/defaults/freshwater.png',
    brackish: '/images/defaults/brackish.png',
  }

  const loadDashboardData = async () => {
    try {
      const [dashData, remindersData] = await Promise.all([
        dashboardApi.getSummary(),
        maintenanceApi.listReminders({ overdue_only: true }),
      ])

      // Fetch blob URLs for tank images in parallel
      const cards: TankCard[] = await Promise.all(
        dashData.tanks.map(async (summary) => {
          const blobUrl = summary.image_url
            ? await tanksApi.getImageBlobUrl(summary.tank_id).catch(() => null)
            : null
          return {
            summary,
            imageUrl: blobUrl || defaultImages[summary.water_type || ''] || null,
            daysUp: calculateDaysUp(summary.setup_date),
          }
        })
      )

      setTankCards(cards)
      setTotalOverdue(dashData.total_overdue)
      setOverdueReminders(remindersData)

      // Browser notification for overdue maintenance
      if (remindersData.length > 0) {
        notifyOverdue(remindersData.length, remindersData.map((r) => r.title))
      }
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
      {/* Banner */}
      <div className="rounded-xl overflow-hidden shadow-lg relative group">
        {bannerTheme === 'custom' && customBannerUrl ? (
          <img
            src={customBannerUrl}
            alt="Banner"
            className="w-full h-[200px] object-cover"
          />
        ) : BannerComponent ? (
          <BannerComponent />
        ) : null}

        {/* Admin-only edit button */}
        {user?.is_admin && (
          <button
            onClick={() => setShowBannerEditor(true)}
            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            title={t('bannerEditor.editBanner')}
            aria-label={t('bannerEditor.editBanner')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {/* Welcome + Quick Stats row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('welcome', { name: user?.username })}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('stats.totalTanks')}</span>
            <span className="text-xl font-bold text-ocean-600">{tankCards.length}</span>
          </div>
          {totalOverdue > 0 && (
            <div className="bg-coral-50 dark:bg-coral-900/30 border border-coral-200 dark:border-coral-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-sm text-coral-700 dark:text-coral-400">{t('stats.overdueMaintenance')}</span>
              <span className="text-xl font-bold text-coral-600 dark:text-coral-300">{totalOverdue}</span>
            </div>
          )}
          {notifSupported && notifPermission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5"
              aria-label={t('enableNotifications', { defaultValue: 'Enable notifications' })}
              title={t('enableNotifications', { defaultValue: 'Enable notifications' })}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="hidden sm:inline">{t('enableNotifications', { defaultValue: 'Notifications' })}</span>
            </button>
          )}
          <Link
            to="/parameters"
            className="hidden md:inline-flex items-center px-3 py-2 text-sm bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
          >
            {t('quickActions.logParameters')}
          </Link>
        </div>
      </div>

      {/* Tanks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('yourTanks')}</h2>
            <button
              onClick={() => navigate('/tanks', { state: { showForm: true } })}
              className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 text-sm"
            >
              {t('addTank')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {tankCards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
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
              {tankCards.map(({ summary, imageUrl, daysUp }) => {
                const isDefault = summary.is_default
                return (
                <div
                  key={summary.tank_id}
                  className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-ocean-500 hover:shadow-xl transition-all overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left Section - Tank Info with background image */}
                    <div className={`relative p-6 md:w-64 min-h-[140px] flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 overflow-hidden ${
                      imageUrl
                        ? 'bg-gray-900'
                        : summary.water_type === 'freshwater' ? 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:via-emerald-950/30 dark:to-emerald-900/40' :
                          summary.water_type === 'brackish' ? 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-50 dark:from-teal-900/40 dark:via-teal-950/30 dark:to-teal-900/40' :
                          'bg-gradient-to-br from-ocean-50 via-ocean-100 to-ocean-50 dark:from-ocean-900/40 dark:via-ocean-950/30 dark:to-ocean-900/40'
                    }`}>
                      {/* Background tank image */}
                      {imageUrl && (
                        <>
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                        </>
                      )}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between">
                          <Link to={`/tanks/${summary.tank_id}`} className="group flex-1">
                            <h3 className={`font-bold text-xl transition-colors ${
                              imageUrl
                                ? 'text-white group-hover:text-ocean-300 drop-shadow-md'
                                : 'text-gray-900 dark:text-gray-100 group-hover:text-ocean-600'
                            }`}>
                              {summary.tank_name}
                            </h3>
                          </Link>
                          {/* Default star */}
                          <button
                            onClick={() => handleSetDefault(summary.tank_id)}
                            className={`ml-2 p-1 rounded-md transition-colors flex-shrink-0 ${
                              isDefault
                                ? 'text-yellow-400 hover:text-yellow-500'
                                : imageUrl
                                  ? 'text-white/60 hover:text-yellow-400'
                                  : 'text-gray-300 hover:text-yellow-400'
                            }`}
                            title={isDefault ? t('defaultTank') : t('setDefault')}
                            aria-label={isDefault ? t('defaultTank') : t('setDefault')}
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isDefault ? 'currentColor' : 'none'} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </div>
                        {(summary.water_type || summary.aquarium_subtype || summary.total_volume_liters > 0) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {summary.water_type && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                summary.water_type === 'freshwater' ? 'bg-emerald-200 text-emerald-800' :
                                summary.water_type === 'brackish' ? 'bg-teal-200 text-teal-800' :
                                'bg-blue-200 text-blue-800'
                              }`}>
                                {summary.water_type === 'freshwater' ? '🌿' : summary.water_type === 'brackish' ? '🌊' : '🪸'}{' '}
                                {summary.water_type?.charAt(0).toUpperCase()}{summary.water_type?.slice(1)}
                              </span>
                            )}
                            {summary.aquarium_subtype && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                imageUrl
                                  ? 'bg-black/40 text-white/90 backdrop-blur-sm'
                                  : 'bg-white/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400'
                              }`}>
                                {summary.aquarium_subtype.replace(/_/g, ' ')}
                              </span>
                            )}
                            {summary.total_volume_liters > 0 && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                imageUrl
                                  ? 'bg-black/40 text-white/90 backdrop-blur-sm'
                                  : 'bg-ocean-100 text-ocean-700 dark:bg-ocean-900/50 dark:text-ocean-300'
                              }`}>
                                {summary.total_volume_liters} {t('liters')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 mt-4 space-y-2">
                        {daysUp !== null && (
                          <div className="inline-block px-3 py-1 bg-ocean-600 text-white text-sm font-semibold rounded-full">
                            {daysUp} {t('daysUp')}
                          </div>
                        )}
                        {summary.setup_date && (
                          <div className={`text-xs ${imageUrl ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>
                            {t('setup')} {new Date(summary.setup_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Stats Grid */}
                    <div className="flex-1 p-4">
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                          { to: `/equipment?tank=${summary.tank_id}`, icon: '⚙️', count: summary.equipment_count, label: t('equipment') },
                          { to: `/livestock?tank=${summary.tank_id}`, icon: '🐟', count: summary.livestock_count, label: t('livestock') },
                          { to: `/consumables?tank=${summary.tank_id}`, icon: '🧪', count: summary.consumables_count, label: t('consumables') },
                          { to: `/photos?tank=${summary.tank_id}`, icon: '📷', count: summary.photos_count, label: t('photos') },
                          { to: `/notes?tank=${summary.tank_id}`, icon: '📝', count: summary.notes_count, label: t('notes') },
                          { to: `/maintenance?tank=${summary.tank_id}`, icon: '🔧', count: summary.maintenance_count, label: t('maintenance'), coral: true },
                        ].map((stat) => (
                          <Link
                            key={stat.to}
                            to={stat.to}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-all group ${
                              stat.coral
                                ? 'hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-coral-900/30'
                                : 'hover:border-ocean-400 hover:bg-ocean-50 dark:hover:bg-ocean-900/30'
                            }`}
                          >
                            <span className="text-xl">{stat.icon}</span>
                            <div className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${stat.coral ? 'group-hover:text-coral-600' : 'group-hover:text-ocean-600'}`}>
                              {stat.count}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight">{stat.label}</div>
                          </Link>
                        ))}
                      </div>

                      {/* Sparkline - Last 7 days of key parameters */}
                      <Sparkline tankId={summary.tank_id} waterType={summary.water_type} />
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
        <div className="bg-coral-50 dark:bg-coral-900/30 border border-coral-200 dark:border-coral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-coral-900 dark:text-coral-300 mb-4">
            {t('overdueMaintenance')} ({overdueReminders.length})
          </h2>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => {
              const card = tankCards.find(c => c.summary.tank_id === reminder.tank_id)
              return (
                <div
                  key={reminder.id}
                  className="flex justify-between items-center py-3 border-b border-coral-100 dark:border-coral-800 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{reminder.title}</p>
                    {card && (
                      <p className="text-sm text-ocean-600 font-medium mt-1">
                        🏠 {t('tank')} {card.summary.tank_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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

      {/* Banner Editor Modal */}
      {showBannerEditor && (
        <BannerEditor
          isOpen={showBannerEditor}
          onClose={() => {
            setShowBannerEditor(false)
            if (bannerTheme === 'custom') {
              adminApi.getBannerImageBlobUrl().then(setCustomBannerUrl).catch(() => setCustomBannerUrl(null))
            }
          }}
          currentTheme={bannerTheme}
        />
      )}
    </div>
  )
}
