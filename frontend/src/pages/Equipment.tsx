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
import { useTranslation } from 'react-i18next'
import { equipmentApi, tanksApi } from '../api'
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
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation('common')
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedCondition, setSelectedCondition] = useState<string>('')

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
  }, [selectedTank, selectedType, selectedStatus, selectedCondition])

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
      // Sanitize empty strings to null for optional fields (Pydantic rejects "" for date types)
      const submitData = {
        ...formData,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price || null,
        notes: formData.notes || null,
      }

      if (editingId) {
        await equipmentApi.update(editingId, submitData)
      } else {
        await equipmentApi.create(submitData)
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save equipment:', error)
      alert(t('saveFailed'))
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
      status: item.status || 'active',
      notes: item.notes || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      await equipmentApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete equipment:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleConvertToConsumable = async (id: string, name: string) => {
    if (!confirm(t('confirmConvertToConsumable', { name, defaultValue: `Move "${name}" to Consumables?` }))) return

    try {
      await equipmentApi.convertToConsumable(id)
      loadData()
    } catch (error) {
      console.error('Failed to convert to consumable:', error)
      alert(t('convertFailed', { defaultValue: 'Failed to convert' }))
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

  const getConditionCardStyle = (condition: string | null) => {
    switch (condition) {
      case 'new':
      case 'excellent':
        return 'border-l-4 border-l-green-500 bg-green-50/30'
      case 'good':
        return 'border-l-4 border-l-blue-500 bg-blue-50/30'
      case 'fair':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/40'
      case 'needs_maintenance':
        return 'border-l-4 border-l-orange-500 bg-orange-50/50'
      case 'failing':
        return 'border-l-4 border-l-red-500 bg-red-50/50'
      default:
        return 'border-l-4 border-l-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingId(null)
            setShowForm(true)
          }}
          className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
        >
          {t('addEquipment')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByTank')}</label>
            <select
              value={selectedTank}
              onChange={(e) => setSelectedTank(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allTanks')}</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByType')}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allTypes')}</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByCondition', { defaultValue: 'Condition' })}</label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allConditions', { defaultValue: 'All Conditions' })}</option>
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {formatCondition(cond)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByStatus')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allStatus')}</option>
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
        {equipment
          .filter((item) => !selectedCondition || item.condition === selectedCondition)
          .map((item) => (
          <div key={item.id} className={`rounded-lg shadow p-4 hover:shadow-lg transition-shadow ${getConditionCardStyle(item.condition)}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">{formatType(item.equipment_type)}</p>
                <p className="text-xs text-gray-500 mt-1">{getTankName(item.tank_id)}</p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleConvertToConsumable(item.id, item.name)}
                  className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                  title={t('moveToConsumable', { defaultValue: 'Move to Consumables' })}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
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
                {t('purchased')} {new Date(item.purchase_date).toLocaleDateString()}
              </div>
            )}

            {item.purchase_price && (
              <div className="text-xs text-gray-500 mb-1">
                {t('price')} {item.purchase_price}
              </div>
            )}

            {item.notes && (
              <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                {item.notes}
              </div>
            )}
          </div>
        ))}

        {equipment.filter((item) => !selectedCondition || item.condition === selectedCondition).length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {t('noEquipment')}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingId ? t('editEquipment') : t('addEquipment')}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.name')} <span className="text-red-500">*</span>
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
                      {t('form.tank')} <span className="text-red-500">*</span>
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
                      {t('form.type')} <span className="text-red-500">*</span>
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
                      {t('form.brand')}
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
                      {t('form.model')}
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
                      {t('form.purchaseDate')}
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
                      {t('form.price')}
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
                      {t('form.condition')}
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
                      {t('form.status')}
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
                      {t('form.notes')}
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
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
                  >
                    {editingId ? t('updateEquipment') : t('addEquipment')}
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
