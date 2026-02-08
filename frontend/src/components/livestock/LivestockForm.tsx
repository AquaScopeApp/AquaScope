/**
 * Livestock Form Component
 *
 * Form for adding and editing livestock with FishBase search integration
 */

import { useState, useEffect } from 'react'
import { Livestock, Tank, LivestockCreate } from '../../types'
import { livestockApi } from '../../api/client'

interface LivestockFormProps {
  tanks: Tank[]
  livestock?: Livestock
  onSubmit: (data: LivestockCreate) => void
  onCancel: () => void
}

export default function LivestockForm({
  tanks,
  livestock,
  onSubmit,
  onCancel,
}: LivestockFormProps) {
  const [tankId, setTankId] = useState('')
  const [speciesName, setSpeciesName] = useState('')
  const [commonName, setCommonName] = useState('')
  const [type, setType] = useState<'fish' | 'coral' | 'invertebrate'>('fish')
  const [fishbaseSpeciesId, setFishbaseSpeciesId] = useState('')
  const [addedDate, setAddedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // FishBase search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (livestock) {
      setTankId(livestock.tank_id)
      setSpeciesName(livestock.species_name)
      setCommonName(livestock.common_name || '')
      setType(livestock.type)
      setFishbaseSpeciesId(livestock.fishbase_species_id || '')
      setAddedDate(livestock.added_date || '')
      setNotes(livestock.notes || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setAddedDate(today)
    }
  }, [livestock])

  const handleFishBaseSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return

    setIsSearching(true)
    try {
      const results = await livestockApi.searchFishBase(searchQuery)

      // Enhance results with thumbnails
      const enhancedResults = await Promise.all(
        results.slice(0, 5).map(async (result) => {
          try {
            const specCode = result.SpecCode || result.species_id
            if (specCode) {
              const images = await livestockApi.getFishBaseSpeciesImages(String(specCode))
              if (images && images.length > 0) {
                result.thumbnail = images[0].ThumbPic || images[0].Pic
              }
            }
          } catch (error) {
            // Continue without thumbnail if fetch fails
          }
          return result
        })
      )

      setSearchResults(enhancedResults)
    } catch (error) {
      console.error('Error searching FishBase:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectFishBaseResult = (result: any) => {
    // FishBase API returns different field names
    const genus = result.Genus || ''
    const species = result.Species || ''
    const scientificName = genus && species ? `${genus} ${species}` : result.scientific_name || ''
    const commonName = result.FBname || result.ComName || result.common_name || ''
    const speciesId = String(result.SpecCode || result.species_id || result.id || '')

    setSpeciesName(scientificName)
    setCommonName(commonName)
    setFishbaseSpeciesId(speciesId)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: LivestockCreate = {
        tank_id: tankId,
        species_name: speciesName,
        common_name: commonName || undefined,
        type,
        fishbase_species_id: fishbaseSpeciesId || undefined,
        added_date: addedDate || undefined,
        notes: notes || undefined,
      }

      await onSubmit(data)

      // Reset form if adding new livestock
      if (!livestock) {
        setSpeciesName('')
        setCommonName('')
        setType('fish')
        setFishbaseSpeciesId('')
        const today = new Date().toISOString().split('T')[0]
        setAddedDate(today)
        setNotes('')
      }
    } catch (error) {
      console.error('Error submitting livestock:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {livestock ? 'Edit Livestock' : 'Add New Livestock'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tank Selection */}
          <div>
            <label htmlFor="tank" className="block text-sm font-medium text-gray-700 mb-2">
              Tank <span className="text-red-500">*</span>
            </label>
            <select
              id="tank"
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              required
              disabled={!!livestock}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 disabled:bg-gray-100"
            >
              <option value="">Select a tank</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('fish')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'fish'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🐠</div>
                <div className="text-sm font-medium">Fish</div>
              </button>
              <button
                type="button"
                onClick={() => setType('coral')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'coral'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🪸</div>
                <div className="text-sm font-medium">Coral</div>
              </button>
              <button
                type="button"
                onClick={() => setType('invertebrate')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'invertebrate'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🦐</div>
                <div className="text-sm font-medium">Invertebrate</div>
              </button>
            </div>
          </div>

          {/* FishBase Search (for fish only) */}
          {type === 'fish' && !livestock && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search FishBase (Optional)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleFishBaseSearch())}
                  placeholder="e.g., clownfish, tang, goby..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
                <button
                  type="button"
                  onClick={handleFishBaseSearch}
                  disabled={isSearching || searchQuery.length < 2}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 bg-white border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                  {searchResults.map((result, index) => {
                    const genus = result.Genus || ''
                    const species = result.Species || ''
                    const scientificName = genus && species ? `${genus} ${species}` : ''
                    const commonName = result.FBname || result.ComName || result.common_name || 'Unknown'

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectFishBaseResult(result)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0 flex items-center space-x-3"
                      >
                        {/* Thumbnail */}
                        {result.thumbnail ? (
                          <img
                            src={result.thumbnail}
                            alt={commonName}
                            className="w-16 h-16 object-contain bg-blue-50 rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-blue-50 rounded flex items-center justify-center text-2xl">
                            🐠
                          </div>
                        )}

                        {/* Species Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {commonName}
                          </div>
                          {scientificName && (
                            <div className="text-sm text-gray-600 italic">
                              {scientificName}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Species Name */}
          <div>
            <label htmlFor="speciesName" className="block text-sm font-medium text-gray-700 mb-2">
              Scientific Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="speciesName"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              required
              placeholder="e.g., Amphiprion ocellaris"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Common Name */}
          <div>
            <label htmlFor="commonName" className="block text-sm font-medium text-gray-700 mb-2">
              Common Name
            </label>
            <input
              type="text"
              id="commonName"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              placeholder="e.g., Clownfish"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Added Date */}
          <div>
            <label htmlFor="addedDate" className="block text-sm font-medium text-gray-700 mb-2">
              Date Added
            </label>
            <input
              type="date"
              id="addedDate"
              value={addedDate}
              onChange={(e) => setAddedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Source, price, behavior observations, care notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tankId || !speciesName}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : livestock ? 'Update Livestock' : 'Add Livestock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
