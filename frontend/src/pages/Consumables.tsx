/**
 * Consumables Page
 *
 * Manage aquarium consumables with tracking for:
 * - Salt mix, additives, supplements, food, filter media, test kits, medication
 * - Brand, quantity, and stock level monitoring
 * - Purchase info and reorder links
 * - Expiration date tracking with visual warnings
 * - Usage/dosing history
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { consumablesApi, tanksApi } from '../api'
import { parsePrice, formatPrice } from '../utils/price'
import { useCurrency } from '../hooks/useCurrency'
import { useScrollToItem } from '../hooks/useScrollToItem'
import Pagination from '../components/common/Pagination'
import TankSelector from '../components/common/TankSelector'
import type { Consumable, ConsumableCreate, Tank, ConsumableUsage } from '../types'

const ITEMS_PER_PAGE = 12

const CONSUMABLE_TYPES = [
  'salt_mix',
  'additive',
  'supplement',
  'food',
  'filter_media',
  'test_kit',
  'medication',
  'other',
]

const QUANTITY_UNITS = ['ml', 'L', 'g', 'kg', 'pieces', 'drops', 'tablets']

const STATUSES = ['active', 'low_stock', 'depleted', 'expired']

export default function ConsumablesPage() {
  const { t } = useTranslation('consumables')
  const { t: tc } = useTranslation('common')
  const { currency } = useCurrency()
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [showArchived, setShowArchived] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  useScrollToItem(consumables, ITEMS_PER_PAGE, setCurrentPage)

  // Usage log state
  const [loggingUsageId, setLoggingUsageId] = useState<string | null>(null)
  const [usageData, setUsageData] = useState({ quantity_used: '', quantity_unit: '', usage_date: '', notes: '' })
  const [viewingUsageId, setViewingUsageId] = useState<string | null>(null)
  const [usageHistory, setUsageHistory] = useState<ConsumableUsage[]>([])

  // Form state
  const [formData, setFormData] = useState<ConsumableCreate>({
    tank_id: '',
    name: '',
    consumable_type: 'additive',
    brand: '',
    product_name: '',
    quantity_on_hand: null,
    quantity_unit: '',
    purchase_date: '',
    purchase_price: '',
    purchase_url: '',
    expiration_date: '',
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    setCurrentPage(1)
    loadData()
  }, [selectedTank, selectedType, selectedStatus, showArchived])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [consumablesData, tanksData] = await Promise.all([
        consumablesApi.list({
          tank_id: selectedTank || undefined,
          consumable_type: selectedType || undefined,
          status: selectedStatus || undefined,
          include_archived: showArchived || undefined,
        }),
        tanksApi.list(),
      ])

      setConsumables(consumablesData)
      setTanks(tanksData)

      if (tanksData.length > 0 && !formData.tank_id) {
        setFormData((prev) => ({ ...prev, tank_id: tanksData[0].id }))
      }
    } catch (error) {
      console.error('Failed to load consumables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const submitData = {
        ...formData,
        brand: formData.brand || null,
        product_name: formData.product_name || null,
        quantity_unit: formData.quantity_unit || null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price || null,
        purchase_url: formData.purchase_url || null,
        expiration_date: formData.expiration_date || null,
        notes: formData.notes || null,
      }

      if (editingId) {
        await consumablesApi.update(editingId, submitData)
      } else {
        await consumablesApi.create(submitData)
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to save consumable:', error)
      alert(t('saveFailed'))
    }
  }

  const handleEdit = (item: Consumable) => {
    setFormData({
      tank_id: item.tank_id,
      name: item.name,
      consumable_type: item.consumable_type,
      brand: item.brand || '',
      product_name: item.product_name || '',
      quantity_on_hand: item.quantity_on_hand,
      quantity_unit: item.quantity_unit || '',
      purchase_date: item.purchase_date || '',
      purchase_price: item.purchase_price || '',
      purchase_url: item.purchase_url || '',
      expiration_date: item.expiration_date || '',
      status: item.status || 'active',
      notes: item.notes || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      await consumablesApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete consumable:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleConvertToEquipment = async (id: string, name: string) => {
    if (!confirm(t('confirmConvertToEquipment', { name, defaultValue: `Move "${name}" to Equipment?` }))) return

    try {
      await consumablesApi.convertToEquipment(id)
      loadData()
    } catch (error) {
      console.error('Failed to convert to equipment:', error)
      alert(t('convertFailed', { defaultValue: 'Failed to convert' }))
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm(tc('archiveConfirmation'))) return
    try {
      await consumablesApi.archive(id)
      loadData()
    } catch (error) {
      console.error('Failed to archive consumable:', error)
    }
  }

  const handleUnarchive = async (id: string) => {
    try {
      await consumablesApi.unarchive(id)
      loadData()
    } catch (error) {
      console.error('Failed to unarchive consumable:', error)
    }
  }

  const handleLogUsage = async (consumableId: string) => {
    if (!usageData.quantity_used || !usageData.usage_date) {
      alert('Please provide quantity and date')
      return
    }

    try {
      await consumablesApi.logUsage(consumableId, {
        usage_date: usageData.usage_date,
        quantity_used: parseFloat(usageData.quantity_used),
        quantity_unit: usageData.quantity_unit || undefined,
        notes: usageData.notes || undefined,
      })
      setLoggingUsageId(null)
      setUsageData({ quantity_used: '', quantity_unit: '', usage_date: '', notes: '' })
      loadData()
    } catch (error) {
      console.error('Failed to log usage:', error)
      alert('Failed to log usage')
    }
  }

  const handleViewUsage = async (consumableId: string) => {
    if (viewingUsageId === consumableId) {
      setViewingUsageId(null)
      return
    }
    try {
      const history = await consumablesApi.listUsage(consumableId)
      setUsageHistory(history)
      setViewingUsageId(consumableId)
    } catch (error) {
      console.error('Failed to load usage history:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      tank_id: tanks[0]?.id || '',
      name: '',
      consumable_type: 'additive',
      brand: '',
      product_name: '',
      quantity_on_hand: null,
      quantity_unit: '',
      purchase_date: '',
      purchase_price: '',
      purchase_url: '',
      expiration_date: '',
      status: 'active',
      notes: '',
    })
  }

  const getTankName = (tankId: string) => {
    return tanks.find((t) => t.id === tankId)?.name || 'Unknown Tank'
  }

  const formatType = (type: string) => {
    return t(`types.${type}`, type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
  }

  const formatStatus = (status: string) => {
    return t(`status.${status}`, status.charAt(0).toUpperCase() + status.slice(1))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'low_stock': return 'bg-amber-100 text-amber-800'
      case 'depleted': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const displayPrice = (raw: string | null) => {
    if (!raw) return null
    const parsed = parsePrice(raw)
    return parsed !== null ? formatPrice(parsed, currency) : raw
  }

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const getExpirationInfo = (expirationDate: string | null) => {
    if (!expirationDate) return null
    const now = new Date()
    const exp = new Date(expirationDate)
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: t('expired'), color: 'text-red-600', urgent: true }
    if (diffDays <= 30) return { label: t('expiresIn', { days: diffDays }), color: 'text-amber-600', urgent: true }
    return null
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
          {t('addConsumable')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <TankSelector
              tanks={tanks}
              value={selectedTank}
              onChange={setSelectedTank}
              allLabel={t('allTanks')}
              label={t('filterByTank')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByType')}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allTypes')}</option>
              {CONSUMABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
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

      {/* Archive toggle */}
      <label className="inline-flex items-center cursor-pointer text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="mr-2 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500"
        />
        {tc('showArchivedItems')}
      </label>

      {/* Consumables List */}
      {(() => {
        const totalPages = Math.ceil(consumables.length / ITEMS_PER_PAGE)
        const paged = consumables.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
        return (<>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.map((item) => {
          const expInfo = getExpirationInfo(item.expiration_date)
          return (
            <div key={item.id} id={`card-${item.id}`} className={`bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow overflow-hidden ${item.is_archived ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {item.name}
                    {item.is_archived && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">{tc('archivedStatus')}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{formatType(item.consumable_type)}</p>
                  <p className="text-xs text-gray-500 mt-1">{getTankName(item.tank_id)}</p>
                </div>
                <div className="flex space-x-1">
                  {item.is_archived ? (
                    <button
                      onClick={() => handleUnarchive(item.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title={tc('actions.unarchive')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V9" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="p-1 text-gray-500 hover:bg-gray-50 rounded"
                      title={tc('actions.archive')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleConvertToEquipment(item.id, item.name)}
                    className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                    title={t('moveToEquipment', { defaultValue: 'Move to Equipment' })}
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

              {/* Brand */}
              {(item.brand || item.product_name) && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">{item.brand}</span>
                  {item.product_name && <span className="ml-1">{item.product_name}</span>}
                </div>
              )}

              {/* Status + Quantity badges */}
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                  {formatStatus(item.status)}
                </span>
                {item.quantity_on_hand !== null && (
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {item.quantity_on_hand} {item.quantity_unit || ''}
                  </span>
                )}
              </div>

              {/* Depletion progress bar */}
              {item.quantity_on_hand !== null && item.total_used > 0 && (() => {
                const initial = item.quantity_on_hand + item.total_used
                const pct = Math.round((item.quantity_on_hand / initial) * 100)
                const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : pct > 10 ? 'bg-orange-500' : 'bg-red-500'
                return (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{t('depletion.remaining')}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Expiration warning */}
              {expInfo && (
                <div className={`text-xs font-medium mb-1 ${expInfo.color}`}>
                  {expInfo.label}
                </div>
              )}

              {/* Purchase info */}
              {item.purchase_date && (
                <div className="text-xs text-gray-500 mb-1">
                  {t('purchased')} {new Date(item.purchase_date).toLocaleDateString()}
                </div>
              )}
              {item.purchase_price && (
                <div className="text-xs text-gray-500 mb-1">
                  {t('price')} {displayPrice(item.purchase_price)}
                </div>
              )}

              {/* Purchase URL */}
              {item.purchase_url && (
                <div className="mb-2">
                  <a
                    href={item.purchase_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ocean-600 hover:text-ocean-700 font-medium break-all"
                  >
                    {t('buyAgain')} &rarr;
                  </a>
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200 break-words">
                  <div className={expandedNotes.has(item.id) ? '' : 'line-clamp-3'}>
                    {item.notes}
                  </div>
                  {item.notes.length > 120 && (
                    <button
                      onClick={() => toggleNotes(item.id)}
                      className="text-xs text-ocean-600 hover:text-ocean-700 mt-1"
                    >
                      {expandedNotes.has(item.id) ? tc('showLess', { defaultValue: 'Show less' }) : tc('showMore', { defaultValue: 'Show more' })}
                    </button>
                  )}
                </div>
              )}

              {/* Usage actions */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => {
                    if (loggingUsageId === item.id) {
                      setLoggingUsageId(null)
                    } else {
                      setLoggingUsageId(item.id)
                      setUsageData({
                        quantity_used: '',
                        quantity_unit: item.quantity_unit || '',
                        usage_date: new Date().toISOString().split('T')[0],
                        notes: '',
                      })
                    }
                  }}
                  className="text-xs px-3 py-1 bg-ocean-50 text-ocean-700 rounded hover:bg-ocean-100 font-medium"
                >
                  {t('logUsage')}
                </button>
                {item.usage_count > 0 && (
                  <button
                    onClick={() => handleViewUsage(item.id)}
                    className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 font-medium"
                  >
                    {t('usageHistory')} ({item.usage_count})
                  </button>
                )}
              </div>

              {/* Inline usage form */}
              {loggingUsageId === item.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={t('form.quantityUsed')}
                      value={usageData.quantity_used}
                      onChange={(e) => setUsageData({ ...usageData, quantity_used: e.target.value })}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-ocean-500"
                    />
                    <select
                      value={usageData.quantity_unit}
                      onChange={(e) => setUsageData({ ...usageData, quantity_unit: e.target.value })}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-ocean-500"
                    >
                      <option value="">{t('form.unit')}</option>
                      {QUANTITY_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="date"
                    value={usageData.usage_date}
                    onChange={(e) => setUsageData({ ...usageData, usage_date: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-ocean-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLogUsage(item.id)}
                      className="flex-1 text-xs px-3 py-1.5 bg-ocean-600 text-white rounded hover:bg-ocean-700 font-medium"
                    >
                      {tc('actions.save')}
                    </button>
                    <button
                      onClick={() => setLoggingUsageId(null)}
                      className="text-xs px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      {tc('actions.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Usage history */}
              {viewingUsageId === item.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('usageHistory')}</h4>
                  {usageHistory.length === 0 ? (
                    <p className="text-xs text-gray-500">{t('noUsage')}</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {usageHistory.map((usage) => (
                        <div key={usage.id} className="text-xs text-gray-600 flex justify-between">
                          <span>{new Date(usage.usage_date).toLocaleDateString()}</span>
                          <span className="font-medium">{usage.quantity_used} {usage.quantity_unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {consumables.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {t('noConsumables')}
          </div>
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={consumables.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
      </>)
      })()}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingId ? t('editConsumable') : t('addConsumable')}
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
                      placeholder="e.g., Red Sea Coral Pro Salt, Seachem Prime"
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
                      value={formData.consumable_type}
                      onChange={(e) => setFormData({ ...formData, consumable_type: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      {CONSUMABLE_TYPES.map((type) => (
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
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value || null })}
                      placeholder="e.g., Red Sea, Seachem, Tropic Marin"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.productName')}
                    </label>
                    <input
                      type="text"
                      value={formData.product_name || ''}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value || null })}
                      placeholder="e.g., Coral Pro Salt 7kg"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.quantity')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.quantity_on_hand ?? ''}
                      onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="e.g., 500"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.unit')}
                    </label>
                    <select
                      value={formData.quantity_unit || ''}
                      onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    >
                      <option value="">--</option>
                      {QUANTITY_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
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
                      placeholder="e.g., 45€, $50"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.expirationDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.expiration_date || ''}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
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
                      {t('form.purchaseUrl')}
                    </label>
                    <input
                      type="url"
                      value={formData.purchase_url || ''}
                      onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value || null })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.notes')}
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      rows={3}
                      placeholder="Dosing instructions, storage notes, etc."
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
                    {editingId ? t('updateConsumable') : t('addConsumable')}
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
