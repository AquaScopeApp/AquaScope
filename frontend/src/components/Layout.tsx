/**
 * Layout Component
 *
 * Main application layout with navigation sidebar and header.
 * Wraps all authenticated pages.
 */

import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import Footer from './Footer'
import VersionBanner from './VersionBanner'
import LanguageSelector from './LanguageSelector'
import AquariumScene from './AquariumScene'

export default function Layout(): JSX.Element {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t } = useTranslation('common')

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: '🏠' },
    { name: t('navigation.tanks'), href: '/tanks', icon: '🐠' },
    { name: t('navigation.parameters'), href: '/parameters', icon: '📊' },
    { name: t('navigation.icpTests'), href: '/icp-tests', icon: '🔬' },
    { name: t('navigation.photos'), href: '/photos', icon: '📷' },
    { name: t('navigation.notes'), href: '/notes', icon: '📝' },
    { name: t('navigation.maintenance'), href: '/maintenance', icon: '🔧' },
    { name: t('navigation.livestock'), href: '/livestock', icon: '🐟' },
    { name: t('navigation.equipment'), href: '/equipment', icon: '⚙️' },
  ]

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <img src="/favicon.svg" alt="AquaScope" className="h-8 w-8" />
                <span className="text-2xl font-bold text-ocean-600">
                  AquaScope
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <span className="text-sm text-gray-700">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {t('actions.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center px-4 py-2 text-sm font-medium rounded-md
                      ${
                        active
                          ? 'bg-ocean-50 text-ocean-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}

              {/* Admin Link (only for admins) */}
              {user?.is_admin && (
                <>
                  <div className="my-2 border-t border-gray-300" />
                  <Link
                    to="/admin"
                    className={`
                      flex items-center px-4 py-2 text-sm font-medium rounded-md
                      ${
                        isActive('/admin')
                          ? 'bg-red-50 text-red-700'
                          : 'text-red-600 hover:bg-red-50'
                      }
                    `}
                  >
                    <span className="mr-3">⚙️</span>
                    {t('layout.admin')}
                  </Link>
                </>
              )}
            </nav>

            {/* API Documentation Link */}
            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <p className="text-xs font-medium text-blue-900 mb-1">
                {t('layout.developer')}
              </p>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {t('layout.apiDocumentation')}
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <AquariumScene />
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
