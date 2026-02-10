/**
 * Welcome Page — First-launch onboarding for local/native mode
 *
 * Shown only on first launch when no local user exists yet.
 * Creates a local user and navigates to the dashboard.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api'
import { seedDatabase } from '../data/seedDatabase'

export default function Welcome() {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)

  const handleGetStarted = async () => {
    setLoading(true)
    try {
      // Auto-create local user
      const user = await authApi.getCurrentUser()
      localStorage.setItem('aquascope_token', 'local-mode')
      localStorage.setItem('aquascope_user', JSON.stringify(user))

      // Seed demo tank and consumables on first launch
      await seedDatabase()

      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Failed to create local user:', error)
      // Navigate anyway — the auth hook will retry
      navigate('/dashboard', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-50 to-ocean-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <img src="/logo.svg" alt="AquaScope" className="h-24 w-24 mx-auto mb-6" />

        <h1 className="text-3xl font-bold text-ocean-800 mb-2">
          {t('welcome.title', { defaultValue: 'Welcome to AquaScope' })}
        </h1>

        <p className="text-ocean-600 mb-8">
          {t('welcome.description', {
            defaultValue: 'Your personal aquarium management companion. Track parameters, livestock, maintenance, and more — all stored locally on your device.'
          })}
        </p>

        <div className="space-y-4">
          <button
            onClick={handleGetStarted}
            disabled={loading}
            className="w-full py-3 px-6 bg-ocean-600 text-white font-semibold rounded-lg
                       hover:bg-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                {t('welcome.loading', { defaultValue: 'Setting up...' })}
              </span>
            ) : (
              t('welcome.getStarted', { defaultValue: 'Get Started' })
            )}
          </button>
        </div>

        <p className="mt-8 text-xs text-ocean-500">
          {t('welcome.privacy', {
            defaultValue: 'All your data stays on this device. No account or server needed.'
          })}
        </p>
      </div>
    </div>
  )
}
