/**
 * TankList Page - Grid view of all tanks
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { tanksApi } from '../api/client'
import type { Tank } from '../types'
import TankCard from '../components/tanks/TankCard'
import TankForm from '../components/tanks/TankForm'

export default function TankList() {
  const { t } = useTranslation('tanks')
  const { t: tc } = useTranslation('common')
  const location = useLocation()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTank, setEditingTank] = useState<Tank | null>(null)

  useEffect(() => {
    loadTanks()
  }, [])

  // Auto-show form when navigated from Dashboard with showForm state
  useEffect(() => {
    if ((location.state as any)?.showForm) {
      setShowForm(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const loadTanks = async () => {
    setIsLoading(true)
    try {
      const data = await tanksApi.list()
      setTanks(data)
    } catch (error) {
      console.error('Failed to load tanks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTank = async (data: any) => {
    await tanksApi.create(data)
    setShowForm(false)
    loadTanks()
  }

  const handleUpdateTank = async (id: string, data: any) => {
    await tanksApi.update(id, data)
    setEditingTank(null)
    loadTanks()
  }

  const handleDeleteTank = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      await tanksApi.delete(id)
      loadTanks()
    } catch (error) {
      console.error('Failed to delete tank:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleEdit = (tank: Tank) => {
    setEditingTank(tank)
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditingTank(null)
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('myTanks')}</h1>
          <p className="text-gray-600 mt-1">
            {t('manageSystems')}
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingTank(null)
          }}
          className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {showForm ? tc('actions.cancel') : t('addTank')}
        </button>
      </div>

      {/* Create Tank Form */}
      {showForm && (
        <TankForm
          onSubmit={handleCreateTank}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Tank Form */}
      {editingTank && (
        <TankForm
          tank={editingTank}
          onSubmit={(data) => handleUpdateTank(editingTank.id, data)}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Tanks Grid */}
      {tanks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noTanksYet')}</h3>
          <p className="text-gray-600 mb-6">
            {t('getStarted')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('addFirstTank')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tanks.map((tank) => (
            <TankCard
              key={tank.id}
              tank={tank}
              onEdit={handleEdit}
              onDelete={handleDeleteTank}
            />
          ))}
        </div>
      )}
    </div>
  )
}
