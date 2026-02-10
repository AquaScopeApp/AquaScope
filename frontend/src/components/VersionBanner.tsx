/**
 * VersionBanner Component
 *
 * Displays the current application version in the layout
 */

export default function VersionBanner(): JSX.Element {
  const version = __APP_VERSION__
  const gitCommit = import.meta.env.VITE_GIT_COMMIT?.substring(0, 7)
  const buildDate = import.meta.env.VITE_BUILD_DATE

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Version</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ocean-100 text-ocean-800">
              {version}
            </span>
          </div>
          {gitCommit && (
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="text-xs text-gray-500 font-mono">{gitCommit}</span>
            </div>
          )}
          {buildDate && (
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="text-xs text-gray-500">{buildDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
