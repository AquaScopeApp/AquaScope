/**
 * Livestock Page
 *
 * Track fish, corals, and invertebrates in your reef aquarium.
 * Separates active livestock from past (dead/removed) entries.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { livestockApi, tanksApi } from '../api'
import type { Livestock as LivestockType, Tank } from '../types'
import LivestockCard from '../components/livestock/LivestockCard'
import LivestockForm from '../components/livestock/LivestockForm'

export default function Livestock() {
  const { t } = useTranslation('livestock')
  const { t: tc } = useTranslation('common')
  const [livestock, setLivestock] = useState<LivestockType[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLivestock, setEditingLivestock] = useState<LivestockType | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'fish' | 'coral' | 'invertebrate'>('all')
  const [searchParams] = useSearchParams()
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || 'all')
  const [showPast, setShowPast] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterType, selectedTank, showArchived])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (filterType !== 'all') params.type = filterType
      if (selectedTank !== 'all') params.tank_id = selectedTank
      if (showArchived) params.include_archived = true

      const [livestockData, tanksData] = await Promise.all([
        livestockApi.list(params),
        tanksApi.list(),
      ])
      setLivestock(livestockData)
      setTanks(tanksData)
    } catch (error) {
      console.error('Failed to load livestock:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async (data: any) => {
    await livestockApi.create(data)
    setShowForm(false)
    loadData()
  }

  const handleUpdate = async (id: string, data: any) => {
    await livestockApi.update(id, data)
    setEditingLivestock(null)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }
    try {
      await livestockApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete livestock:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleEdit = (item: LivestockType) => {
    setEditingLivestock(item)
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditingLivestock(null)
  }

  const handleSplit = async (id: string, splitQuantity: number, newStatus: 'dead' | 'removed') => {
    try {
      await livestockApi.split(id, { split_quantity: splitQuantity, new_status: newStatus })
      loadData()
    } catch (error) {
      console.error('Failed to split livestock:', error)
      alert(t('split.failed'))
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm(tc('archiveConfirmation'))) return
    try {
      await livestockApi.archive(id)
      loadData()
    } catch (error) {
      console.error('Failed to archive livestock:', error)
    }
  }

  const handleUnarchive = async (id: string) => {
    try {
      await livestockApi.unarchive(id)
      loadData()
    } catch (error) {
      console.error('Failed to unarchive livestock:', error)
    }
  }

  // Separate alive from dead/removed
  const alive = livestock.filter((l) => l.status === 'alive' || !l.status)
  const past = livestock.filter((l) => l.status === 'dead' || l.status === 'removed')

  // Group alive livestock by type
  const aliveFish = alive.filter((l) => l.type === 'fish')
  const aliveCorals = alive.filter((l) => l.type === 'coral')
  const aliveInverts = alive.filter((l) => l.type === 'invertebrate')

  // Sum quantities for stats
  const sumQty = (items: LivestockType[]) => items.reduce((sum, l) => sum + (l.quantity || 1), 0)
  const totalAlive = sumQty(alive)
  const totalFish = sumQty(aliveFish)
  const totalCorals = sumQty(aliveCorals)
  const totalInverts = sumQty(aliveInverts)

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
            setShowForm(true)
            setEditingLivestock(null)
          }}
          className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {t('addLivestock')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filterByType')}
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('types.all')} ({totalAlive})
              </button>
              <button
                onClick={() => setFilterType('fish')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'fish'
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🐠 {t('types.fish')} ({totalFish})
              </button>
              <button
                onClick={() => setFilterType('coral')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'coral'
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🪸 {t('types.corals')} ({totalCorals})
              </button>
              <button
                onClick={() => setFilterType('invertebrate')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterType === 'invertebrate'
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🦐 {t('types.invertebrates')} ({totalInverts})
              </button>
            </div>
          </div>

          {/* Tank Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filterByTank')}
            </label>
            <select
              value={selectedTank}
              onChange={(e) => setSelectedTank(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="all">{t('allTanks')}</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Archive toggle */}
      <label className="inline-flex items-center cursor-pointer text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="mr-2 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
        />
        {tc('showArchivedItems')}
      </label>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">{t('types.fish')}</p>
              <p className="text-2xl font-bold text-blue-900">{totalFish}</p>
            </div>
            <span className="text-4xl animate-emoji-swim">🐠</span>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">{t('types.corals')}</p>
              <p className="text-2xl font-bold text-purple-900">{totalCorals}</p>
            </div>
            <span className="text-4xl animate-emoji-sway">🪸</span>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">{t('types.invertebrates')}</p>
              <p className="text-2xl font-bold text-orange-900">{totalInverts}</p>
            </div>
            <span className="text-4xl animate-emoji-wiggle">🦐</span>
          </div>
        </div>
      </div>

      {/* Active Livestock Lists */}
      {alive.length === 0 && past.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noLivestock')}</h3>
          <p className="text-gray-600 mb-6">
            {t('startTracking')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('addFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Livestock */}
          {alive.length === 0 && past.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">{t('noActiveLivestock')}</p>
            </div>
          ) : (
            <>
              {/* Fish */}
              {aliveFish.length > 0 && (filterType === 'all' || filterType === 'fish') && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🐠</span>
                    {t('types.fish')} ({totalFish})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aliveFish.map((item) => (
                      <LivestockCard
                        key={item.id}
                        livestock={item}
                        tanks={tanks}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSplit={handleSplit}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Corals */}
              {aliveCorals.length > 0 && (filterType === 'all' || filterType === 'coral') && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🪸</span>
                    {t('types.corals')} ({totalCorals})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aliveCorals.map((item) => (
                      <LivestockCard
                        key={item.id}
                        livestock={item}
                        tanks={tanks}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSplit={handleSplit}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Invertebrates */}
              {aliveInverts.length > 0 && (filterType === 'all' || filterType === 'invertebrate') && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">🦐</span>
                    {t('types.invertebrates')} ({totalInverts})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aliveInverts.map((item) => (
                      <LivestockCard
                        key={item.id}
                        livestock={item}
                        tanks={tanks}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSplit={handleSplit}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Past Livestock Section */}
          {past.length > 0 && filterType === 'all' && (
            <div className="border-t-2 border-gray-200 pt-6">
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${showPast ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h2 className="text-xl font-semibold">
                  {t('pastLivestock')} ({past.length})
                </h2>
                <span className="text-sm text-gray-500 font-normal">
                  - {t('deadOrRemoved')}
                </span>
              </button>

              {showPast && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {past.map((item) => (
                    <LivestockCard
                      key={item.id}
                      livestock={item}
                      tanks={tanks}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onSplit={handleSplit}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Livestock Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <LivestockForm
              tanks={tanks}
              onSubmit={handleAdd}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Livestock Modal */}
      {editingLivestock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <LivestockForm
              tanks={tanks}
              livestock={editingLivestock}
              onSubmit={(data) => handleUpdate(editingLivestock.id, data)}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}
    </div>
  )
}
