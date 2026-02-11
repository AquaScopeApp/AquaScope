/**
 * Photos Page
 *
 * Gallery view with upload, filtering, and lightbox
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Photo, Tank } from '../types'
import { photosApi, tanksApi } from '../api'
import { useScrollToItem } from '../hooks/useScrollToItem'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import PhotoGallery from '../components/photos/PhotoGallery'
import PhotoUpload from '../components/photos/PhotoUpload'

export default function Photos() {
  const { t } = useTranslation('photos')
  const { user } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [searchParams] = useSearchParams()
  const [selectedTankId, setSelectedTankId] = useState<string>(searchParams.get('tank') || '')
  useScrollToItem(photos)

  useEffect(() => {
    loadData()
  }, [selectedTankId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [photosData, tanksData] = await Promise.all([
        photosApi.list(selectedTankId || undefined),
        tanksApi.list(),
      ])
      setPhotos(photosData)
      setTanks(tanksData)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadSuccess = () => {
    setShowUpload(false)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      await photosApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete photo:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleUpdate = async (id: string, description: string, takenAt: string) => {
    try {
      const data: { description?: string | null; taken_at?: string } = {
        description: description || null,
      }
      // Only include taken_at if provided (column is NOT NULL in DB)
      if (takenAt) {
        data.taken_at = takenAt
      }
      await photosApi.update(id, data)
      loadData()
    } catch (error) {
      console.error('Failed to update photo:', error)
      alert(t('updateFailed'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('uploadPhoto')}</span>
        </button>
      </div>

      {/* Tank Filter */}
      {tanks.length > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <TankSelector
            tanks={tanks}
            value={selectedTankId}
            onChange={setSelectedTankId}
            allLabel={t('allTanks')}
            label={t('filterByTank')}
            defaultTankId={user?.default_tank_id || undefined}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-ocean-500">
          <div className="text-sm text-gray-600">{t('totalPhotos')}</div>
          <div className="text-2xl font-bold text-gray-900">{photos.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600">{t('thisMonth')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {photos.filter((p) => {
              const date = new Date(p.taken_at)
              const now = new Date()
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            }).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600">{t('tanksWithPhotos')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(photos.map((p) => p.tank_id)).size}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <PhotoUpload
          tanks={tanks}
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Gallery */}
      {photos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noPhotos')}</h3>
          <p className="text-gray-600 mb-4">
            {t('startUploading')}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('uploadPhoto')}
          </button>
        </div>
      ) : (
        <PhotoGallery
          photos={photos}
          tanks={tanks}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onRefresh={loadData}
        />
      )}
    </div>
  )
}
