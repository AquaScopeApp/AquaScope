import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Register service worker with auto-update
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
