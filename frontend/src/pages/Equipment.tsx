/**
 * Equipment Page
 *
 * Manage aquarium equipment with tracking for:
 * - Pumps, lights, heaters, skimmers, controllers, etc.
 * - Manufacturer, model, and specifications
 * - Purchase date, price, and condition
 * - Link to maintenance reminders
 */

import { useState, useEffect } from 'react'
import { equipmentApi, tanksApi } from '../api/client'
import type { Equipment, EquipmentCreate, Tank } from '../types'

const EQUIPMENT_TYPES = [
  'pump',
  'light',
  'heater',
  'skimmer',
  'wavemaker',
  'controller',
  'doser',
  'reactor',
  'filter',
  'uv_sterilizer',
  'protein_skimmer',
  'return_pump',
  'powerhead',
  'chiller',
  'ato',
  'other',
]

const CONDITIONS = [
  'new',
  'excellent',
  'good',
  'fair',
  'needs_maintenance',
  'failing',
]

const STATUSES = [
  'active',
  'stock',
]

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState<EquipmentCreate>({
    tank_id: '',
    name: '',
    equipment_type: 'pump',
    manufacturer: '',
    model: '',
    specs: null,
    purchase_date: '',
    purchase_price: '',
    condition: 'new',
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [selectedTank, selectedType, selectedStatus])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [equipmentData, tanksData] = await Promise.all([
        equipmentApi.list({
          tank_id: selectedTank || undefined,
          equipment_type: selectedType || undefined,
          status: selectedStatus || undefined,
        }),
        tanksApi.list(),
      ])

      setEquipment(equipmentData)
      setTanks(tanksData)

      if (tanksData.length > 0 && !formData.tank_id) {
        setFormData((prev) => ({ ...prev, tank_id: tanksData[0].id }))
      }
    } catch (error) {
      console.error('Failed to load equipment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingId) {
        await equipmentApi.update(editingId, formData)
      } else {
        await equipmentApi.create(formData)
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save equipment:', error)
      alert('Failed to save equipment')
    }
  }

  const handleEdit = (item: Equipment) => {
    setFormData({
      tank_id: item.tank_id,
      name: item.name,
      equipment_type: item.equipment_type,
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      specs: item.specs,
      purchase_date: item.purchase_date || '',
      purchase_price: item.purchase_price || '',
      condition: item.condition || 'good',
      notes: item.notes || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return

    try {
      await equipmentApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete equipment:', error)
      alert('Failed to delete equipment')
    }
  }

  const resetForm = () => {
    setFormData({
      tank_id: tanks[0]?.id || '',
      name: '',
      equipment_type: 'pump',
      manufacturer: '',
      model: '',
      specs: null,
      purchase_date: '',
      purchase_price: '',
      condition: 'new',
      status: 'active',
      notes: '',
    })
  }

  const getTankName = (tankId: string) => {
    return tanks.find((t) => t.id === tankId)?.name || 'Unknown Tank'
  }

  const formatCondition = (condition: string | null) => {
    if (!condition) return 'Unknown'
    return condition.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const formatType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading equipment...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment</h1>
          <p className="text-gray-600 mt-1">Track and manage your aquarium equipment</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingId(null)
            setShowForm(true)
          }}
          className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tank</label>
            <select
              value={selectedTank}
              onChange={(e) => setSelectedTank(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">All Tanks</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">All Types</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">All Status</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipment.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">{formatType(item.equipment_type)}</p>
                <p className="text-xs text-gray-500 mt-1">{getTankName(item.tank_id)}</p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1 text-ocean-600 hover:bg-ocean-50 rounded"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {(item.manufacturer || item.model) && (
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">{item.manufacturer}</span>
                {item.model && <span className="ml-1">{item.model}</span>}
              </div>
            )}

            <div className="mb-2 flex gap-2">
              {item.condition && (
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  item.condition === 'new' || item.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                  item.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                  item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {formatCondition(item.condition)}
                </span>
              )}
              {item.status && (
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'active' ? 'bg-ocean-100 text-ocean-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {formatStatus(item.status)}
                </span>
              )}
            </div>

            {item.purchase_date && (
              <div className="text-xs text-gray-500 mb-1">
                Purchased: {new Date(item.purchase_date).toLocaleDateString()}
              </div>
            )}

            {item.purchase_price && (
              <div className="text-xs text-gray-500 mb-1">
                Price: {item.purchase_price}
              </div>
            )}

            {item.notes && (
              <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                {item.notes}
              </div>
            )}
          </div>
        ))}

        {equipment.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No equipment found. Add your first piece of equipment to get started!
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingId ? 'Edit Equipment' : 'Add Equipment'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Return Pump, Main Light"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tank <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tank_id}
                      onChange={(e) => setFormData({ ...formData, tank_id: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {tanks.map((tank) => (
                        <option key={tank.id} value={tank.id}>
                          {tank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.equipment_type}
                      onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {EQUIPMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatType(type)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer || ''}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value || null })}
                      placeholder="e.g., Ecotech, Neptune, Hydor"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value || null })}
                      placeholder="e.g., Vectra M2, Apex Classic"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price
                    </label>
                    <input
                      type="text"
                      value={formData.purchase_price || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value || null })}
                      placeholder="e.g., $250, €200"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      value={formData.condition || 'good'}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {CONDITIONS.map((cond) => (
                        <option key={cond} value={cond}>
                          {formatCondition(cond)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {STATUSES.map((stat) => (
                        <option key={stat} value={stat}>
                          {formatStatus(stat)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      rows={3}
                      placeholder="Additional information, specifications, warranty details, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                      resetForm()
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
                  >
                    {editingId ? 'Update' : 'Add'} Equipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
