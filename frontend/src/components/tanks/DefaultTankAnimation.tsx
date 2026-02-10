/**
 * DefaultTankAnimation Component
 *
 * Shows default tank images based on water type when no custom image is uploaded.
 */

import { useTranslation } from 'react-i18next'

const DEFAULT_IMAGES: Record<string, string> = {
  saltwater: '/images/defaults/saltwater.png',
  freshwater: '/images/defaults/freshwater.png',
  brackish: '/images/defaults/brackish.png',
}

interface DefaultTankAnimationProps {
  waterType?: string
}

export default function DefaultTankAnimation({ waterType = 'saltwater' }: DefaultTankAnimationProps) {
  const { t } = useTranslation('tanks')

  const badgeStyles: Record<string, string> = {
    saltwater: 'bg-blue-600/80 text-white backdrop-blur-sm',
    freshwater: 'bg-emerald-600/80 text-white backdrop-blur-sm',
    brackish: 'bg-teal-600/80 text-white backdrop-blur-sm',
  }

  const imageSrc = DEFAULT_IMAGES[waterType] || DEFAULT_IMAGES.saltwater

  return (
    <div className="w-full h-full relative overflow-hidden">
      <img
        src={imageSrc}
        alt={t(`waterType.${waterType}`)}
        className="w-full h-full object-cover"
      />

      {/* Water type badge */}
      <div className="absolute top-3 left-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyles[waterType] || badgeStyles.saltwater}`}
        >
          {t(`waterType.${waterType}`)}
        </span>
      </div>
    </div>
  )
}
