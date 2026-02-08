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
import { icpTestsApi, tanksApi } from '../api/client'
import type { ICPTest, ICPTestSummary, Tank } from '../types'

export default function ICPTestsPage() {
  const [tests, setTests] = useState<ICPTestSummary[]>([])
  const [selectedTest, setSelectedTest] = useState<ICPTest | null>(null)
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [uploadTankId, setUploadTankId] = useState<string>('')

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
      await icpTestsApi.upload(uploadTankId, file)
      await loadData()
      alert('ICP test uploaded and parsed successfully!')
    } catch (error: any) {
      console.error('Failed to upload ICP test:', error)
      alert(`Failed to upload: ${error.response?.data?.detail || error.message}`)
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
    if (!confirm('Are you sure you want to delete this ICP test?')) return

    try {
      await icpTestsApi.delete(testId)
      await loadData()
      if (selectedTest?.id === testId) {
        setSelectedTest(null)
      }
    } catch (error) {
      console.error('Failed to delete test:', error)
      alert('Failed to delete test')
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

  const renderElementGroup = (title: string, elements: Array<{ key: string; unit: string }>) => {
    if (!selectedTest) return null

    const hasData = elements.some((el) => selectedTest[el.key as keyof ICPTest] != null)
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
        <h1 className="text-3xl font-bold text-gray-800">ICP Water Tests</h1>
        <p className="text-gray-600">
          Upload ATI lab PDFs to automatically track trace elements and water quality
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload New Test</h2>
        <div className="flex items-center gap-4">
          <select
            value={uploadTankId}
            onChange={(e) => setUploadTankId(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Select Tank</option>
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
            {isUploading ? 'Uploading...' : 'Upload ATI PDF'}
          </label>

          {isUploading && <div className="text-sm text-gray-600">Processing...</div>}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Upload ATI Aquaristik ICP test PDF for automatic data extraction
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <select
          value={selectedTank}
          onChange={(e) => setSelectedTank(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Tanks</option>
          {tanks.map((tank) => (
            <option key={tank.id} value={tank.id}>
              {tank.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tests List and Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Test History</h2>
              <p className="text-sm text-gray-600">{tests.length} tests</p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : tests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No ICP tests yet. Upload your first test!
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTest?.id === test.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleViewDetails(test.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-800">{test.lab_name}</div>
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
                        Delete
                      </button>
                    </div>

                    {/* Quality Scores */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {test.score_major_elements != null && (
                        <div>
                          <div className="text-gray-600">Major</div>
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
                          <div className="text-gray-600">Minor</div>
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
                          <div className="text-gray-600">Pollutants</div>
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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedTest.lab_name} - {new Date(selectedTest.test_date).toLocaleDateString()}
                </h2>
                {selectedTest.test_id && (
                  <p className="text-sm text-gray-600">Test ID: {selectedTest.test_id}</p>
                )}
              </div>

              {/* Quality Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Major Elements', key: 'score_major_elements' },
                  { label: 'Minor Elements', key: 'score_minor_elements' },
                  { label: 'Pollutants', key: 'score_pollutants' },
                  { label: 'Base Elements', key: 'score_base_elements' },
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
                  { key: 'kh', unit: '°dKH' },
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

                {renderElementGroup('Minor Elements (µg/l)', [
                  { key: 'li', unit: 'µg/l' },
                  { key: 'si', unit: 'µg/l' },
                  { key: 'i', unit: 'µg/l' },
                  { key: 'ba', unit: 'µg/l' },
                  { key: 'mo', unit: 'µg/l' },
                  { key: 'ni', unit: 'µg/l' },
                  { key: 'mn', unit: 'µg/l' },
                  { key: 'as', unit: 'µg/l' },
                  { key: 'be', unit: 'µg/l' },
                  { key: 'cr', unit: 'µg/l' },
                  { key: 'co', unit: 'µg/l' },
                  { key: 'fe', unit: 'µg/l' },
                  { key: 'cu', unit: 'µg/l' },
                  { key: 'se', unit: 'µg/l' },
                  { key: 'ag', unit: 'µg/l' },
                  { key: 'v', unit: 'µg/l' },
                  { key: 'zn', unit: 'µg/l' },
                  { key: 'sn', unit: 'µg/l' },
                ])}

                {renderElementGroup('Nutrients', [
                  { key: 'no3', unit: 'mg/l' },
                  { key: 'p', unit: 'µg/l' },
                  { key: 'po4', unit: 'mg/l' },
                ])}

                {renderElementGroup('Pollutants (µg/l)', [
                  { key: 'al', unit: 'µg/l' },
                  { key: 'sb', unit: 'µg/l' },
                  { key: 'bi', unit: 'µg/l' },
                  { key: 'pb', unit: 'µg/l' },
                  { key: 'cd', unit: 'µg/l' },
                  { key: 'la', unit: 'µg/l' },
                  { key: 'tl', unit: 'µg/l' },
                  { key: 'ti', unit: 'µg/l' },
                  { key: 'w', unit: 'µg/l' },
                  { key: 'hg', unit: 'µg/l' },
                ])}
              </div>

              {/* Notes */}
              {selectedTest.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTest.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              Select a test from the list to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
