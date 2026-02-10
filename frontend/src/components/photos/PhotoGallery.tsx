/**
 * Photo Gallery Component
 *
 * Grid display with lightbox modal for viewing full-size images
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Photo, Tank } from '../../types'
import { photosApi } from '../../api'

interface PhotoGalleryProps {
  photos: Photo[]
  tanks: Tank[]
  onDelete: (id: string) => void
  onUpdate: (id: string, description: string, takenAt: string) => void
}

export default function PhotoGallery({ photos, tanks, onDelete, onUpdate }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editTakenAt, setEditTakenAt] = useState('')
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({})
  const [fullImageUrl, setFullImageUrl] = useState<string>('')
  const [isPinning, setIsPinning] = useState(false)

  const getTankName = (tankId: string) => {
    return tanks.find((t) => t.id === tankId)?.name || 'Unknown Tank'
  }

  // Load thumbnail URLs for grid view
  useEffect(() => {
    const loadThumbnails = async () => {
      const urls: Record<string, string> = {}
      for (const photo of photos) {
        try {
          urls[photo.id] = await photosApi.getFileBlobUrl(photo.id, true)
        } catch (error) {
          console.error(`Failed to load thumbnail for photo ${photo.id}:`, error)
        }
      }
      setThumbnailUrls(urls)
    }

    loadThumbnails()

    // Cleanup: revoke blob URLs when component unmounts or photos change
    return () => {
      Object.values(thumbnailUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photos])

  // Load full image URL when photo is selected
  useEffect(() => {
    if (selectedPhoto) {
      const loadFullImage = async () => {
        try {
          const url = await photosApi.getFileBlobUrl(selectedPhoto.id, false)
          setFullImageUrl(url)
        } catch (error) {
          console.error(`Failed to load full image for photo ${selectedPhoto.id}:`, error)
        }
      }

      loadFullImage()

      // Cleanup: revoke blob URL when photo is deselected
      return () => {
        if (fullImageUrl) {
          URL.revokeObjectURL(fullImageUrl)
        }
      }
    } else {
      setFullImageUrl('')
    }
  }, [selectedPhoto])

  const handleEdit = (photo: Photo) => {
    setIsEditing(true)
    setEditDescription(photo.description || '')
    setEditTakenAt(photo.taken_at.split('T')[0])
  }

  const handleSaveEdit = () => {
    if (selectedPhoto) {
      onUpdate(selectedPhoto.id, editDescription, editTakenAt)
      setIsEditing(false)
      setSelectedPhoto(null)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditDescription('')
    setEditTakenAt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedPhoto) return

    if (e.key === 'Escape') {
      setSelectedPhoto(null)
      setIsEditing(false)
    } else if (e.key === 'ArrowRight') {
      const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id)
      if (currentIndex < photos.length - 1) {
        setSelectedPhoto(photos[currentIndex + 1])
        setIsEditing(false)
      }
    } else if (e.key === 'ArrowLeft') {
      const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id)
      if (currentIndex > 0) {
        setSelectedPhoto(photos[currentIndex - 1])
        setIsEditing(false)
      }
    }
  }

  const handleTogglePin = async () => {
    if (!selectedPhoto) return

    setIsPinning(true)
    try {
      if (selectedPhoto.is_tank_display) {
        await photosApi.unpin(selectedPhoto.id)
      } else {
        await photosApi.pin(selectedPhoto.id)
      }
      // Update the selected photo's pin status
      setSelectedPhoto({
        ...selectedPhoto,
        is_tank_display: !selectedPhoto.is_tank_display,
      })
      // Trigger a refresh by calling onUpdate with same values
      onUpdate(selectedPhoto.id, selectedPhoto.description || '', selectedPhoto.taken_at.split('T')[0])
    } catch (error) {
      console.error('Failed to toggle pin status:', error)
      alert('Failed to update pin status. Please try again.')
    } finally {
      setIsPinning(false)
    }
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
          >
            <div className="aspect-square relative overflow-hidden bg-gray-100">
              <img
                src={thumbnailUrls[photo.id] || ''}
                alt={photo.description || 'Tank photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {photo.is_tank_display && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1.5 rounded-full shadow-lg">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-500 mb-1">{getTankName(photo.tank_id)}</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {format(new Date(photo.taken_at), 'MMM d, yyyy')}
              </div>
              {photo.description && (
                <div className="text-xs text-gray-600 truncate mt-1">{photo.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedPhoto(null)
            setIsEditing(false)
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            className="max-w-7xl w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 text-white">
              <div>
                <div className="text-lg font-semibold">{getTankName(selectedPhoto.tank_id)}</div>
                <div className="text-sm text-gray-300">
                  {format(new Date(selectedPhoto.taken_at), 'MMMM d, yyyy')}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={handleTogglePin}
                      disabled={isPinning}
                      className={`p-2 rounded-lg transition-colors ${
                        selectedPhoto.is_tank_display
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'hover:bg-white hover:bg-opacity-20'
                      }`}
                      title={selectedPhoto.is_tank_display ? 'Unpin as tank display' : 'Pin as tank display'}
                    >
                      <svg className="w-6 h-6" fill={selectedPhoto.is_tank_display ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(selectedPhoto)}
                      className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPhoto(null)
                        onDelete(selectedPhoto.id)
                      }}
                      className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedPhoto(null)
                    setIsEditing(false)
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center relative">
              <img
                src={fullImageUrl}
                alt={selectedPhoto.description || 'Tank photo'}
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id)
                      if (currentIndex > 0) {
                        setSelectedPhoto(photos[currentIndex - 1])
                        setIsEditing(false)
                      }
                    }}
                    disabled={photos.findIndex((p) => p.id === selectedPhoto.id) === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full disabled:opacity-0 transition-opacity"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id)
                      if (currentIndex < photos.length - 1) {
                        setSelectedPhoto(photos[currentIndex + 1])
                        setIsEditing(false)
                      }
                    }}
                    disabled={photos.findIndex((p) => p.id === selectedPhoto.id) === photos.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full disabled:opacity-0 transition-opacity"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Description / Edit Form */}
            <div className="mt-4 bg-white bg-opacity-10 rounded-lg p-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Date Taken</label>
                    <input
                      type="date"
                      value={editTakenAt}
                      onChange={(e) => setEditTakenAt(e.target.value)}
                      className="w-full px-4 py-2 bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-md focus:ring-2 focus:ring-ocean-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white bg-opacity-20 text-white border border-white border-opacity-30 rounded-md focus:ring-2 focus:ring-ocean-500"
                      placeholder="Add a description..."
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-white">
                  {selectedPhoto.description || (
                    <span className="text-gray-400 italic">No description</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
