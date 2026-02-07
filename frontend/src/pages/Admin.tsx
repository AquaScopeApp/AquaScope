/**
 * Admin Dashboard Page
 *
 * Comprehensive admin panel for system management
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { adminApi } from '../api/client'
import { User, SystemStats, UserDataSummary } from '../types'

type Tab = 'overview' | 'users' | 'database'

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDataSummary, setUserDataSummary] = useState<UserDataSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editIsAdmin, setEditIsAdmin] = useState(false)
  const [importData, setImportData] = useState('')
  const [showImport, setShowImport] = useState(false)

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
        const usersData = await adminApi.listUsers()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewUserData = async (userId: string) => {
    try {
      const summary = await adminApi.getUserDataSummary(userId)
      setUserDataSummary(summary)
      const userData = await adminApi.getUser(userId)
      setSelectedUser(userData)
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleStartEdit = (user: User) => {
    setEditingUser(user.id)
    setEditUsername(user.username)
    setEditIsAdmin(user.is_admin)
  }

  const handleSaveEdit = async (userId: string) => {
    try {
      await adminApi.updateUser(userId, {
        username: editUsername,
        is_admin: editIsAdmin,
      })
      setEditingUser(null)
      loadData()
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
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
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      alert(error.response?.data?.detail || 'Failed to delete user')
    }
  }

  const handleExport = async (userId: string) => {
    try {
      const data = await adminApi.exportUserData(userId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reeflab-export-${data.user.email}-${new Date().toISOString().split('T')[0]}.json`
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
                          {u.is_admin && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">Admin</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          Created: {new Date(u.created_at).toLocaleDateString()}
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
    </div>
  )
}
