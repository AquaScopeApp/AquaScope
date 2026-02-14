/**
 * PublicTankProfile — Public read-only view of a shared tank.
 *
 * Dark-themed standalone page (no Layout, no auth required).
 * Accessed via /share/tank/:shareToken
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { shareApi } from '../api'
import type { PublicTankProfile as ProfileData } from '../types'

export default function PublicTankProfile() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tankImageUrl, setTankImageUrl] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!shareToken) return
    const load = async () => {
      try {
        const data = await shareApi.getProfile(shareToken)
        setProfile(data)

        // Load tank image
        if (data.has_image) {
          try {
            const url = await shareApi.getTankImageBlobUrl(shareToken)
            setTankImageUrl(url)
          } catch { /* no image */ }
        }

        // Load photo thumbnails
        const urls: Record<string, string> = {}
        for (const photo of data.photos.slice(0, 12)) {
          try {
            urls[photo.id] = await shareApi.getPhotoBlobUrl(shareToken, photo.id, true)
          } catch { /* skip */ }
        }
        setPhotoUrls(urls)
      } catch {
        setError('This shared tank is no longer available.')
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => {
      if (tankImageUrl) URL.revokeObjectURL(tankImageUrl)
      Object.values(photoUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [shareToken])

  const daysRunning = profile?.setup_date
    ? Math.ceil(Math.abs(new Date().getTime() - new Date(profile.setup_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🐠</div>
          <h1 className="text-2xl font-bold mb-2">Tank Not Found</h1>
          <p className="text-gray-400">{error || 'This shared link is invalid or has been disabled.'}</p>
        </div>
      </div>
    )
  }

  const waterTypeLabel = profile.water_type === 'saltwater' ? 'Saltwater' : profile.water_type === 'freshwater' ? 'Freshwater' : 'Brackish'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
        {tankImageUrl ? (
          <img
            src={tankImageUrl}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-900 via-blue-900 to-gray-900" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />

        {/* Tank name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                profile.water_type === 'saltwater' ? 'bg-blue-500/30 text-blue-300' :
                profile.water_type === 'freshwater' ? 'bg-emerald-500/30 text-emerald-300' :
                'bg-teal-500/30 text-teal-300'
              }`}>
                {waterTypeLabel}
              </span>
              {profile.aquarium_subtype && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-300">
                  {profile.aquarium_subtype.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">{profile.name}</h1>
            {profile.description && (
              <p className="text-gray-300 mt-2 max-w-2xl">{profile.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Info Bar */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {profile.total_volume_liters > 0 && (
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2">
              <span className="text-gray-400">Volume:</span>
              <span className="font-semibold text-cyan-400">{profile.total_volume_liters}L</span>
              {profile.display_volume_liters && profile.sump_volume_liters && (
                <span className="text-gray-500 text-xs">({profile.display_volume_liters}L + {profile.sump_volume_liters}L sump)</span>
              )}
            </div>
          )}
          {profile.setup_date && (
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2">
              <span className="text-gray-400">Since:</span>
              <span className="font-medium">{new Date(profile.setup_date).toLocaleDateString()}</span>
              {daysRunning > 0 && (
                <span className="px-2 py-0.5 bg-cyan-600 text-white text-xs font-semibold rounded-full">
                  {daysRunning} days
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2">
            <span>🐟 {profile.livestock_count}</span>
            <span className="text-gray-600">·</span>
            <span>📷 {profile.photo_count}</span>
            <span className="text-gray-600">·</span>
            <span>📅 {profile.event_count}</span>
          </div>
        </div>

        {/* Refugium Info */}
        {profile.has_refugium && (
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="text-green-400">🌿</span> Refugium
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {profile.refugium_type && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">Type</div>
                  <div className="font-medium capitalize">{profile.refugium_type.replace(/_/g, ' ')}</div>
                </div>
              )}
              {profile.refugium_volume_liters && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">Volume</div>
                  <div className="font-medium">{profile.refugium_volume_liters}L</div>
                </div>
              )}
              {profile.refugium_algae && (
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-gray-500 text-xs mb-1">Algae</div>
                  <div className="font-medium">{profile.refugium_algae}</div>
                </div>
              )}
              {profile.refugium_lighting_hours != null && (
                <div>
                  <div className="text-gray-500 text-xs mb-1">Lighting</div>
                  <div className="font-medium">{profile.refugium_lighting_hours}h/day</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lighting Schedules */}
        {profile.lighting && profile.lighting.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">💡</span> Lighting
            </h2>
            <div className="space-y-4">
              {profile.lighting.map((schedule, idx) => {
                const hours = Object.keys(schedule.schedule_data).map(Number).sort((a, b) => a - b)
                const maxIntensity = Math.max(
                  ...Object.values(schedule.schedule_data).flat(),
                  1
                )
                // Find the dominant channel (highest total intensity) for bar color
                const channelTotals = schedule.channels.map((_ch: { name: string; color: string }, ci: number) =>
                  Object.values(schedule.schedule_data).reduce((sum: number, vals: number[]) => sum + (vals[ci] || 0), 0)
                )
                const dominantIdx = channelTotals.indexOf(Math.max(...channelTotals))
                const barColor = schedule.channels[dominantIdx >= 0 ? dominantIdx : 0]?.color || '#38bdf8'
                return (
                  <div key={idx} className="bg-gray-800/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold">{schedule.name}</div>
                        {schedule.description && (
                          <div className="text-sm text-gray-400 mt-0.5">{schedule.description}</div>
                        )}
                      </div>
                      {schedule.is_active && (
                        <span className="px-2 py-0.5 bg-green-600/30 text-green-400 text-xs font-semibold rounded-full">Active</span>
                      )}
                    </div>
                    {/* Mini intensity chart */}
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs text-gray-500 w-6">{hours[0]}h</span>
                      <div className="flex-1 flex items-end gap-px h-10">
                        {hours.map(h => {
                          const vals = schedule.schedule_data[String(h)]
                          const avg = vals.reduce((s: number, v: number) => s + v, 0) / vals.length
                          const pct = (avg / maxIntensity) * 100
                          return (
                            <div
                              key={h}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${Math.max(pct, 2)}%`,
                                background: `linear-gradient(to top, ${barColor}88, ${barColor}cc)`,
                              }}
                            />
                          )
                        })}
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{hours[hours.length - 1]}h</span>
                    </div>
                    {/* Channel badges */}
                    <div className="flex flex-wrap gap-2">
                      {schedule.channels.map((ch, ci) => (
                        <span key={ci} className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                          {ch.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Report Card */}
        {profile.report_card && (() => {
          const GRADE_COLORS: Record<string, string> = {
            'A+': '#10b981', 'A': '#10b981', 'A-': '#10b981',
            'B+': '#0ea5e9', 'B': '#0ea5e9', 'B-': '#0ea5e9',
            'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#f59e0b',
            'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
            'F': '#ef4444',
          }
          const rc = profile.report_card
          return (
            <div className="bg-gray-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-blue-400">{'\uD83D\uDCCB'}</span> Report Card
                </h2>
                <a
                  href={`${import.meta.env.VITE_API_URL || ''}/api/v1/share/${shareToken}/report-card/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </a>
              </div>
              {/* Grade display */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: GRADE_COLORS[rc.overall_grade] || '#9ca3af' }}>
                    {rc.overall_grade}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{rc.overall_score}/100</div>
                </div>
                <div className="flex-1 space-y-2">
                  {Object.entries(rc.categories || {}).map(([key, cat]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-24 truncate capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${cat.score}%`, backgroundColor: GRADE_COLORS[cat.grade] || '#9ca3af' }} />
                      </div>
                      <span className="text-gray-500 w-6 text-right">{cat.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Achievements */}
              {rc.achievements && rc.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-700/50">
                  {rc.achievements.map((ach: any, i: number) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">
                      {ach.icon} {ach.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Livestock Showcase — grouped by category */}
        {profile.livestock.length > 0 && (() => {
          const CATEGORIES = [
            { key: 'fish', label: 'Fish', icon: '🐟', badge: 'bg-blue-900/50 text-blue-300' },
            { key: 'coral', label: 'Corals', icon: '🪸', badge: 'bg-pink-900/50 text-pink-300' },
            { key: 'invertebrate', label: 'Invertebrates', icon: '🦐', badge: 'bg-orange-900/50 text-orange-300' },
          ]
          return (
            <div className="space-y-6">
              {CATEGORIES.map(cat => {
                const items = profile.livestock.filter(l => l.type === cat.key)
                if (items.length === 0) return null
                const totalQty = items.reduce((sum, l) => sum + l.quantity, 0)
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{cat.icon}</span>
                      <h2 className="text-lg font-bold">{cat.label}</h2>
                      <span className="text-sm text-gray-500">({totalQty})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 text-center">
                          {item.cached_photo_url ? (
                            <img
                              src={item.cached_photo_url}
                              alt={item.common_name || item.species_name}
                              className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-gray-700 flex items-center justify-center text-2xl">
                              {cat.icon}
                            </div>
                          )}
                          <div className="font-medium text-sm truncate">{item.common_name || item.species_name}</div>
                          <div className="text-xs text-gray-400 italic truncate">{item.species_name}</div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-gray-500 mt-1">×{item.quantity}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Photo Gallery */}
        {profile.photos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {profile.photos.slice(0, 12).map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-500 transition"
                  onClick={async () => {
                    if (!shareToken) return
                    try {
                      const url = await shareApi.getPhotoBlobUrl(shareToken, photo.id, false)
                      setLightboxPhoto(url)
                    } catch { /* skip */ }
                  }}
                >
                  {photoUrls[photo.id] ? (
                    <img
                      src={photoUrls[photo.id]}
                      alt={photo.description || 'Tank photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Timeline */}
        {profile.events.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Timeline</h2>
            <div className="space-y-4">
              {profile.events.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      event.event_type === 'setup' ? 'bg-green-500' :
                      event.event_type === 'crash' ? 'bg-red-500' :
                      event.event_type === 'milestone' ? 'bg-amber-500' :
                      'bg-cyan-500'
                    }`} />
                    {idx < profile.events.length - 1 && (
                      <div className="w-px flex-1 bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm font-semibold">{event.title}</div>
                    {event.description && (
                      <div className="text-sm text-gray-400 mt-0.5">{event.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.event_date).toLocaleDateString()}
                      {event.event_type && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded-full">{event.event_type}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            Powered by <span className="text-cyan-400 font-semibold">AquaScope</span>
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => {
            URL.revokeObjectURL(lightboxPhoto)
            setLightboxPhoto(null)
          }}
        >
          <img
            src={lightboxPhoto}
            alt="Full size photo"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl"
            onClick={() => {
              URL.revokeObjectURL(lightboxPhoto)
              setLightboxPhoto(null)
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
