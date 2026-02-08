/**
 * TankOverview Component
 *
 * Shows a summary overview of the tank with recent events and quick stats
 */

import type { TankEvent, Equipment, Livestock, Photo, Note, ICPTestSummary } from '../../types'
import { Link } from 'react-router-dom'

interface TankOverviewProps {
  tankId: string
  events: TankEvent[]
  equipment: Equipment[]
  livestock: Livestock[]
  photos: Photo[]
  notes: Note[]
  icpTests: ICPTestSummary[]
}

export default function TankOverview({
  tankId,
  events,
  equipment,
  livestock,
  photos,
  notes,
  icpTests,
}: TankOverviewProps) {
  // Get recent items (last 3 of each)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .slice(0, 3)

  const recentPhotos = [...photos]
    .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
    .slice(0, 4)

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const latestICPTest = icpTests
    .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0]

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-ocean-50 to-white p-4 rounded-lg border border-ocean-100">
          <div className="text-3xl mb-2">🐟</div>
          <div className="text-2xl font-bold text-ocean-600">{livestock.length}</div>
          <div className="text-xs text-gray-600 font-medium">Livestock</div>
        </div>
        <div className="bg-gradient-to-br from-ocean-50 to-white p-4 rounded-lg border border-ocean-100">
          <div className="text-3xl mb-2">⚙️</div>
          <div className="text-2xl font-bold text-ocean-600">{equipment.length}</div>
          <div className="text-xs text-gray-600 font-medium">Equipment</div>
        </div>
        <div className="bg-gradient-to-br from-ocean-50 to-white p-4 rounded-lg border border-ocean-100">
          <div className="text-3xl mb-2">📷</div>
          <div className="text-2xl font-bold text-ocean-600">{photos.length}</div>
          <div className="text-xs text-gray-600 font-medium">Photos</div>
        </div>
        <div className="bg-gradient-to-br from-ocean-50 to-white p-4 rounded-lg border border-ocean-100">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-2xl font-bold text-ocean-600">{notes.length}</div>
          <div className="text-xs text-gray-600 font-medium">Notes</div>
        </div>
      </div>

      {/* Latest ICP Test */}
      {latestICPTest && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Latest ICP Test</h3>
            <Link
              to="/icp-tests"
              className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">
                {new Date(latestICPTest.test_date).toLocaleDateString()}
              </div>
              <div className="text-lg font-semibold text-gray-900 mt-1">
                {latestICPTest.lab_name}
              </div>
            </div>
            {latestICPTest.score_overall && (
              <div className="text-right">
                <div className="text-3xl font-bold text-ocean-600">
                  {latestICPTest.score_overall}
                </div>
                <div className="text-xs text-gray-600">Overall Score</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
            <button className="text-sm text-ocean-600 hover:text-ocean-700 font-medium">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-ocean-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.event_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Photos */}
      {recentPhotos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Photos</h3>
            <Link
              to="/photos"
              className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="aspect-square bg-ocean-100 rounded-lg overflow-hidden">
                <img
                  src={photo.thumbnail_path || photo.file_path}
                  alt={photo.description || 'Tank photo'}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notes */}
      {recentNotes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Notes</h3>
            <Link
              to="/notes"
              className="text-sm text-ocean-600 hover:text-ocean-700 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentNotes.map((note) => (
              <div key={note.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="text-gray-700 text-sm line-clamp-2">{note.content}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(note.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && photos.length === 0 && notes.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <span className="text-6xl">🐠</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start building your tank's story
          </h3>
          <p className="text-gray-600 mb-6">
            Add events, photos, and notes to track your reef's progress
          </p>
        </div>
      )}
    </div>
  )
}
