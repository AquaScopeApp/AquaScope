/**
 * TankStats Component
 *
 * Displays statistics cards for a tank (counts of related items)
 */

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
  const statItems = [
    { label: 'Events', value: stats.event_count || 0, icon: '📅' },
    { label: 'Equipment', value: stats.equipment_count || 0, icon: '⚙️' },
    { label: 'Livestock', value: stats.livestock_count || 0, icon: '🐟' },
    { label: 'Photos', value: stats.photo_count || 0, icon: '📷' },
    { label: 'Notes', value: stats.note_count || 0, icon: '📝' },
    { label: 'Maintenance', value: stats.maintenance_count || 0, icon: '🔧' },
    { label: 'ICP Tests', value: stats.icp_test_count || 0, icon: '🔬' },
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
