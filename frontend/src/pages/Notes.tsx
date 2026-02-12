/**
 * Notes Page
 *
 * Journal and observations management
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Note, Tank } from '../types'
import { notesApi, tanksApi } from '../api'
import { useScrollToItem } from '../hooks/useScrollToItem'
import TankSelector from '../components/common/TankSelector'
import Pagination from '../components/common/Pagination'
import { useAuth } from '../hooks/useAuth'
import NoteCard from '../components/notes/NoteCard'
import NoteEditor from '../components/notes/NoteEditor'

const NOTES_PER_PAGE = 10

export default function Notes() {
  const { t } = useTranslation('notes')
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchParams] = useSearchParams()
  const [selectedTankId, setSelectedTankId] = useState<string>(searchParams.get('tank') || '')
  const [currentPage, setCurrentPage] = useState(1)
  useScrollToItem(notes, NOTES_PER_PAGE, setCurrentPage)

  useEffect(() => {
    setCurrentPage(1)
    loadData()
  }, [selectedTankId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [notesData, tanksData] = await Promise.all([
        notesApi.list(selectedTankId || undefined),
        tanksApi.list(),
      ])
      setNotes(notesData)
      setTanks(tanksData)
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingNote(null)
    setShowEditor(true)
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setShowEditor(true)
  }

  const handleSave = async (tankId: string, content: string) => {
    try {
      if (editingNote) {
        await notesApi.update(editingNote.id, { content })
      } else {
        await notesApi.create({ tank_id: tankId, content })
      }
      setShowEditor(false)
      setEditingNote(null)
      loadData()
    } catch (error) {
      console.error('Failed to save note:', error)
      alert(t('saveFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) {
      return
    }

    try {
      await notesApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert(t('deleteFailed'))
    }
  }

  const handleCancel = () => {
    setShowEditor(false)
    setEditingNote(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('newNote')}</span>
        </button>
      </div>

      {/* Tank Filter */}
      {tanks.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <TankSelector
            tanks={tanks}
            value={selectedTankId}
            onChange={setSelectedTankId}
            allLabel={t('allTanks')}
            label={t('filterByTank')}
            defaultTankId={user?.default_tank_id || undefined}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-ocean-500">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalNotes')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{notes.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('thisMonth')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {notes.filter((n) => {
              const date = new Date(n.created_at)
              const now = new Date()
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            }).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('avgPerWeek')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {notes.length > 0
              ? Math.round((notes.length /
                  Math.max(1, Math.ceil((Date.now() - new Date(notes[notes.length - 1].created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)))) * 10) / 10
              : 0}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <NoteEditor
          note={editingNote}
          tanks={tanks}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('noNotes')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('startDocumenting')}
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
          >
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {notes
              .slice((currentPage - 1) * NOTES_PER_PAGE, currentPage * NOTES_PER_PAGE)
              .map((note) => (
                <div key={note.id} id={`card-${note.id}`}>
                  <NoteCard
                    note={note}
                    tanks={tanks}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(notes.length / NOTES_PER_PAGE)}
            totalItems={notes.length}
            itemsPerPage={NOTES_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}
