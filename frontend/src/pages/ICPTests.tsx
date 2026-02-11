/**
 * ICP Tests Page
 *
 * Manage ICP-OES water test results:
 * - Upload ATI lab PDFs for automatic data extraction
 * - View complete element analysis (50+ parameters)
 * - Track water quality scores over time
 * - Compare tests and identify trends
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { icpTestsApi, tanksApi } from '../api'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import type { ICPTest, ICPTestSummary, Tank } from '../types'

// Element group definitions
const BASE_ELEMENTS = [
  { key: 'salinity', unit: 'PSU' },
  { key: 'kh', unit: '\u00b0dKH' },
]

const MAJOR_ELEMENTS = [
  { key: 'cl', unit: 'mg/l' },
  { key: 'na', unit: 'mg/l' },
  { key: 'mg', unit: 'mg/l' },
  { key: 's', unit: 'mg/l' },
  { key: 'ca', unit: 'mg/l' },
  { key: 'k', unit: 'mg/l' },
  { key: 'br', unit: 'mg/l' },
  { key: 'sr', unit: 'mg/l' },
  { key: 'b', unit: 'mg/l' },
  { key: 'f', unit: 'mg/l' },
]

const MINOR_ELEMENTS = [
  { key: 'li', unit: '\u00b5g/l' },
  { key: 'si', unit: '\u00b5g/l' },
  { key: 'i', unit: '\u00b5g/l' },
  { key: 'ba', unit: '\u00b5g/l' },
  { key: 'mo', unit: '\u00b5g/l' },
  { key: 'ni', unit: '\u00b5g/l' },
  { key: 'mn', unit: '\u00b5g/l' },
  { key: 'as', unit: '\u00b5g/l' },
  { key: 'be', unit: '\u00b5g/l' },
  { key: 'cr', unit: '\u00b5g/l' },
  { key: 'co', unit: '\u00b5g/l' },
  { key: 'fe', unit: '\u00b5g/l' },
  { key: 'cu', unit: '\u00b5g/l' },
  { key: 'se', unit: '\u00b5g/l' },
  { key: 'ag', unit: '\u00b5g/l' },
  { key: 'v', unit: '\u00b5g/l' },
  { key: 'zn', unit: '\u00b5g/l' },
  { key: 'sn', unit: '\u00b5g/l' },
]

const NUTRIENTS = [
  { key: 'no3', unit: 'mg/l' },
  { key: 'p', unit: '\u00b5g/l' },
  { key: 'po4', unit: 'mg/l' },
]

const POLLUTANTS = [
  { key: 'al', unit: '\u00b5g/l' },
  { key: 'sb', unit: '\u00b5g/l' },
  { key: 'bi', unit: '\u00b5g/l' },
  { key: 'pb', unit: '\u00b5g/l' },
  { key: 'cd', unit: '\u00b5g/l' },
  { key: 'la', unit: '\u00b5g/l' },
  { key: 'tl', unit: '\u00b5g/l' },
  { key: 'ti', unit: '\u00b5g/l' },
  { key: 'w', unit: '\u00b5g/l' },
  { key: 'hg', unit: '\u00b5g/l' },
]

const ELEMENT_NAMES: Record<string, string> = {
  salinity: 'Salinity',
  kh: 'KH',
  cl: 'Cl', na: 'Na', mg: 'Mg', s: 'S', ca: 'Ca', k: 'K', br: 'Br', sr: 'Sr', b: 'B', f: 'F',
  li: 'Li', si: 'Si', i: 'I', ba: 'Ba', mo: 'Mo', ni: 'Ni', mn: 'Mn',
  as: 'As', be: 'Be', cr: 'Cr', co: 'Co', fe: 'Fe', cu: 'Cu', se: 'Se',
  ag: 'Ag', v: 'V', zn: 'Zn', sn: 'Sn',
  no3: 'NO\u2083', p: 'P', po4: 'PO\u2084',
  al: 'Al', sb: 'Sb', bi: 'Bi', pb: 'Pb', cd: 'Cd', la: 'La', tl: 'Tl', ti: 'Ti', w: 'W', hg: 'Hg',
}

export default function ICPTestsPage() {
  const { t } = useTranslation('icptests')

  const { user } = useAuth()
  const [tests, setTests] = useState<ICPTestSummary[]>([])
  const [selectedTest, setSelectedTest] = useState<ICPTest | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [searchParams] = useSearchParams()
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [uploadTankId, setUploadTankId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [selectedTank])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [testsData, tanksData] = await Promise.all([
        icpTestsApi.list({ tank_id: selectedTank || undefined }),
        tanksApi.list(),
      ])

      setTests(testsData)
      setTanks(tanksData)

      if (tanksData.length > 0 && !uploadTankId) {
        setUploadTankId(tanksData[0].id)
      }

      // Auto-select the latest test
      if (testsData.length > 0) {
        const latest = testsData[0]
        const detail = await icpTestsApi.get(latest.id)
        setSelectedTest(detail)
      } else {
        setSelectedTest(null)
      }
    } catch (error) {
      console.error('Failed to load ICP tests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !uploadTankId) return

    try {
      setIsUploading(true)
      const createdTests = await icpTestsApi.upload(uploadTankId, file)
      await loadData()

      const waterTypes = createdTests.map(t => t.water_type).join(', ')
      const message = createdTests.length === 1
        ? `${t('uploadSuccess')} (${waterTypes})`
        : `${createdTests.length} ${t('uploadSuccessMulti')} (${waterTypes})`
      alert(message)
    } catch (error: any) {
      console.error('Failed to upload ICP test:', error)
      alert(`${t('uploadFailed')} ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleViewDetails = async (testId: string) => {
    try {
      const test = await icpTestsApi.get(testId)
      setSelectedTest(test)
    } catch (error) {
      console.error('Failed to load test details:', error)
    }
  }

  const handleDelete = async (testId: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      await icpTestsApi.delete(testId)
      if (selectedTest?.id === testId) {
        setSelectedTest(null)
      }
      await loadData()
    } catch (error) {
      console.error('Failed to delete test:', error)
      alert(t('deleteFailed'))
    }
  }

  const getScoreColor = (score: number | null): string => {
    if (!score) return 'text-gray-400'
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number | null): string => {
    if (!score) return 'bg-gray-100'
    if (score >= 90) return 'bg-green-50'
    if (score >= 75) return 'bg-yellow-50'
    if (score >= 50) return 'bg-orange-50'
    return 'bg-red-50'
  }

  const getStatusColor = (status: string | null): string => {
    if (!status) return ''
    if (status === 'NORMAL') return 'bg-green-100 text-green-800'
    if (status.includes('CRITICALLY')) return 'bg-red-100 text-red-800'
    if (status.includes('ABOVE') || status.includes('BELOW')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-600'
  }

  const getValueCellColor = (status: string | null): string => {
    if (!status) return ''
    if (status === 'NORMAL') return 'text-green-700'
    if (status.includes('CRITICALLY')) return 'text-red-700 font-bold'
    if (status.includes('ABOVE') || status.includes('BELOW')) return 'text-orange-700 font-semibold'
    return ''
  }

  const getWaterTypeLabel = (waterType: string): string => {
    if (waterType === 'saltwater') return t('waterType.saltwater')
    if (waterType === 'ro_water') return t('waterType.roWater')
    return waterType
  }

  const renderElementTable = (title: string, elements: Array<{ key: string; unit: string }>) => {
    if (!selectedTest) return null

    const hasData = elements.some((el) =>
      selectedTest[el.key as keyof ICPTest] != null ||
      selectedTest[`${el.key}_status` as keyof ICPTest] != null
    )
    if (!hasData) return null

    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{title}</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              <th className="text-left py-1 px-2 font-medium w-16">Element</th>
              <th className="text-right py-1 px-2 font-medium w-20">Value</th>
              <th className="text-left py-1 px-2 font-medium w-12">Unit</th>
              <th className="text-left py-1 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {elements.map((el) => {
              const value = selectedTest[el.key as keyof ICPTest]
              const status = selectedTest[`${el.key}_status` as keyof ICPTest] as string | null

              if (value == null && !status) return null

              return (
                <tr key={el.key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1 px-2 font-medium text-gray-900">
                    {ELEMENT_NAMES[el.key] || el.key.toUpperCase()}
                  </td>
                  <td className={`py-1 px-2 text-right tabular-nums ${getValueCellColor(status)}`}>
                    {value != null ? String(value) : '---'}
                  </td>
                  <td className="py-1 px-2 text-gray-400 text-xs">{el.unit}</td>
                  <td className="py-1 px-2">
                    {status && (
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${getStatusColor(status)}`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Upload */}
        <div className="flex items-center gap-3">
          <select
            value={uploadTankId}
            onChange={(e) => setUploadTankId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">{t('selectTank')}</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>{tank.name}</option>
            ))}
          </select>

          <label className="cursor-pointer bg-ocean-600 text-white px-4 py-2 rounded-md hover:bg-ocean-700 text-sm font-medium">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading || !uploadTankId}
              className="hidden"
            />
            {isUploading ? t('uploading') : t('uploadATI')}
          </label>
        </div>
      </div>

      {/* Tank filter */}
      <TankSelector
        tanks={tanks}
        value={selectedTank}
        onChange={setSelectedTank}
        allLabel={t('allTanks')}
        defaultTankId={user?.default_tank_id || undefined}
      />

      {/* Timeline selector */}
      {!isLoading && tests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-1">{t('testHistory')}:</span>
            {tests.map((test) => (
              <button
                key={test.id}
                onClick={() => handleViewDetails(test.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedTest?.id === test.id
                    ? 'bg-ocean-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{new Date(test.test_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                <span className={`px-1 py-0.5 rounded text-[10px] ${
                  selectedTest?.id === test.id ? 'bg-white/20' :
                  test.water_type === 'saltwater' ? 'bg-blue-100 text-blue-700' :
                  test.water_type === 'ro_water' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {getWaterTypeLabel(test.water_type)}
                </span>
                {test.score_overall != null && (
                  <span className={`font-bold ${selectedTest?.id === test.id ? 'text-white' : getScoreColor(test.score_overall)}`}>
                    {test.score_overall}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(test.id) }}
                  className={`ml-0.5 hover:text-red-400 ${selectedTest?.id === test.id ? 'text-white/60' : 'text-gray-400'}`}
                >
                  &times;
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {t('noTests')}
        </div>
      ) : selectedTest ? (
        <div className="space-y-4">
          {/* Header + Scores */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedTest.lab_name}
              </h2>
              <span className="text-sm text-gray-500">
                {new Date(selectedTest.test_date).toLocaleDateString()}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                selectedTest.water_type === 'saltwater' ? 'bg-blue-100 text-blue-700' :
                selectedTest.water_type === 'ro_water' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {getWaterTypeLabel(selectedTest.water_type)}
              </span>
              {selectedTest.test_id && (
                <span className="text-xs text-gray-400">#{selectedTest.test_id}</span>
              )}
            </div>

            {/* Quality Scores - compact row */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: t('scores.major'), key: 'score_major_elements' },
                { label: t('scores.minor'), key: 'score_minor_elements' },
                { label: t('scores.pollutants'), key: 'score_pollutants' },
                { label: t('scores.base'), key: 'score_base_elements' },
              ].map((score) => {
                const value = selectedTest[score.key as keyof ICPTest] as number | null
                if (value == null) return null

                return (
                  <div key={score.key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getScoreBg(value)}`}>
                    <span className="text-xs text-gray-600">{score.label}</span>
                    <span className={`text-lg font-bold ${getScoreColor(value)}`}>{value}</span>
                    <span className="text-xs text-gray-400">/100</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Element Tables - 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              {renderElementTable('Base Elements', BASE_ELEMENTS)}
              {renderElementTable('Major Elements (mg/l)', MAJOR_ELEMENTS)}
              {renderElementTable('Nutrients', NUTRIENTS)}
            </div>
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              {renderElementTable('Minor Elements (\u00b5g/l)', MINOR_ELEMENTS)}
              {renderElementTable('Pollutants (\u00b5g/l)', POLLUTANTS)}
            </div>
          </div>

          {/* Cost & Notes */}
          {(selectedTest.cost || selectedTest.notes) && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex gap-6">
                {selectedTest.cost && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">{t('cost')}</span>
                    <p className="text-gray-900 font-semibold">{selectedTest.cost}</p>
                  </div>
                )}
                {selectedTest.notes && (
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">{t('notes')}</span>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{selectedTest.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {t('selectTest')}
        </div>
      )}
    </div>
  )
}
