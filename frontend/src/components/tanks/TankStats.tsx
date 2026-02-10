/**
 * TankStats Component
 *
 * Displays statistics cards for a tank (counts of related items)
 */

import { useTranslation } from 'react-i18next'

interface TankStatsProps {
  stats: {
    event_count?: number
    equipment_count?: number
    livestock_count?: number
    photo_count?: number
    note_count?: number
    maintenance_count?: number
    icp_test_count?: number
  }
}

export default function TankStats({ stats }: TankStatsProps) {
  const { t } = useTranslation('tanks')

  const statItems = [
    { label: t('stats.eventCount'), value: stats.event_count || 0, icon: '📅' },
    { label: t('stats.equipmentCount'), value: stats.equipment_count || 0, icon: '⚙️' },
    { label: t('stats.livestockCount'), value: stats.livestock_count || 0, icon: '🐟' },
    { label: t('stats.photoCount'), value: stats.photo_count || 0, icon: '📷' },
    { label: t('stats.noteCount'), value: stats.note_count || 0, icon: '📝' },
    { label: t('stats.maintenanceCount'), value: stats.maintenance_count || 0, icon: '🔧' },
    { label: t('stats.icpTestCount'), value: stats.icp_test_count || 0, icon: '🔬' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-gradient-to-br from-ocean-50 to-white p-3 rounded-lg border border-ocean-100"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-2xl font-bold text-ocean-600">{item.value}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1 font-medium">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
