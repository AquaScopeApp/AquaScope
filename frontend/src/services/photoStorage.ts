/**
 * Photo Storage Service
 *
 * Uses Capacitor Filesystem on native, falls back to
 * base64 data URLs on web for local mode.
 */

import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

const PHOTOS_DIR = 'aquascope_photos'

/**
 * Save a File/Blob to the local filesystem.
 * Returns the saved path (relative within the app's data directory).
 */
export async function savePhoto(file: File | Blob, filename: string): Promise<string> {
  const base64 = await blobToBase64(file)
  const path = `${PHOTOS_DIR}/${filename}`

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    })
  } else {
    // Web fallback: store as base64 in localStorage
    localStorage.setItem(`photo_${path}`, base64)
  }

  return path
}

/**
 * Save a thumbnail version of an image (max 300px wide).
 */
export async function saveThumbnail(file: File | Blob, filename: string): Promise<string> {
  const thumbBlob = await resizeImage(file, 300)
  return savePhoto(thumbBlob, filename)
}

/**
 * Read a photo from the filesystem. Returns a data URL for use in <img src>.
 */
export async function readPhoto(path: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data,
      })
      // result.data is base64 string on native
      const mimeType = guessMimeType(path)
      return `data:${mimeType};base64,${result.data}`
    } catch {
      return ''
    }
  }

  // Web fallback: read from localStorage
  const base64 = localStorage.getItem(`photo_${path}`)
  if (!base64) return ''
  const mimeType = guessMimeType(path)
  return `data:${mimeType};base64,${base64}`
}

/**
 * Delete a photo (and optionally its thumbnail) from the filesystem.
 */
export async function deletePhoto(filePath: string, thumbnailPath?: string | null): Promise<void> {
  const paths = [filePath]
  if (thumbnailPath) paths.push(thumbnailPath)

  for (const path of paths) {
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.deleteFile({ path, directory: Directory.Data })
      } catch {
        // File might not exist
      }
    } else {
      localStorage.removeItem(`photo_${path}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blobToBase64(blob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:...;base64, prefix
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function resizeImage(file: File | Blob, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.7
      )
    }
    img.onerror = reject
    img.src = url
  })
}

function guessMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    default: return 'image/jpeg'
  }
}
