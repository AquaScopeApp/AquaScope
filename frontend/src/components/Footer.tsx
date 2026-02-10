/**
 * Footer Component
 *
 * App footer with credits, links, and version info
 */

import { useTranslation } from 'react-i18next'

export default function Footer(): JSX.Element {
  const version = import.meta.env.VITE_APP_VERSION || 'v1.5.1'
  const githubUrl = 'https://github.com/eprifti/reeflab'
  const { t } = useTranslation('common')

  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Credits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">AquaScope</h3>
            <p className="text-sm text-gray-600">
              {t('footer.reefDescription')}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {t('footer.createdBy')} <span className="font-medium text-ocean-600">Edi Prifti</span>
            </p>
            <p className="text-xs text-gray-500">
              {t('footer.withLove')} <span className="text-red-500">❤️</span> and Claude Sonnet 4.5
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('footer.links')}</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ocean-600 hover:text-ocean-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  {t('footer.githubRepository')}
                </a>
              </li>
              <li>
                <a
                  href={`${githubUrl}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {t('footer.reportIssues')}
                </a>
              </li>
              <li>
                <a
                  href={`${githubUrl}/blob/main/README.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {t('footer.documentation')}
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('footer.supportProject')}</h3>
            <p className="text-xs text-gray-600 mb-3">
              {t('footer.helpKeepGoing')}
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/sponsors/eprifti"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm rounded-md hover:bg-pink-700 transition"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                {t('footer.githubSponsors')}
              </a>
              <a
                href="https://ko-fi.com/ediprifti"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
              >
                ☕ {t('footer.buyMeCoffee')}
              </a>
            </div>
          </div>
        </div>

        {/* Version & Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Edi Prifti. {t('footer.openSource')}.
          </p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-ocean-100 text-ocean-700 rounded font-mono">
              {version}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
