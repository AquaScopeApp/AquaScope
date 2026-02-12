/**
 * Note Card Component
 *
 * Compact card: 2-3 lines with click-to-expand for full text.
 */

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Note, Tank } from '../../types'

interface NoteCardProps {
  note: Note
  tanks: Tank[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, tanks, onEdit, onDelete }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false)
  const tank = tanks.find((t) => t.id === note.tank_id)

  const isLong = note.content.length > 250 || note.content.split('\n').length > 4
  const wasEdited = note.updated_at !== note.created_at

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <div className="p-3 flex items-start gap-3">
        {/* Left: date badge */}
        <div className="flex-shrink-0 text-center w-12">
          <div className="text-lg font-bold text-ocean-700 leading-tight">
            {format(new Date(note.created_at), 'd')}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase leading-tight">
            {format(new Date(note.created_at), 'MMM')}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
            {format(new Date(note.created_at), 'yyyy')}
          </div>
        </div>

        {/* Center: content */}
        <div className="flex-1 min-w-0">
          {/* Meta line: tank + time */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {tanks.length > 1 && (
              <span className="font-medium text-gray-700 dark:text-gray-300">{tank?.name || 'Unknown'}</span>
            )}
            <span>{format(new Date(note.created_at), 'h:mm a')}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
            {wasEdited && (
              <>
                <span>·</span>
                <span className="italic">edited</span>
              </>
            )}
          </div>

          {/* Note text */}
          <div className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {note.content}
          </div>

          {/* Expand hint */}
          {isLong && !expanded && (
            <button
              className="text-xs text-ocean-600 hover:text-ocean-700 mt-1 font-medium"
              onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
            >
              Show more...
            </button>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(note) }}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
