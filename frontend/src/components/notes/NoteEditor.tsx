/**
 * Note Editor Component
 *
 * Modal editor for creating and editing notes
 */

import { useState, useEffect } from 'react'
import { Note, Tank } from '../../types'

interface NoteEditorProps {
  note: Note | null
  tanks: Tank[]
  onSave: (tankId: string, content: string) => void
  onCancel: () => void
}

export default function NoteEditor({ note, tanks, onSave, onCancel }: NoteEditorProps) {
  const [tankId, setTankId] = useState(note?.tank_id || tanks[0]?.id || '')
  const [content, setContent] = useState(note?.content || '')

  useEffect(() => {
    if (note) {
      setTankId(note.tank_id)
      setContent(note.content)
    }
  }, [note])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tankId || !content.trim()) {
      return
    }
    onSave(tankId, content)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {note ? 'Edit Note' : 'New Note'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tank Selection */}
            {!note && (
              <div>
                <label htmlFor="tank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tank <span className="text-red-500">*</span>
                </label>
                <select
                  id="tank"
                  value={tankId}
                  onChange={(e) => setTankId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                >
                  {tanks.map((tank) => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Content Editor */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                placeholder="Write your observations, notes, or journal entry here...

Examples:
- Noticed coral coloration improving
- Added 2 new fish today
- Started dosing calcium
- Water change completed - 50L"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {content.trim().length} characters
              </p>
            </div>

            {/* Formatting Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <div className="font-semibold mb-1">Formatting Tips</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Press Enter twice to create paragraphs</li>
                    <li>Use bullet points with - or *</li>
                    <li>Add dates and times for clarity</li>
                    <li>Include measurements and parameters</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!tankId || !content.trim()}
                className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {note ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
