/**
 * Livestock Form Component
 *
 * Form for adding and editing livestock with multi-source species search
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Livestock, Tank, LivestockCreate, LivestockStatus } from '../../types'
import { livestockApi } from '../../api'

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
  const { t } = useTranslation('livestock')
  const { t: tc } = useTranslation('common')
  const [tankId, setTankId] = useState('')
  const [speciesName, setSpeciesName] = useState('')
  const [commonName, setCommonName] = useState('')
  const [type, setType] = useState<'fish' | 'coral' | 'invertebrate'>('fish')
  const [status, setStatus] = useState<LivestockStatus>('alive')
  const [fishbaseSpeciesId, setFishbaseSpeciesId] = useState('')
  const [wormsId, setWormsId] = useState('')
  const [inaturalistId, setInaturalistId] = useState('')
  const [cachedPhotoUrl, setCachedPhotoUrl] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addedDate, setAddedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [removedDate, setRemovedDate] = useState('')
  const [purchaseUrl, setPurchaseUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Multi-source species search
  const [searchSource, setSearchSource] = useState<'worms' | 'inaturalist' | 'fishbase'>('inaturalist')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (livestock) {
      setTankId(livestock.tank_id)
      setSpeciesName(livestock.species_name)
      setCommonName(livestock.common_name || '')
      setType(livestock.type)
      setStatus(livestock.status || 'alive')
      setQuantity(livestock.quantity || 1)
      setFishbaseSpeciesId(livestock.fishbase_species_id || '')
      setWormsId(livestock.worms_id || '')
      setInaturalistId(livestock.inaturalist_id || '')
      setCachedPhotoUrl(livestock.cached_photo_url || '')
      setAddedDate(livestock.added_date || '')
      setRemovedDate(livestock.removed_date || '')
      setNotes(livestock.notes || '')
      setPurchasePrice(livestock.purchase_price || '')
      setPurchaseUrl(livestock.purchase_url || '')
    } else {
      const today = new Date().toISOString().split('T')[0]
      setAddedDate(today)
    }
  }, [livestock])

  const handleSpeciesSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return

    setIsSearching(true)
    setSearchError('')
    try {
      let results: any[] = []

      switch (searchSource) {
        case 'worms':
          results = await livestockApi.searchWoRMS(searchQuery)
          break
        case 'inaturalist':
          results = await livestockApi.searchINaturalist(searchQuery)
          break
        case 'fishbase':
          results = await livestockApi.searchFishBase(searchQuery)
          break
      }

      if (results.length === 0) {
        setSearchError(
          searchSource === 'worms'
            ? t('search.noResultsWorms')
            : searchSource === 'fishbase'
            ? t('search.noResultsFishbase')
            : t('search.noResultsINaturalist')
        )
        setSearchResults([])
        return
      }

      // Enhance WoRMS results with iNaturalist photos
      if (searchSource === 'worms') {
        const enhanced = await Promise.all(
          results.slice(0, 5).map(async (result) => {
            try {
              const inatResults = await livestockApi.searchINaturalist(
                result.scientificname,
                1
              )
              if (inatResults[0]?.default_photo) {
                result.thumbnail = inatResults[0].default_photo.medium_url
                result.inaturalist_id = inatResults[0].id
              }
            } catch {
              // Continue without photo if fetch fails
            }
            return result
          })
        )
        setSearchResults(enhanced)
      } else if (searchSource === 'fishbase') {
        const enhanced = await Promise.all(
          results.slice(0, 5).map(async (result) => {
            try {
              const specCode = result.SpecCode || result.species_id
              if (specCode) {
                const images = await livestockApi.getFishBaseSpeciesImages(String(specCode))
                if (images && images.length > 0) {
                  result.thumbnail = images[0].ThumbPic || images[0].Pic
                }
              }
            } catch {
              // Continue without thumbnail if fetch fails
            }
            return result
          })
        )
        setSearchResults(enhanced)
      } else {
        setSearchResults(results.slice(0, 5))
      }
    } catch (error) {
      console.error('Species search error:', error)
      setSearchError(t('search.searchFailed'))
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSpeciesSearch()
    }
  }

  const handleSelectResult = (result: any) => {
    let scientificName = ''
    let commonNameValue = ''
    let photoUrl = ''

    if (searchSource === 'worms') {
      scientificName = result.scientificname || result.valid_name || ''
      commonNameValue = ''
      setWormsId(String(result.AphiaID || ''))

      if (result.inaturalist_id) {
        setInaturalistId(String(result.inaturalist_id))
        photoUrl = result.thumbnail || ''
      }
    } else if (searchSource === 'inaturalist') {
      scientificName = result.name || ''
      commonNameValue = result.preferred_common_name || ''
      setInaturalistId(String(result.id || ''))
      photoUrl = result.default_photo?.medium_url || ''
    } else if (searchSource === 'fishbase') {
      const genus = result.Genus || ''
      const species = result.Species || ''
      scientificName = genus && species ? `${genus} ${species}` : ''
      commonNameValue = result.FBname || result.ComName || ''
      setFishbaseSpeciesId(String(result.SpecCode || ''))
      photoUrl = result.thumbnail || ''
    }

    setSpeciesName(scientificName)
    setCommonName(commonNameValue)
    setCachedPhotoUrl(photoUrl)
    setSearchResults([])
    setSearchQuery('')
    setSearchError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: any = {
        tank_id: tankId,
        species_name: speciesName,
        common_name: commonName || undefined,
        type,
        quantity,
        status,
        fishbase_species_id: fishbaseSpeciesId || undefined,
        worms_id: wormsId || undefined,
        inaturalist_id: inaturalistId || undefined,
        cached_photo_url: cachedPhotoUrl || undefined,
        added_date: addedDate || undefined,
        removed_date: (status === 'dead' || status === 'removed') ? (removedDate || undefined) : null,
        notes: notes || undefined,
        purchase_price: purchasePrice || undefined,
        purchase_url: purchaseUrl || undefined,
      }

      await onSubmit(data)

      if (!livestock) {
        setSpeciesName('')
        setCommonName('')
        setType('fish')
        setQuantity(1)
        setStatus('alive')
        setFishbaseSpeciesId('')
        setWormsId('')
        setInaturalistId('')
        setCachedPhotoUrl('')
        const today = new Date().toISOString().split('T')[0]
        setAddedDate(today)
        setNotes('')
        setPurchasePrice('')
        setPurchaseUrl('')
      }
    } catch (error) {
      console.error('Error submitting livestock:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {livestock ? t('editLivestock') : t('addLivestock')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tank Selection */}
          <div>
            <label htmlFor="tank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.tank')} <span className="text-red-500">*</span>
            </label>
            <select
              id="tank"
              value={tankId}
              onChange={(e) => setTankId(e.target.value)}
              required
              disabled={!!livestock}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
            >
              <option value="">{t('form.selectTank')}</option>
              {tanks.map((tank) => (
                <option key={tank.id} value={tank.id}>
                  {tank.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.type')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('fish')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'fish'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🐠</div>
                <div className="text-sm font-medium">{t('form.fish')}</div>
              </button>
              <button
                type="button"
                onClick={() => setType('coral')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'coral'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🪸</div>
                <div className="text-sm font-medium">{t('form.coral')}</div>
              </button>
              <button
                type="button"
                onClick={() => setType('invertebrate')}
                className={`p-4 border-2 rounded-md transition-colors ${
                  type === 'invertebrate'
                    ? 'border-ocean-500 bg-ocean-50'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">🦐</div>
                <div className="text-sm font-medium">{t('form.invertebrate')}</div>
              </button>
            </div>
          </div>

          {/* Species Search - Available for ALL types */}
          {!livestock && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.searchSpecies')}
              </label>

              {/* Source Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { setSearchSource('worms'); setSearchResults([]); setSearchError('') }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    searchSource === 'worms'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  WoRMS
                  <div className="text-xs opacity-75">{t('form.allSpecies')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchSource('inaturalist'); setSearchResults([]); setSearchError('') }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    searchSource === 'inaturalist'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  iNaturalist
                  <div className="text-xs opacity-75">{t('form.withPhotos')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchSource('fishbase'); setSearchResults([]); setSearchError('') }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    searchSource === 'fishbase'
                      ? 'bg-ocean-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  FishBase
                  <div className="text-xs opacity-75">{t('form.fishOnly')}</div>
                </button>
              </div>

              {/* Search Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={
                    searchSource === 'worms' ? t('search.placeholderWorms') :
                    searchSource === 'inaturalist' ? t('search.placeholderINaturalist') :
                    t('search.placeholderFishbase')
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                />
                <button
                  type="button"
                  onClick={handleSpeciesSearch}
                  disabled={isSearching || searchQuery.length < 2}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
                >
                  {isSearching ? t('search.searching') : t('search.search')}
                </button>
              </div>

              {/* Search Error Message */}
              {searchError && (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  {searchError}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md max-h-64 overflow-y-auto">
                  {searchResults.map((result, index) => {
                    let scientificName = ''
                    let displayCommonName = ''
                    let photoUrl = ''

                    if (searchSource === 'worms') {
                      scientificName = result.scientificname || result.valid_name || ''
                      displayCommonName = result.preferred_common_name || t('card.unknown')
                      photoUrl = result.thumbnail || ''
                    } else if (searchSource === 'inaturalist') {
                      scientificName = result.name || ''
                      displayCommonName = result.preferred_common_name || t('card.unknown')
                      photoUrl = result.default_photo?.medium_url || ''
                    } else if (searchSource === 'fishbase') {
                      const genus = result.Genus || ''
                      const species = result.Species || ''
                      scientificName = genus && species ? `${genus} ${species}` : ''
                      displayCommonName = result.FBname || result.ComName || t('card.unknown')
                      photoUrl = result.thumbnail || ''
                    }

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex items-center space-x-3"
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayCommonName}
                            className="w-16 h-16 object-cover rounded bg-blue-50"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-blue-50 rounded flex items-center justify-center text-2xl">
                            {type === 'fish' ? '🐠' : type === 'coral' ? '🪸' : '🦐'}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {displayCommonName}
                          </div>
                          {scientificName && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {scientificName}
                            </div>
                          )}
                          {searchSource === 'worms' && result.status && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Status: {result.status}
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
            <label htmlFor="speciesName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.scientificName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="speciesName"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              required
              placeholder="e.g., Amphiprion ocellaris"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Common Name */}
          <div>
            <label htmlFor="commonName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.commonName')}
            </label>
            <input
              type="text"
              id="commonName"
              value={commonName}
              onChange={(e) => setCommonName(e.target.value)}
              placeholder="e.g., Clownfish"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.quantity')}
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('form.quantityHelp')}</p>
          </div>

          {/* Status - only show when editing */}
          {livestock && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('form.status')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setStatus('alive'); setRemovedDate('') }}
                  className={`p-3 border-2 rounded-md transition-colors ${
                    status === 'alive'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-xl mb-1">&#x2714;&#xFE0F;</div>
                  <div className="text-sm font-medium">{t('status.alive')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setStatus('dead'); if (!removedDate) setRemovedDate(new Date().toISOString().split('T')[0]) }}
                  className={`p-3 border-2 rounded-md transition-colors ${
                    status === 'dead'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-xl mb-1">&#x1FAA6;</div>
                  <div className="text-sm font-medium">{t('status.dead')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setStatus('removed'); if (!removedDate) setRemovedDate(new Date().toISOString().split('T')[0]) }}
                  className={`p-3 border-2 rounded-md transition-colors ${
                    status === 'removed'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="text-xl mb-1">&#x1F4E6;</div>
                  <div className="text-sm font-medium">{t('status.removed')}</div>
                </button>
              </div>

              {/* Removed/Dead Date - shown when status is dead or removed */}
              {(status === 'dead' || status === 'removed') && (
                <div className="mt-3">
                  <label htmlFor="removedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {status === 'dead' ? t('form.deathDate') : t('form.removedDate')}
                  </label>
                  <input
                    type="date"
                    id="removedDate"
                    value={removedDate}
                    onChange={(e) => setRemovedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Added Date */}
          <div>
            <label htmlFor="addedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.dateAdded')}
            </label>
            <input
              type="date"
              id="addedDate"
              value={addedDate}
              onChange={(e) => setAddedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.purchasePrice')}
            </label>
            <input
              type="text"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder='e.g., $29.99, €25'
              className="w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Purchase URL */}
          <div>
            <label htmlFor="purchaseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.purchaseUrl')}
            </label>
            <input
              type="url"
              id="purchaseUrl"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('form.notes')}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t('form.notesPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tc('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tankId || !speciesName}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('form.saving') : livestock ? t('form.updateLivestock') : t('form.addLivestock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
