/**
 * Layout Component
 *
 * Main application layout with navigation sidebar and header.
 * Desktop: fixed sidebar. Mobile: hamburger menu with slide-over drawer.
 * Wraps all authenticated pages.
 */

import { useState, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useModuleSettings } from '../hooks/useModuleSettings'
import { isLocalMode } from '../platform'
import { authApi } from '../api'
import type { ModuleSettings } from '../types'
import Footer from './Footer'
import VersionBanner from './VersionBanner'
import LanguageSelector from './LanguageSelector'
import ThemeToggle from './ThemeToggle'
import InstallPrompt from './InstallPrompt'

const local = isLocalMode()

export default function Layout(): JSX.Element {
  const location = useLocation()
  const { user, logout, refreshUser } = useAuth()
  const { isEnabled } = useModuleSettings()
  const { t } = useTranslation('common')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)

  // Load avatar blob
  useEffect(() => {
    if (!local && user?.avatar_url) {
      const loadAvatar = async () => {
        try {
          const response = await fetch(`/api/v1/auth/me/avatar`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('aquascope_token')}` },
          })
          if (response.ok) {
            const blob = await response.blob()
            setAvatarSrc(URL.createObjectURL(blob))
          }
        } catch { /* ignore */ }
      }
      loadAvatar()
    } else {
      setAvatarSrc(null)
    }
  }, [user?.avatar_url])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await authApi.uploadAvatar(file)
      await refreshUser()
      setShowAvatarMenu(false)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    }
  }

  const handleAvatarDelete = async () => {
    try {
      await authApi.deleteAvatar()
      await refreshUser()
      setAvatarSrc(null)
      setShowAvatarMenu(false)
    } catch (error) {
      console.error('Failed to delete avatar:', error)
    }
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Module key mapping — null means always visible (core)
  const navigation: { name: string; href: string; icon: string; module: keyof ModuleSettings | null }[] = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: '🏠', module: null },
    { name: t('navigation.tanks'), href: '/tanks', icon: '🐠', module: null },
    { name: t('navigation.parameters'), href: '/parameters', icon: '📊', module: null },
    { name: t('navigation.icpTests'), href: '/icp-tests', icon: '🔬', module: 'icp_tests' },
    { name: t('navigation.photos'), href: '/photos', icon: '📷', module: 'photos' },
    { name: t('navigation.notes'), href: '/notes', icon: '📝', module: 'notes' },
    { name: t('navigation.maintenance'), href: '/maintenance', icon: '🔧', module: 'maintenance' },
    { name: t('navigation.livestock'), href: '/livestock', icon: '🐟', module: 'livestock' },
    { name: t('navigation.equipment'), href: '/equipment', icon: '⚙️', module: 'equipment' },
    { name: t('navigation.consumables'), href: '/consumables', icon: '🧪', module: 'consumables' },
    { name: t('navigation.feeding'), href: '/feeding', icon: '🍽️', module: 'feeding' },
    { name: t('navigation.diseases'), href: '/diseases', icon: '🩺', module: 'diseases' as keyof ModuleSettings },
    { name: t('navigation.calculators'), href: '/water-change-calculator', icon: '🧮', module: null },
    { name: t('navigation.finances'), href: '/finances', icon: '💰', module: 'finances' },
  ]

  const visibleNavigation = navigation.filter((item) => !item.module || isEnabled(item.module))

  const isActive = (path: string) => location.pathname.startsWith(path)

  const sidebarContent = (
    <>
      <nav className="space-y-1">
        {visibleNavigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${
                  active
                    ? 'bg-ocean-50 text-ocean-700 dark:bg-ocean-900/50 dark:text-ocean-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }
              `}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}

        {/* Admin Link (only for admins, hidden in local mode) */}
        {!local && user?.is_admin && (
          <>
            <div className="my-2 border-t border-gray-300 dark:border-gray-600" />
            <Link
              to="/admin"
              className={`
                flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${
                  isActive('/admin')
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'
                }
              `}
            >
              <span className="mr-3">⚙️</span>
              {t('layout.admin')}
            </Link>
          </>
        )}
      </nav>

      {/* API Documentation Link — hidden in local mode */}
      {!local && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">
            {t('layout.developer')}
          </p>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t('layout.apiDocumentation')}
          </a>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Skip to content link — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ocean-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        {t('skipToContent', { defaultValue: 'Skip to content' })}
      </a>

      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Hamburger button — mobile only */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              <Link to="/dashboard" className="flex items-center space-x-2">
                <img src="/logo-128.png" alt="AquaScope" className="h-8 w-8" />
                <span className="text-2xl font-bold text-ocean-600">
                  AquaScope
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              <LanguageSelector />
              <ThemeToggle />
              {!local && (
                <div className="relative">
                  <button
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    className="flex items-center space-x-2 focus:outline-none"
                    aria-label={t('userMenu', { defaultValue: 'User menu' })}
                    aria-expanded={showAvatarMenu}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={user?.username} className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-600 dark:bg-ocean-900 dark:text-ocean-300 flex items-center justify-center text-sm font-bold border-2 border-gray-200 dark:border-gray-600">
                        {(user?.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">{user?.username}</span>
                  </button>

                  {showAvatarMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 py-1">
                        <label className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <span className="mr-2">📷</span>
                          {user?.avatar_url ? t('changeAvatar') : t('uploadAvatar')}
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                        {user?.avatar_url && (
                          <button
                            onClick={handleAvatarDelete}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <span className="mr-2">🗑️</span>
                            {t('removeAvatar')}
                          </button>
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        <button
                          onClick={() => { logout(); setShowAvatarMenu(false) }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <span className="mr-2">🚪</span>
                          {t('actions.logout')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {local && (
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">My AquaScope</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-over drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-700">
              <Link to="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
                <img src="/logo-128.png" alt="AquaScope" className="h-8 w-8" />
                <span className="text-xl font-bold text-ocean-600">AquaScope</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer content */}
            <div className="p-4">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar — hidden on mobile */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {sidebarContent}
          </aside>

          {/* Main Content */}
          <main id="main-content" className="flex-1 min-w-0">
            {!local && <InstallPrompt />}
            <div className="mt-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Version Banner */}
      <VersionBanner />
    </div>
  )
}
