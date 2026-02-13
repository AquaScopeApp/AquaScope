import { useState, useEffect, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { banners, type BannerTheme } from './index'
import { adminApi } from '../../api'
import { useRegionalSettings } from '../../hooks/useRegionalSettings'
import { useTranslation } from 'react-i18next'
import getCroppedImg from '../../utils/cropImage'

interface BannerEditorProps {
  isOpen: boolean
  onClose: () => void
  currentTheme: BannerTheme
}

const themeOptions: { key: BannerTheme; labelKey: string; descKey: string }[] = [
  { key: 'reef', labelKey: 'bannerEditor.reef', descKey: 'bannerEditor.reefDesc' },
  { key: 'planted', labelKey: 'bannerEditor.planted', descKey: 'bannerEditor.plantedDesc' },
]

export default function BannerEditor({ isOpen, onClose, currentTheme }: BannerEditorProps) {
  const { t } = useTranslation('dashboard')
  const { refresh: refreshCurrency } = useRegionalSettings()
  const [selectedTheme, setSelectedTheme] = useState<BannerTheme>(currentTheme)
  const [step, setStep] = useState<'select' | 'crop'>('select')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [imageSrc])

  if (!isOpen) return null

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setStep('crop')
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleSaveTheme = async () => {
    setIsSaving(true)
    try {
      await adminApi.updateGeneralSettings({ banner_theme: selectedTheme })
      await refreshCurrency()
      onClose()
    } catch (error) {
      console.error('Failed to save banner theme:', error)
      alert('Failed to save banner theme')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsSaving(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const file = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' })
      await adminApi.uploadBannerImage(file)
      await refreshCurrency()
      onClose()
    } catch (error) {
      console.error('Failed to upload banner image:', error)
      alert('Failed to upload banner image')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            {step === 'crop' && (
              <button
                onClick={() => { setStep('select'); setImageSrc(null) }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title={t('bannerEditor.back')}
                aria-label={t('bannerEditor.back')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {step === 'select' ? t('bannerEditor.title') : t('bannerEditor.cropTitle')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Close" aria-label="Close">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'select' ? (
          <>
            {/* Theme Selection */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Reef & Planted */}
                {themeOptions.map((theme) => {
                  const BannerPreview = banners[theme.key]
                  return (
                    <button
                      key={theme.key}
                      onClick={() => setSelectedTheme(theme.key)}
                      className={`rounded-lg border-2 overflow-hidden transition-all text-left ${
                        selectedTheme === theme.key
                          ? 'border-ocean-500 ring-2 ring-ocean-200 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="h-20 overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '286%', height: '286%' }}>
                          {BannerPreview && <BannerPreview />}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t(theme.labelKey)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t(theme.descKey)}</div>
                      </div>
                    </button>
                  )
                })}

                {/* Custom image */}
                <button
                  onClick={() => setSelectedTheme('custom')}
                  className={`rounded-lg border-2 overflow-hidden transition-all text-left ${
                    selectedTheme === 'custom'
                      ? 'border-ocean-500 ring-2 ring-ocean-200 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="h-20 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('bannerEditor.custom')}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('bannerEditor.customDesc')}</div>
                  </div>
                </button>
              </div>

              {/* Upload area when custom selected */}
              {selectedTheme === 'custom' && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-ocean-600 bg-ocean-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-ocean-400 bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <svg className="mx-auto w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('bannerEditor.uploadPrompt')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('bannerEditor.uploadHint')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer for reef/planted */}
            {selectedTheme !== 'custom' && (
              <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTheme}
                  disabled={isSaving}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
                >
                  {isSaving ? t('bannerEditor.saving') : t('bannerEditor.saveTheme')}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Crop Step */}
            <div className="p-6 space-y-4">
              <div className="relative h-72 bg-gray-900 rounded-lg overflow-hidden">
                {imageSrc && (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1200 / 280}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                )}
              </div>

              {/* Zoom slider */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12">{t('bannerEditor.zoom')}</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-ocean-600"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 w-10 text-right">{zoom.toFixed(1)}x</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => { setStep('select'); setImageSrc(null) }}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {t('bannerEditor.back')}
              </button>
              <button
                onClick={handleSaveCroppedImage}
                disabled={isSaving || !croppedAreaPixels}
                className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
              >
                {isSaving ? t('bannerEditor.saving') : t('bannerEditor.saveBanner')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
