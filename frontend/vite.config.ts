import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

export default defineConfig({
  plugins: [
    react(),
    // Skip PWA plugin for Capacitor builds (native app doesn't need a service worker)
    ...(!isCapacitorBuild ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'favicon.ico',
        'logo.svg',
        'logo-128.png',
        'default-tank.svg',
      ],
      manifest: {
        name: 'AquaScope - Aquarium Management',
        short_name: 'AquaScope',
        description: 'Comprehensive aquarium management - track parameters, maintenance, livestock, and more',
        theme_color: '#0284c7',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'utilities'],
        icons: [
          {
            src: 'pwa-icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}', '*.png', 'pwa-icons/*.png'],
        globIgnores: ['images/defaults/**'],
        runtimeCaching: [
          // Locale files — CacheFirst (translations rarely change)
          {
            urlPattern: /\/locales\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aquascope-locales',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          // Auth endpoints — NetworkOnly (NEVER cache)
          {
            urlPattern: /\/api\/v1\/auth\/.*/,
            handler: 'NetworkOnly',
          },
          // Admin endpoints — NetworkOnly (sensitive data)
          {
            urlPattern: /\/api\/v1\/admin\/.*/,
            handler: 'NetworkOnly',
          },
          // Photo/tank images — CacheFirst (binary images rarely change)
          {
            urlPattern: /\/api\/v1\/(photos|tanks)\/.*\/(file|image)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aquascope-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Default tank images — CacheFirst
          {
            urlPattern: /\/images\/defaults\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aquascope-default-images',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          // GET API requests — NetworkFirst with cache fallback
          {
            urlPattern: /\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'aquascope-api-data',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60,
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    })] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
    __CAPACITOR_BUILD__: JSON.stringify(isCapacitorBuild),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
