/**
 * Camera Hook — Uses Capacitor Camera on native, falls back to file input on web
 */

import { useState } from 'react'
import { Capacitor } from '@capacitor/core'

interface UseCameraReturn {
  takePhoto: () => Promise<File | null>
  isAvailable: boolean
  error: string | null
}

export function useCamera(): UseCameraReturn {
  const [error, setError] = useState<string | null>(null)
  const isAvailable = Capacitor.isNativePlatform()

  const takePhoto = async (): Promise<File | null> => {
    setError(null)

    if (!isAvailable) {
      setError('Camera is only available on native platforms')
      return null
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      })

      if (!image.webPath) {
        setError('No image captured')
        return null
      }

      // Convert the web path to a File object
      const response = await fetch(image.webPath)
      const blob = await response.blob()
      const filename = `photo_${Date.now()}.${image.format || 'jpeg'}`
      return new File([blob], filename, { type: `image/${image.format || 'jpeg'}` })
    } catch (e: any) {
      if (e?.message?.includes('cancelled') || e?.message?.includes('canceled')) {
        return null // User cancelled — not an error
      }
      setError(e?.message || 'Failed to take photo')
      return null
    }
  }

  return { takePhoto, isAvailable, error }
}
