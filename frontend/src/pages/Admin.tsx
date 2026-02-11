/**
 * Admin Dashboard Page
 *
 * Comprehensive admin panel for system management
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useModuleSettings } from '../hooks/useModuleSettings'
import { useCurrency } from '../hooks/useCurrency'
import { Navigate } from 'react-router-dom'
import { adminApi } from '../api'
import { User, UserWithStats, SystemStats, UserDataSummary, Tank, StorageStats, StorageFile, ModuleSettings } from '../types'

type Tab = 'overview' | 'users' | 'database' | 'storage' | 'modules'

export default function Admin() {
  const { user } = useAuth()
  const { modules: globalModules, refresh: refreshModules } = useModuleSettings()
  const { currency: globalCurrency, refresh: refreshCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDataSummary, setUserDataSummary] = useState<UserDataSummary | null>(null)
  const [userTanks, setUserTanks] = useState<Tank[]>([])
  const [exportingTankId, setExportingTankId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [importData, setImportData] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [dbImportData, setDbImportData] = useState('')
  const [showDbImport, setShowDbImport] = useState(false)
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([])
  const [storageFilter, setStorageFilter] = useState<string>('')
  const [isDeletingOrphans, setIsDeletingOrphans] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [moduleToggles, setModuleToggles] = useState<ModuleSettings>({ ...globalModules })
  const [savingModules, setSavingModules] = useState(false)
  const [defaultCurrency, setDefaultCurrency] = useState(globalCurrency)
  const [savingGeneral, setSavingGeneral] = useState(false)

  // Redirect non-admin users
  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'overview' || activeTab === 'database') {
        const statsData = await adminApi.getSystemStats()
        setStats(statsData)
      }
      if (activeTab === 'users' || activeTab === 'overview') {
        const usersData = await adminApi.listUsersWithStats()
        setUsers(usersData)
      }
      if (activeTab === 'storage') {
        const [statsData, filesData] = await Promise.all([
          adminApi.getStorageStats(),
          adminApi.getStorageFiles(storageFilter || undefined),
        ])
        setStorageStats(statsData)
        setStorageFiles(filesData)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewUserData = async (userId: string) => {
    try {
      const [summary, userData, exportData] = await Promise.all([
        adminApi.getUserDataSummary(userId),
        adminApi.getUser(userId),
        adminApi.exportUserData(userId),
      ])
      setUserDataSummary(summary)
      setSelectedUser(userData)
      setUserTanks(exportData.tanks || [])
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleStartEdit = (user: User) => {
    setEditingUser(user.id)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditPassword('') // Don't pre-fill password
    setEditIsAdmin(user.is_admin)
  }

  const handleSaveEdit = async (userId: string) => {
    try {
      const updateData: any = {
        username: editUsername,
        email: editEmail,
        is_admin: editIsAdmin,
      }

      // Only include password if it's not empty
      if (editPassword.trim() !== '') {
        updateData.password = editPassword
      }

      await adminApi.updateUser(userId, updateData)
      setEditingUser(null)
      setEditPassword('') // Clear password field
      loadData()
    } catch (error: any) {
      console.error('Failed to update user:', error)
      const errorMessage = error.response?.data?.detail
        ? (typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : JSON.stringify(error.response.data.detail))
        : error.message || 'Failed to update user'
      alert(errorMessage)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId)
    if (!confirm(`Are you sure you want to delete user "${userToDelete?.email}"? This will delete ALL their data and cannot be undone.`)) {
      return
    }

    try {
      await adminApi.deleteUser(userId)
      loadData()
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
        setUserDataSummary(null)
        setUserTanks([])
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const handleTankExport = async (userId: string, tankId: string, tankName: string) => {
    setExportingTankId(tankId)
    try {
      const data = await adminApi.exportTankData(userId, tankId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aquascope-tank-${tankName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export tank data:', error)
      alert('Failed to export tank data')
    } finally {
      setExportingTankId(null)
    }
  }

  const handleExport = async (userId: string) => {
    try {
      const data = await adminApi.exportUserData(userId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aquascope-export-${data.user.email}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Failed to export user data')
    }
  }

  const handleImport = async (userId: string) => {
    if (!importData.trim()) {
      alert('Please paste JSON data to import')
      return
    }

    try {
      const data = JSON.parse(importData)
      const result = await adminApi.importUserData(userId, data)
      alert(`Import successful!\n${JSON.stringify(result.imported, null, 2)}`)
      setImportData('')
      setShowImport(false)
      loadData()
    } catch (error: any) {
      console.error('Failed to import data:', error)
      alert(error.response?.data?.detail || 'Failed to import data. Check JSON format.')
    }
  }

  const handleDatabaseExport = async () => {
    try {
      const data = await adminApi.exportDatabase()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aquascope-database-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export database:', error)
      alert('Failed to export database')
    }
  }

  const handleDatabaseImport = async (replace = false) => {
    if (!dbImportData.trim()) {
      alert('Please paste JSON data to import')
      return
    }

    const action = replace ? 'REPLACE' : 'ADD TO'
    const confirmed = window.confirm(
      `Are you sure you want to ${action} the database?\n\n` +
      (replace ? '⚠️ WARNING: This will DELETE all existing data first!\n\n' : '') +
      'This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      const data = JSON.parse(dbImportData)
      const result = await adminApi.importDatabase(data, replace)
      alert(`Database import successful!\n${JSON.stringify(result.imported, null, 2)}\n\n${result.note || ''}`)
      setDbImportData('')
      setShowDbImport(false)
      loadData()
    } catch (error: any) {
      console.error('Failed to import database:', error)
      alert(error.response?.data?.detail || 'Failed to import database. Check JSON format.')
    }
  }

  if (isLoading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading admin data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System administration and monitoring</p>
        </div>
        <div className="flex items-center space-x-2 bg-red-100 px-4 py-2 rounded-lg">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium text-red-800">Admin Access</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-ocean-500 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-ocean-500 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'database'
                ? 'border-ocean-500 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Database Info
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'storage'
                ? 'border-ocean-500 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Storage
          </button>
          <button
            onClick={() => { setModuleToggles({ ...globalModules }); setActiveTab('modules') }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'modules'
                ? 'border-ocean-500 text-ocean-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Modules
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-ocean-500">
              <div className="text-sm text-gray-600">Total Users</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_users}</div>
              <div className="text-xs text-gray-500 mt-1">{stats.active_users_last_30_days} active (30d)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Total Tanks</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_tanks}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="text-sm text-gray-600">Photos</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_photos}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Notes</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_notes}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="text-sm text-gray-600">Livestock</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_livestock}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <div className="text-sm text-gray-600">Reminders</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total_reminders}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="text-sm text-gray-600">Database Size</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.database_size_mb ? `${stats.database_size_mb.toFixed(1)} MB` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Users</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.slice(0, 5).map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_admin ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Admin</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">User</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className="font-medium text-gray-900">
                            {user.data_size_mb < 1
                              ? `${(user.data_size_mb * 1024).toFixed(0)} KB`
                              : `${user.data_size_mb.toFixed(2)} MB`}
                          </span>
                          <span className="text-gray-400 ml-1 text-xs">
                            ({user.total_records} rec)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Database Export/Import */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Database Backup & Restore</h2>
              <p className="text-sm text-gray-600 mt-1">Export or import the entire database</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Export Button */}
              <div>
                <button
                  onClick={handleDatabaseExport}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export Full Database (JSON)</span>
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Downloads all users, tanks, notes, livestock, reminders, and photos metadata
                </p>
              </div>

              {/* Import Section */}
              <div className="border-t pt-4">
                {!showDbImport ? (
                  <button
                    onClick={() => setShowDbImport(true)}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Import Database (JSON)</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={dbImportData}
                      onChange={(e) => setDbImportData(e.target.value)}
                      placeholder="Paste full database JSON export here..."
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDatabaseImport(false)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Add to Database
                      </button>
                      <button
                        onClick={() => handleDatabaseImport(true)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        ⚠️ Replace Database
                      </button>
                      <button
                        onClick={() => {
                          setShowDbImport(false)
                          setDbImportData('')
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Add to Database:</strong> Imports data alongside existing data (safe, no deletion)</p>
                      <p><strong>Replace Database:</strong> Deletes ALL existing data first (⚠️ DESTRUCTIVE)</p>
                      <p><strong>Note:</strong> Imported users get default password 'changeme123'</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Users ({users.length})</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    {editingUser === u.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password (leave empty to keep current)
                          </label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Enter new password..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`admin-${u.id}`}
                            checked={editIsAdmin}
                            onChange={(e) => setEditIsAdmin(e.target.checked)}
                            className="w-4 h-4 text-ocean-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`admin-${u.id}`} className="ml-2 text-sm text-gray-700">
                            Admin privileges
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveEdit(u.id)}
                            className="px-3 py-1 bg-ocean-600 text-white rounded hover:bg-ocean-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-900">{u.email}</div>
                            <div className="text-sm text-gray-600">{u.username}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-ocean-100 text-ocean-700">
                              {u.data_size_mb < 1
                                ? `${(u.data_size_mb * 1024).toFixed(0)} KB`
                                : `${u.data_size_mb.toFixed(2)} MB`}
                            </span>
                            {u.is_admin && (
                              <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">Admin</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          Created: {new Date(u.created_at).toLocaleDateString()}
                          <span className="ml-3">
                            {u.tank_count} tanks, {u.livestock_count} livestock, {u.photo_count} photos
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewUserData(u.id)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            View Data
                          </button>
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Details Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
            </div>
            <div className="p-6">
              {selectedUser && userDataSummary ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium text-gray-900">{selectedUser.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Username</div>
                    <div className="font-medium text-gray-900">{selectedUser.username}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">User ID</div>
                    <div className="font-mono text-xs text-gray-900">{selectedUser.id}</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Data Summary</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tanks</span>
                        <span className="font-medium">{userDataSummary.tanks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Photos</span>
                        <span className="font-medium">{userDataSummary.photos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Notes</span>
                        <span className="font-medium">{userDataSummary.notes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Livestock</span>
                        <span className="font-medium">{userDataSummary.livestock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reminders</span>
                        <span className="font-medium">{userDataSummary.reminders}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Total Items</span>
                        <span className="font-bold">{userDataSummary.total_items}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tank-Specific Export */}
                  {userTanks.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">Tank Exports</div>
                      <div className="space-y-2">
                        {userTanks.map((tank: Tank) => (
                          <div key={tank.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{tank.name}</div>
                              <div className="text-xs text-gray-500">
                                {tank.water_type} {tank.aquarium_subtype ? `/ ${tank.aquarium_subtype.replace(/_/g, ' ')}` : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => handleTankExport(selectedUser.id, tank.id, tank.name)}
                              disabled={exportingTankId === tank.id}
                              className="ml-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 flex-shrink-0"
                            >
                              {exportingTankId === tank.id ? 'Exporting...' : 'Export'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export/Import Section */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Data Management</div>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleExport(selectedUser.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export Data (JSON)</span>
                      </button>

                      {!showImport ? (
                        <button
                          onClick={() => setShowImport(true)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center justify-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Import Data (JSON)</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder="Paste JSON export data here..."
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleImport(selectedUser.id)}
                              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                              Import
                            </button>
                            <button
                              onClick={() => {
                                setShowImport(false)
                                setImportData('')
                              }}
                              className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a user to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && stats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Database Size</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.database_size_mb ? `${stats.database_size_mb.toFixed(2)} MB` : 'N/A'}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Records</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.total_users + stats.total_tanks + stats.total_photos +
                     stats.total_notes + stats.total_livestock + stats.total_reminders}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Table Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Users</span>
                    <span className="font-medium">{stats.total_users}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Tanks</span>
                    <span className="font-medium">{stats.total_tanks}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Photos</span>
                    <span className="font-medium">{stats.total_photos}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Notes</span>
                    <span className="font-medium">{stats.total_notes}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Livestock</span>
                    <span className="font-medium">{stats.total_livestock}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Maintenance Reminders</span>
                    <span className="font-medium">{stats.total_reminders}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Storage Stats */}
          {storageStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Total Files (DB)</div>
                <div className="text-2xl font-bold text-gray-900">{storageStats.total_files}</div>
                <div className="text-xs text-gray-500">
                  {storageStats.files_on_disk} on disk &middot; {(storageStats.total_size_bytes / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              {Object.entries(storageStats.categories).map(([cat, data]) => (
                <div key={cat} className="bg-white rounded-lg shadow p-4">
                  <div className="text-sm text-gray-600 mb-1 capitalize">{cat.replace('-', ' ')}</div>
                  <div className="text-2xl font-bold text-gray-900">{data.count}</div>
                  <div className="text-xs text-gray-500">
                    {(data.size_bytes / 1024 / 1024).toFixed(1)} MB
                    {data.missing > 0 && (
                      <span className="text-red-500 ml-1">({data.missing} missing)</span>
                    )}
                  </div>
                </div>
              ))}
              {storageStats.missing_count > 0 && (
                <div className="rounded-lg shadow p-4 bg-red-50 border border-red-200">
                  <div className="text-sm text-gray-600 mb-1">Missing Files</div>
                  <div className="text-2xl font-bold text-red-600">{storageStats.missing_count}</div>
                  <div className="text-xs text-red-500">DB records with no file on disk</div>
                </div>
              )}
              <div className={`rounded-lg shadow p-4 ${storageStats.orphan_count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
                <div className="text-sm text-gray-600 mb-1">Orphaned Files</div>
                <div className={`text-2xl font-bold ${storageStats.orphan_count > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {storageStats.orphan_count}
                </div>
                <div className="text-xs text-gray-500">
                  {(storageStats.orphan_size_bytes / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>
          )}

          {/* Per-user storage */}
          {storageStats && storageStats.per_user.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-medium text-gray-900 mb-3">Storage per User</h3>
              <div className="space-y-2">
                {storageStats.per_user.map((u) => (
                  <div key={u.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{u.email}</span>
                    <span className="text-sm font-medium">
                      {u.count} files &middot; {(u.size_bytes / 1024 / 1024).toFixed(1)} MB
                      {u.missing > 0 && (
                        <span className="text-red-500 ml-1">({u.missing} missing)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orphan cleanup */}
          {storageStats && storageStats.orphan_count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-amber-800">
                    {storageStats.orphan_count} orphaned file{storageStats.orphan_count > 1 ? 's' : ''} found
                  </h3>
                  <p className="text-sm text-amber-600 mt-1">
                    These files exist on disk but have no matching database record.
                    Cleaning them will free {(storageStats.orphan_size_bytes / 1024 / 1024).toFixed(1)} MB.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Delete all orphaned files? This cannot be undone.')) return
                    setIsDeletingOrphans(true)
                    try {
                      const result = await adminApi.deleteOrphans()
                      alert(`Deleted ${result.deleted} files, freed ${(result.freed_bytes / 1024 / 1024).toFixed(1)} MB`)
                      loadData()
                    } catch (error) {
                      console.error('Failed to delete orphans:', error)
                      alert('Failed to delete orphans')
                    } finally {
                      setIsDeletingOrphans(false)
                    }
                  }}
                  disabled={isDeletingOrphans}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap ml-4"
                >
                  {isDeletingOrphans ? 'Cleaning...' : 'Clean Up'}
                </button>
              </div>
            </div>
          )}

          {/* Download All */}
          {storageStats && storageStats.total_files > 0 && (
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  setIsDownloadingAll(true)
                  try {
                    await adminApi.downloadAllFiles()
                  } catch (err) {
                    console.error('Download failed:', err)
                  } finally {
                    setIsDownloadingAll(false)
                  }
                }}
                disabled={isDownloadingAll}
                className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isDownloadingAll ? 'Downloading...' : `Download All (${(storageStats.total_size_bytes / 1024 / 1024).toFixed(1)} MB)`}
              </button>
            </div>
          )}

          {/* File browser */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Files</h3>
              <select
                value={storageFilter}
                onChange={(e) => {
                  setStorageFilter(e.target.value)
                  // Reload with new filter
                  adminApi.getStorageFiles(undefined, e.target.value || undefined).then(setStorageFiles)
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All categories</option>
                <option value="photos">Photos</option>
                <option value="thumbnails">Thumbnails</option>
                <option value="tank-images">Tank Images</option>
                <option value="icp-tests">ICP Tests</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tank</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {storageFiles.map((file) => (
                    <tr key={file.path} className={file.is_missing ? 'bg-red-50' : file.is_orphan ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-3 text-gray-900 truncate max-w-xs" title={file.path}>
                        {file.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {file.category.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{file.owner_email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{file.tank_name || '-'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {file.is_missing
                          ? '-'
                          : file.size_bytes > 1024 * 1024
                            ? `${(file.size_bytes / 1024 / 1024).toFixed(1)} MB`
                            : `${(file.size_bytes / 1024).toFixed(0)} KB`}
                      </td>
                      <td className="px-4 py-3">
                        {file.is_missing ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            Missing
                          </span>
                        ) : file.is_orphan ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            Orphan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!file.is_missing && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/admin/storage/download/${file.path}`}
                            onClick={(e) => {
                              e.preventDefault()
                              const token = localStorage.getItem('aquascope_token')
                              const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/admin/storage/download/${file.path}`
                              fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                                .then(res => res.blob())
                                .then(blob => {
                                  const a = document.createElement('a')
                                  a.href = URL.createObjectURL(blob)
                                  a.download = file.name
                                  a.click()
                                  URL.revokeObjectURL(a.href)
                                })
                            }}
                            className="text-ocean-600 hover:text-ocean-700 text-xs font-medium"
                          >
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {storageFiles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No files found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modules Tab ─────────────────────────────────────────── */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Active Modules</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enable or disable modules for all users. Disabled modules are hidden from the sidebar but their data is preserved.
              Parameters and Tanks are core modules and cannot be disabled.
            </p>

            <div className="space-y-4">
              {/* Core modules (always on) */}
              {[
                { key: 'parameters', label: 'Parameters', icon: '📊', core: true },
                { key: 'tanks', label: 'Tanks', icon: '🐠', core: true },
              ].map((mod) => (
                <div key={mod.key} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg opacity-60">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{mod.icon}</span>
                    <div>
                      <span className="font-medium text-gray-900">{mod.label}</span>
                      <span className="ml-2 text-xs text-gray-500">(core — always on)</span>
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-ocean-600 rounded-full relative cursor-not-allowed">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
              ))}

              {/* Toggleable modules */}
              {([
                { key: 'photos' as keyof ModuleSettings, label: 'Photos', icon: '📷' },
                { key: 'notes' as keyof ModuleSettings, label: 'Notes', icon: '📝' },
                { key: 'maintenance' as keyof ModuleSettings, label: 'Maintenance', icon: '🔧' },
                { key: 'livestock' as keyof ModuleSettings, label: 'Livestock', icon: '🐟' },
                { key: 'equipment' as keyof ModuleSettings, label: 'Equipment', icon: '⚙️' },
                { key: 'consumables' as keyof ModuleSettings, label: 'Consumables', icon: '🧪' },
                { key: 'icp_tests' as keyof ModuleSettings, label: 'ICP Tests', icon: '🔬' },
                { key: 'finances' as keyof ModuleSettings, label: 'Finances', icon: '💰' },
              ]).map((mod) => (
                <div key={mod.key} className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{mod.icon}</span>
                    <span className="font-medium text-gray-900">{mod.label}</span>
                  </div>
                  <button
                    onClick={() => setModuleToggles((prev) => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      moduleToggles[mod.key] ? 'bg-ocean-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      moduleToggles[mod.key] ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  setSavingModules(true)
                  try {
                    await adminApi.updateModuleSettings({ ...moduleToggles })
                    await refreshModules()
                    alert('Module settings saved!')
                  } catch (error) {
                    console.error('Failed to save module settings:', error)
                    alert('Failed to save settings')
                  } finally {
                    setSavingModules(false)
                  }
                }}
                disabled={savingModules}
                className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
              >
                {savingModules ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">General Settings</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure default settings for all users.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                >
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CHF">CHF — Swiss Franc</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="JPY">JPY — Japanese Yen</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Used for formatting prices across the app when displaying costs.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  setSavingGeneral(true)
                  try {
                    await adminApi.updateGeneralSettings({ default_currency: defaultCurrency })
                    await refreshCurrency()
                    alert('General settings saved!')
                  } catch (error) {
                    console.error('Failed to save general settings:', error)
                    alert('Failed to save settings')
                  } finally {
                    setSavingGeneral(false)
                  }
                }}
                disabled={savingGeneral}
                className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:opacity-50"
              >
                {savingGeneral ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
