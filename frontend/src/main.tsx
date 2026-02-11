import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeApi } from './api'
import { isNativePlatform, isLocalMode } from './platform'

declare const __CAPACITOR_BUILD__: boolean

async function bootstrap() {
  // 1. Initialize the API layer (picks local SQLite or remote REST)
  await initializeApi()

  // 2. If local mode, initialize the local database
  if (isLocalMode()) {
    const { db } = await import('./services/database')
    await db.initialize()
  }

  // 3. Register PWA service worker only for web builds (not Capacitor)
  // Guard with build-time constant so Rollup tree-shakes the virtual module
  if (!__CAPACITOR_BUILD__ && !isNativePlatform()) {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('A new version of AquaScope is available. Reload to update?')) {
          updateSW(true)
        }
      },
      onOfflineReady() {
        console.log('AquaScope is ready for offline use.')
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        }
      },
    })
  }

  // 4. If native, run native setup (status bar, splash screen, etc.)
  if (isNativePlatform()) {
    const { initializeNative } = await import('./services/nativeSetup')
    await initializeNative()
  }

  // 5. Render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap().catch(console.error)
