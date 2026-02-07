/**
 * Note Card Component
 *
 * Displays a single note with metadata
 */

import { formatDistanceToNow, format } from 'date-fns'
import { Note, Tank } from '../../types'

interface NoteCardProps {
  note: Note
  tanks: Tank[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, tanks, onEdit, onDelete }: NoteCardProps) {
  const tank = tanks.find((t) => t.id === note.tank_id)

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-ocean-100 p-2 rounded-lg">
            <svg
              className="w-5 h-5 text-ocean-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{tank?.name || 'Unknown Tank'}</div>
            <div className="text-sm text-gray-500">
              {format(new Date(note.created_at), 'MMM d, yyyy • h:mm a')}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onEdit(note)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-700 whitespace-pre-wrap">{note.content}</div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
          {note.updated_at !== note.created_at && (
            <span>
              Edited {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
