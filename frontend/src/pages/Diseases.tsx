/**
 * Diseases Page
 *
 * Track diseases, treatments, and health outcomes for aquarium livestock.
 * Groups records by status with stats summary and filtering.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { diseasesApi, tanksApi, livestockApi, consumablesApi } from '../api'
import type {
  DiseaseRecord,
  DiseaseRecordDetail,
  DiseaseRecordUpdate,
  DiseaseTreatmentCreate,
  Tank,
  Livestock,
  Consumable,
} from '../types'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import DiseaseCard from '../components/diseases/DiseaseCard'
import DiseaseForm from '../components/diseases/DiseaseForm'
import DiseaseDetail from '../components/diseases/DiseaseDetail'

export default function Diseases() {
  const { t } = useTranslation('diseases')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [diseases, setDiseases] = useState<DiseaseRecord[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [livestock, setLivestock] = useState<Livestock[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingDisease, setEditingDisease] = useState<DiseaseRecord | null>(null)
  const [selectedDisease, setSelectedDisease] = useState<DiseaseRecordDetail | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  const [tankFilter, setTankFilter] = useState<string>(searchParams.get('tank') || '')
  const [livestockFilter, setLivestockFilter] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [diseasesData, tanksData, livestockData, consumablesData] = await Promise.all([
        diseasesApi.list(),
        tanksApi.list(),
        livestockApi.list(),
        consumablesApi.list(),
      ])
      setDiseases(diseasesData)
      setTanks(tanksData)
      setLivestock(livestockData)
      setConsumables(consumablesData)
    } catch (error) {
      console.error('Failed to load disease data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: any) => {
    await diseasesApi.create(data)
    setShowForm(false)
    loadData()
  }

  const handleUpdate = async (id: string, data: DiseaseRecordUpdate) => {
    await diseasesApi.update(id, data)
    setEditingDisease(null)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      await diseasesApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete disease record:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleEdit = (disease: DiseaseRecord) => {
    setEditingDisease(disease)
    setShowForm(false)
  }

  const handleCancelEdit = () => {
    setEditingDisease(null)
  }

  const handleViewDetail = async (disease: DiseaseRecord) => {
    try {
      const detail = await diseasesApi.get(disease.id)
      setSelectedDisease(detail)
    } catch (error) {
      console.error('Failed to load disease detail:', error)
    }
  }

  const handleAddTreatment = async (data: DiseaseTreatmentCreate) => {
    if (!selectedDisease) return
    await diseasesApi.addTreatment(selectedDisease.id, data)
    // Reload detail
    const detail = await diseasesApi.get(selectedDisease.id)
    setSelectedDisease(detail)
    loadData()
  }

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!selectedDisease) return
    await diseasesApi.deleteTreatment(selectedDisease.id, treatmentId)
    // Reload detail
    const detail = await diseasesApi.get(selectedDisease.id)
    setSelectedDisease(detail)
    loadData()
  }

  const handleUpdateDiseaseFromDetail = async (data: DiseaseRecordUpdate) => {
    if (!selectedDisease) return
    await diseasesApi.update(selectedDisease.id, data)
    const detail = await diseasesApi.get(selectedDisease.id)
    setSelectedDisease(detail)
    loadData()
  }

  // Filter diseases
  const filtered = diseases.filter(d => {
    if (tankFilter && d.tank_id !== tankFilter) return false
    if (livestockFilter && d.livestock_id !== livestockFilter) return false
    return true
  })

  // Categorize by status
  const activeDiseases = filtered.filter(d => d.status === 'active')
  const monitoringDiseases = filtered.filter(d => d.status === 'monitoring')
  const chronicDiseases = filtered.filter(d => d.status === 'chronic')
  const resolvedDiseases = filtered.filter(d => d.status === 'resolved')

  // Livestock filter options (from livestock in the selected tank, or all)
  const livestockOptions = tankFilter
    ? livestock.filter(l => l.tank_id === tankFilter)
    : livestock

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingDisease(null)
            }}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {showForm ? tc('actions.cancel') : t('addDisease')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tank Filter */}
          {tanks.length > 1 && (
            <div>
              <TankSelector
                tanks={tanks}
                value={tankFilter}
                onChange={setTankFilter}
                allLabel={tc('allTanks', { defaultValue: 'All Tanks' })}
                label={tc('filterByTank', { defaultValue: 'Filter by tank' })}
                defaultTankId={user?.default_tank_id || undefined}
              />
            </div>
          )}

          {/* Livestock Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('filterByLivestock')}
            </label>
            <select
              value={livestockFilter}
              onChange={(e) => setLivestockFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            >
              <option value="">{t('allLivestock')}</option>
              {livestockOptions.map(l => (
                <option key={l.id} value={l.id}>
                  {l.common_name || l.species_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{t('summary.activeDiseases')}</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-200">{activeDiseases.length}</p>
            </div>
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">{t('summary.monitoringDiseases')}</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{monitoringDiseases.length}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{t('summary.chronicDiseases')}</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{chronicDiseases.length}</p>
            </div>
            <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t('summary.resolvedDiseases')}</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">{resolvedDiseases.length}</p>
            </div>
            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Create Disease Form */}
      {showForm && (
        <DiseaseForm
          tanks={tanks}
          livestock={livestock}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit Disease Form */}
      {editingDisease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <DiseaseForm
              tanks={tanks}
              livestock={livestock}
              disease={editingDisease}
              onSubmit={(data) => handleUpdate(editingDisease.id, data as DiseaseRecordUpdate)}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}

      {/* Disease Records */}
      {diseases.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('noRecords')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('noRecordsDescription')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Diseases */}
          {activeDiseases.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-4 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                {t('status.active')} ({activeDiseases.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeDiseases.map(disease => (
                  <DiseaseCard
                    key={disease.id}
                    disease={disease}
                    livestock={livestock}
                    tanks={tanks}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Monitoring Diseases */}
          {monitoringDiseases.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-300 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                {t('status.monitoring')} ({monitoringDiseases.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {monitoringDiseases.map(disease => (
                  <DiseaseCard
                    key={disease.id}
                    disease={disease}
                    livestock={livestock}
                    tanks={tanks}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Chronic Diseases */}
          {chronicDiseases.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-orange-900 dark:text-orange-300 mb-4 flex items-center">
                <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                {t('status.chronic')} ({chronicDiseases.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chronicDiseases.map(disease => (
                  <DiseaseCard
                    key={disease.id}
                    disease={disease}
                    livestock={livestock}
                    tanks={tanks}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved Toggle + Section */}
          {resolvedDiseases.length > 0 && (
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${showResolved ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h2 className="text-xl font-semibold">
                  {t('status.resolved')} ({resolvedDiseases.length})
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  - {showResolved ? t('hideResolved') : t('showResolved')}
                </span>
              </button>

              {showResolved && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {resolvedDiseases.map(disease => (
                    <DiseaseCard
                      key={disease.id}
                      disease={disease}
                      livestock={livestock}
                      tanks={tanks}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewDetail={handleViewDetail}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disease Detail Modal */}
      {selectedDisease && (
        <DiseaseDetail
          disease={selectedDisease}
          livestock={livestock}
          tanks={tanks}
          consumables={consumables}
          onClose={() => setSelectedDisease(null)}
          onAddTreatment={handleAddTreatment}
          onDeleteTreatment={handleDeleteTreatment}
          onUpdateDisease={handleUpdateDiseaseFromDetail}
        />
      )}
    </div>
  )
}
