/**
 * TankSidebar Component
 *
 * Left sidebar for tank detail view showing image, info, stats, and quick actions
 */

import { Link } from 'react-router-dom'
import type { Tank } from '../../types'
import TankStats from './TankStats'

interface TankSidebarProps {
  tank: Tank
  stats?: {
    event_count?: number
    equipment_count?: number
    livestock_count?: number
    photo_count?: number
    note_count?: number
    maintenance_count?: number
    icp_test_count?: number
    tank_age_days?: number
  }
  onEdit?: () => void
  onAddEvent?: () => void
}

export default function TankSidebar({ tank, stats, onEdit, onAddEvent }: TankSidebarProps) {
  const calculateDaysUp = (setupDate: string | null): number => {
    if (!setupDate) return 0
    const setup = new Date(setupDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - setup.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUp = stats?.tank_age_days || calculateDaysUp(tank.setup_date)

  return (
    <div className="space-y-6">
      {/* Tank Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Tank Image */}
        <div className="aspect-video bg-gradient-to-br from-ocean-100 to-ocean-200 rounded-lg flex items-center justify-center overflow-hidden relative group">
          {tank.image_url ? (
            <img
              src={tank.image_url}
              alt={tank.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">🐠</span>
          )}
          {/* Upload overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white text-ocean-600 rounded-md font-medium hover:bg-ocean-50"
              onClick={() => alert('Image upload coming in Phase 5!')}
            >
              📷 Change Image
            </button>
          </div>
        </div>

        {/* Tank Name & Description */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">{tank.name}</h2>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-ocean-600 transition"
                title="Edit tank"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
          </div>
          {tank.description && (
            <p className="text-gray-600 text-sm">{tank.description}</p>
          )}
        </div>

        {/* Volume Info */}
        <div className="space-y-2 text-sm">
          {tank.display_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600">Display:</span>
              <span className="font-medium">{tank.display_volume_liters}L</span>
            </div>
          )}
          {tank.sump_volume_liters && (
            <div className="flex justify-between">
              <span className="text-gray-600">Sump:</span>
              <span className="font-medium">{tank.sump_volume_liters}L</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600 font-medium">Total:</span>
            <span className="font-bold text-ocean-600">{tank.total_volume_liters}L</span>
          </div>
        </div>

        {/* Setup Date & Days Running */}
        {tank.setup_date && (
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600">Setup Date</div>
            <div className="font-medium">
              {new Date(tank.setup_date).toLocaleDateString()}
            </div>
            {daysUp > 0 && (
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-ocean-600 text-white text-sm font-semibold rounded-full">
                  {daysUp} days running
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics Card */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Statistics
          </h3>
          <TankStats stats={stats} />
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Link
            to={`/parameters?tank=${tank.id}`}
            className="block w-full px-4 py-2 bg-ocean-600 text-white text-center rounded-md hover:bg-ocean-700 transition font-medium"
          >
            📊 Log Parameters
          </Link>
          <Link
            to="/photos"
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            📷 Upload Photo
          </Link>
          {onAddEvent && (
            <button
              onClick={onAddEvent}
              className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
            >
              📅 Add Event
            </button>
          )}
          <Link
            to={`/equipment`}
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            ⚙️ Manage Equipment
          </Link>
          <Link
            to={`/livestock`}
            className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-md hover:bg-gray-200 transition font-medium"
          >
            🐟 Manage Livestock
          </Link>
        </div>
      </div>
    </div>
  )
}
