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
import { useScrollToItem } from '../hooks/useScrollToItem'
import TankSelector from '../components/common/TankSelector'
import { useAuth } from '../hooks/useAuth'
import type { ICPTest, ICPTestSummary, Tank } from '../types'

export default function ICPTestsPage() {
  const { t } = useTranslation('icptests')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const [tests, setTests] = useState<ICPTestSummary[]>([])
  const [selectedTest, setSelectedTest] = useState<ICPTest | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [searchParams] = useSearchParams()
  const [selectedTank, setSelectedTank] = useState<string>(searchParams.get('tank') || '')
  const [uploadTankId, setUploadTankId] = useState<string>('')
  useScrollToItem(tests)

  useEffect(() => {
    loadData()
  }, [selectedTank])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [testsData, tanksData] = await Promise.all([
        icpTestsApi.list({
          tank_id: selectedTank || undefined,
        }),
        tanksApi.list(),
      ])

      setTests(testsData)
      setTanks(tanksData)

      if (tanksData.length > 0 && !uploadTankId) {
        setUploadTankId(tanksData[0].id)
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

      // Show success message with water types
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
      event.target.value = '' // Reset file input
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
      await loadData()
      if (selectedTest?.id === testId) {
        setSelectedTest(null)
      }
    } catch (error) {
      console.error('Failed to delete test:', error)
      alert(t('deleteFailed'))
    }
  }

  const getScoreColor = (score: number | null): string => {
    if (!score) return 'bg-gray-400'
    if (score >= 90) return 'bg-green-500'
    if (score >= 75) return 'bg-yellow-500'
    if (score >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getStatusBadge = (status: string | null): string => {
    if (!status) return 'bg-gray-100 text-gray-600'
    if (status === 'NORMAL') return 'bg-green-100 text-green-700'
    if (status.includes('CRITICALLY')) return 'bg-red-100 text-red-700'
    if (status.includes('ABOVE') || status.includes('BELOW')) return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-600'
  }

  const formatElementName = (key: string): string => {
    const names: Record<string, string> = {
      salinity: 'Salinity',
      kh: 'KH (Alkalinity)',
      cl: 'Chloride (Cl)',
      na: 'Sodium (Na)',
      mg: 'Magnesium (Mg)',
      s: 'Sulfur (S)',
      ca: 'Calcium (Ca)',
      k: 'Potassium (K)',
      br: 'Bromine (Br)',
      sr: 'Strontium (Sr)',
      b: 'Boron (B)',
      f: 'Fluorine (F)',
      li: 'Lithium (Li)',
      si: 'Silicon (Si)',
      i: 'Iodine (I)',
      ba: 'Barium (Ba)',
      mo: 'Molybdenum (Mo)',
      ni: 'Nickel (Ni)',
      mn: 'Manganese (Mn)',
      as: 'Arsenic (As)',
      be: 'Beryllium (Be)',
      cr: 'Chrome (Cr)',
      co: 'Cobalt (Co)',
      fe: 'Iron (Fe)',
      cu: 'Copper (Cu)',
      se: 'Selenium (Se)',
      ag: 'Silver (Ag)',
      v: 'Vanadium (V)',
      zn: 'Zinc (Zn)',
      sn: 'Tin (Sn)',
      no3: 'Nitrate (NO3)',
      p: 'Phosphorus (P)',
      po4: 'Phosphate (PO4)',
      al: 'Aluminium (Al)',
      sb: 'Antimony (Sb)',
      bi: 'Bismuth (Bi)',
      pb: 'Lead (Pb)',
      cd: 'Cadmium (Cd)',
      la: 'Lanthanum (La)',
      tl: 'Thallium (Tl)',
      ti: 'Titanium (Ti)',
      w: 'Tungsten (W)',
      hg: 'Mercury (Hg)',
    }
    return names[key] || key.toUpperCase()
  }

  const getWaterTypeLabel = (waterType: string): string => {
    if (waterType === 'saltwater') return t('waterType.saltwater')
    if (waterType === 'ro_water') return t('waterType.roWater')
    return waterType
  }

  const renderElementGroup = (title: string, elements: Array<{ key: string; unit: string }>) => {
    if (!selectedTest) return null

    // Check if any element has either a value or a status
    const hasData = elements.some((el) =>
      selectedTest[el.key as keyof ICPTest] != null ||
      selectedTest[`${el.key}_status` as keyof ICPTest] != null
    )
    if (!hasData) return null

    return (
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {elements.map((el) => {
            const value = selectedTest[el.key as keyof ICPTest]
            const status = selectedTest[`${el.key}_status` as keyof ICPTest]

            if (value == null && !status) return null

            return (
              <div key={el.key} className="bg-gray-50 p-3 rounded border">
                <div className="text-sm text-gray-600">{formatElementName(el.key)}</div>
                <div className="flex items-center justify-between mt-1">
                  <div className="font-semibold text-gray-900">
                    {value != null ? `${value} ${el.unit}` : '---'}
                  </div>
                  {status && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusBadge(
                        status as string
                      )}`}
                    >
                      {(status as string).replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('uploadNew')}</h2>
        <div className="flex items-center gap-4">
          <select
            value={uploadTankId}
            onChange={(e) => setUploadTankId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">{t('selectTank')}</option>
            {tanks.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name}
              </option>
            ))}
          </select>

          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading || !uploadTankId}
              className="hidden"
            />
            {isUploading ? t('uploading') : t('uploadATI')}
          </label>

          {isUploading && <div className="text-sm text-gray-600">{t('processing')}</div>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {t('uploadHelp')}
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <TankSelector
          tanks={tanks}
          value={selectedTank}
          onChange={setSelectedTank}
          allLabel={t('allTanks')}
          defaultTankId={user?.default_tank_id || undefined}
        />
      </div>

      {/* Tests List and Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{t('testHistory')}</h2>
              <p className="text-sm text-gray-600">{tests.length} {t('tests')}</p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-gray-500">{t('loading')}</div>
            ) : tests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t('noTests')}
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    id={`card-${test.id}`}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTest?.id === test.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleViewDetails(test.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-800">{test.lab_name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            test.water_type === 'saltwater'
                              ? 'bg-blue-100 text-blue-700'
                              : test.water_type === 'ro_water'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {getWaterTypeLabel(test.water_type)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(test.test_date).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(test.id)
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {tc('actions.delete')}
                      </button>
                    </div>

                    {/* Quality Scores */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {test.score_major_elements != null && (
                        <div>
                          <div className="text-gray-600">{t('tabs.major')}</div>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getScoreColor(
                                test.score_major_elements
                              )}`}
                            />
                            <span className="font-semibold">{test.score_major_elements}</span>
                          </div>
                        </div>
                      )}
                      {test.score_minor_elements != null && (
                        <div>
                          <div className="text-gray-600">{t('tabs.minor')}</div>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getScoreColor(
                                test.score_minor_elements
                              )}`}
                            />
                            <span className="font-semibold">{test.score_minor_elements}</span>
                          </div>
                        </div>
                      )}
                      {test.score_pollutants != null && (
                        <div>
                          <div className="text-gray-600">{t('tabs.pollutants')}</div>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getScoreColor(
                                test.score_pollutants
                              )}`}
                            />
                            <span className="font-semibold">{test.score_pollutants}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Test Details */}
        <div className="lg:col-span-2">
          {selectedTest ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedTest.lab_name} - {new Date(selectedTest.test_date).toLocaleDateString()}
                  </h2>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    selectedTest.water_type === 'saltwater'
                      ? 'bg-blue-100 text-blue-700'
                      : selectedTest.water_type === 'ro_water'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getWaterTypeLabel(selectedTest.water_type)}
                  </span>
                </div>
                {selectedTest.test_id && (
                  <p className="text-sm text-gray-600">{t('testId')} {selectedTest.test_id}</p>
                )}
              </div>

              {/* Quality Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: t('scores.major'), key: 'score_major_elements' },
                  { label: t('scores.minor'), key: 'score_minor_elements' },
                  { label: t('scores.pollutants'), key: 'score_pollutants' },
                  { label: t('scores.base'), key: 'score_base_elements' },
                ].map((score) => {
                  const value = selectedTest[score.key as keyof ICPTest]
                  if (value == null) return null

                  return (
                    <div key={score.key} className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600 mb-2">{score.label}</div>
                      <div
                        className={`text-3xl font-bold ${
                          (value as number) >= 90
                            ? 'text-green-600'
                            : (value as number) >= 75
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {value as number}
                      </div>
                      <div className="text-xs text-gray-500">/ 100</div>
                    </div>
                  )
                })}
              </div>

              {/* Element Groups */}
              <div className="space-y-6">
                {renderElementGroup('Base Elements', [
                  { key: 'salinity', unit: 'PSU' },
                  { key: 'kh', unit: '\u00b0dKH' },
                ])}

                {renderElementGroup('Major Elements (mg/l)', [
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
                ])}

                {renderElementGroup('Minor Elements (\u00b5g/l)', [
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
                ])}

                {renderElementGroup('Nutrients', [
                  { key: 'no3', unit: 'mg/l' },
                  { key: 'p', unit: '\u00b5g/l' },
                  { key: 'po4', unit: 'mg/l' },
                ])}

                {renderElementGroup('Pollutants (\u00b5g/l)', [
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
                ])}
              </div>

              {/* Cost & Notes */}
              {(selectedTest.cost || selectedTest.notes) && (
                <div className="mt-6 p-4 bg-gray-50 rounded space-y-3">
                  {selectedTest.cost && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">{t('cost')}</h4>
                      <p className="text-gray-700">{selectedTest.cost}</p>
                    </div>
                  )}
                  {selectedTest.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">{t('notes')}</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTest.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              {t('selectTest')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
