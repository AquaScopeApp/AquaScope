/**
 * API Client
 *
 * Axios instance configured for ReefLab API with:
 * - Base URL configuration
 * - Authentication token injection
 * - Response/error interceptors
 * - Type-safe request methods
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuthToken,
  LoginCredentials,
  RegisterData,
  User,
  UserUpdate,
  SystemStats,
  UserDataSummary,
  Tank,
  TankCreate,
  TankUpdate,
  TankEvent,
  TankEventCreate,
  TankEventUpdate,
  ParameterSubmission,
  ParameterSubmissionResponse,
  ParameterReading,
  LatestParameters,
  Note,
  NoteCreate,
  NoteUpdate,
  Photo,
  PhotoUpdate,
  MaintenanceReminder,
  MaintenanceReminderCreate,
  MaintenanceReminderUpdate,
  Livestock,
  LivestockCreate,
  LivestockUpdate,
  Equipment,
  EquipmentCreate,
  EquipmentUpdate,
  ICPTest,
  ICPTestCreate,
  ICPTestUpdate,
  ICPTestSummary,
  ApiError,
} from '../types'

// API base URL - use environment variable or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_V1 = `${API_BASE_URL}/api/v1`

// ============================================================================
// Axios Instance Configuration
// ============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// ============================================================================
// Request Interceptor - Inject Auth Token
// ============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('reeflab_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ============================================================================
// Response Interceptor - Handle Errors
// ============================================================================

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      localStorage.removeItem('reeflab_token')
      localStorage.removeItem('reeflab_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// Authentication API
// ============================================================================

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthToken> => {
    const response = await apiClient.post<AuthToken>('/auth/register', data)
    return response.data
  },

  /**
   * Login with email and password
   * Note: Backend expects form data with 'username' field (OAuth2 standard)
   */
  login: async (credentials: LoginCredentials): Promise<AuthToken> => {
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await apiClient.post<AuthToken>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },
}

// ============================================================================
// Tanks API
// ============================================================================

export const tanksApi = {
  list: async (): Promise<Tank[]> => {
    const response = await apiClient.get<Tank[]>('/tanks')
    return response.data
  },

  get: async (id: string): Promise<Tank> => {
    const response = await apiClient.get<Tank>(`/tanks/${id}`)
    return response.data
  },

  create: async (data: TankCreate): Promise<Tank> => {
    const response = await apiClient.post<Tank>('/tanks', data)
    return response.data
  },

  update: async (id: string, data: TankUpdate): Promise<Tank> => {
    const response = await apiClient.put<Tank>(`/tanks/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tanks/${id}`)
  },

  // Tank Events
  listEvents: async (tankId: string): Promise<TankEvent[]> => {
    const response = await apiClient.get<TankEvent[]>(`/tanks/${tankId}/events`)
    return response.data
  },

  createEvent: async (tankId: string, data: TankEventCreate): Promise<TankEvent> => {
    const response = await apiClient.post<TankEvent>(`/tanks/${tankId}/events`, data)
    return response.data
  },

  updateEvent: async (tankId: string, eventId: string, data: TankEventUpdate): Promise<TankEvent> => {
    const response = await apiClient.put<TankEvent>(`/tanks/${tankId}/events/${eventId}`, data)
    return response.data
  },

  deleteEvent: async (tankId: string, eventId: string): Promise<void> => {
    await apiClient.delete(`/tanks/${tankId}/events/${eventId}`)
  },

  uploadImage: async (tankId: string, file: File): Promise<Tank> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<Tank>(
      `/tanks/${tankId}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  getImageBlobUrl: async (tankId: string): Promise<string> => {
    const response = await apiClient.get(`/tanks/${tankId}/image`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },
}

// ============================================================================
// Parameters API
// ============================================================================

export const parametersApi = {
  submit: async (
    data: ParameterSubmission
  ): Promise<ParameterSubmissionResponse> => {
    const response = await apiClient.post<ParameterSubmissionResponse>(
      '/parameters',
      data
    )
    return response.data
  },

  query: async (params: {
    tank_id?: string
    parameter_type?: string
    start?: string
    stop?: string
  }): Promise<ParameterReading[]> => {
    const response = await apiClient.get<ParameterReading[]>('/parameters', {
      params,
    })
    // Map time to timestamp for compatibility
    return response.data.map(reading => ({
      ...reading,
      timestamp: reading.time || reading.timestamp
    }))
  },

  latest: async (tank_id: string): Promise<LatestParameters> => {
    const response = await apiClient.get<LatestParameters>(
      '/parameters/latest',
      { params: { tank_id } }
    )
    return response.data
  },

  delete: async (params: {
    tank_id: string
    parameter_type: string
    timestamp: string
  }): Promise<void> => {
    await apiClient.delete('/parameters', { params })
  },
}

// ============================================================================
// Notes API
// ============================================================================

export const notesApi = {
  list: async (tank_id?: string): Promise<Note[]> => {
    const response = await apiClient.get<Note[]>('/notes', {
      params: tank_id ? { tank_id } : undefined,
    })
    return response.data
  },

  get: async (id: string): Promise<Note> => {
    const response = await apiClient.get<Note>(`/notes/${id}`)
    return response.data
  },

  create: async (data: NoteCreate): Promise<Note> => {
    const response = await apiClient.post<Note>('/notes', data)
    return response.data
  },

  update: async (id: string, data: NoteUpdate): Promise<Note> => {
    const response = await apiClient.put<Note>(`/notes/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notes/${id}`)
  },
}

// ============================================================================
// Photos API
// ============================================================================

export const photosApi = {
  list: async (tank_id?: string): Promise<Photo[]> => {
    const response = await apiClient.get<Photo[]>('/photos', {
      params: tank_id ? { tank_id } : undefined,
    })
    return response.data
  },

  get: async (id: string): Promise<Photo> => {
    const response = await apiClient.get<Photo>(`/photos/${id}`)
    return response.data
  },

  upload: async (formData: FormData): Promise<Photo> => {
    const response = await apiClient.post<Photo>('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getFileUrl: (id: string, thumbnail = false): string => {
    const params = thumbnail ? '?thumbnail=true' : ''
    return `${API_V1}/photos/${id}/file${params}`
  },

  // Fetch photo as blob with auth and create object URL
  getFileBlobUrl: async (id: string, thumbnail = false): Promise<string> => {
    const params = thumbnail ? '?thumbnail=true' : ''
    const response = await apiClient.get(`/photos/${id}/file${params}`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },

  update: async (id: string, data: PhotoUpdate): Promise<Photo> => {
    const response = await apiClient.put<Photo>(`/photos/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/photos/${id}`)
  },

  pin: async (id: string): Promise<Photo> => {
    const response = await apiClient.post<Photo>(`/photos/${id}/pin`)
    return response.data
  },

  unpin: async (id: string): Promise<Photo> => {
    const response = await apiClient.post<Photo>(`/photos/${id}/unpin`)
    return response.data
  },
}

// ============================================================================
// Maintenance API
// ============================================================================

export const maintenanceApi = {
  listReminders: async (params?: {
    tank_id?: string
    active_only?: boolean
    overdue_only?: boolean
  }): Promise<MaintenanceReminder[]> => {
    const response = await apiClient.get<MaintenanceReminder[]>(
      '/maintenance/reminders',
      { params }
    )
    return response.data
  },

  getReminder: async (id: string): Promise<MaintenanceReminder> => {
    const response = await apiClient.get<MaintenanceReminder>(
      `/maintenance/reminders/${id}`
    )
    return response.data
  },

  createReminder: async (
    data: MaintenanceReminderCreate
  ): Promise<MaintenanceReminder> => {
    const response = await apiClient.post<MaintenanceReminder>(
      '/maintenance/reminders',
      data
    )
    return response.data
  },

  updateReminder: async (
    id: string,
    data: MaintenanceReminderUpdate
  ): Promise<MaintenanceReminder> => {
    const response = await apiClient.put<MaintenanceReminder>(
      `/maintenance/reminders/${id}`,
      data
    )
    return response.data
  },

  completeReminder: async (
    id: string,
    completed_date?: string
  ): Promise<MaintenanceReminder> => {
    const response = await apiClient.post<MaintenanceReminder>(
      `/maintenance/reminders/${id}/complete`,
      { completed_date }
    )
    return response.data
  },

  deleteReminder: async (id: string): Promise<void> => {
    await apiClient.delete(`/maintenance/reminders/${id}`)
  },
}

// ============================================================================
// Livestock API
// ============================================================================

export const livestockApi = {
  list: async (params?: {
    tank_id?: string
    type?: string
  }): Promise<Livestock[]> => {
    const response = await apiClient.get<Livestock[]>('/livestock', { params })
    return response.data
  },

  get: async (id: string): Promise<Livestock> => {
    const response = await apiClient.get<Livestock>(`/livestock/${id}`)
    return response.data
  },

  create: async (data: LivestockCreate): Promise<Livestock> => {
    const response = await apiClient.post<Livestock>('/livestock', data)
    return response.data
  },

  update: async (id: string, data: LivestockUpdate): Promise<Livestock> => {
    const response = await apiClient.put<Livestock>(`/livestock/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/livestock/${id}`)
  },

  searchFishBase: async (query: string, limit = 10): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/livestock/fishbase/search', {
      params: { query, limit },
    })
    return response.data
  },

  getFishBaseSpecies: async (
    species_id: string,
    include_images = false
  ): Promise<any> => {
    const response = await apiClient.get<any>(
      `/livestock/fishbase/species/${species_id}`,
      { params: { include_images } }
    )
    return response.data
  },

  getFishBaseSpeciesImages: async (species_id: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(
      `/livestock/fishbase/species/${species_id}/images`
    )
    return response.data
  },
}

// ============================================================================
// Equipment API
// ============================================================================

export const equipmentApi = {
  list: async (params?: {
    tank_id?: string
    equipment_type?: string
    status?: string
  }): Promise<Equipment[]> => {
    const response = await apiClient.get<Equipment[]>('/equipment', { params })
    return response.data
  },

  get: async (id: string): Promise<Equipment> => {
    const response = await apiClient.get<Equipment>(`/equipment/${id}`)
    return response.data
  },

  create: async (data: EquipmentCreate): Promise<Equipment> => {
    const response = await apiClient.post<Equipment>('/equipment', data)
    return response.data
  },

  update: async (id: string, data: EquipmentUpdate): Promise<Equipment> => {
    const response = await apiClient.put<Equipment>(`/equipment/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/equipment/${id}`)
  },
}

// ============================================================================
// ICP Tests API
// ============================================================================

export const icpTestsApi = {
  list: async (params?: {
    tank_id?: string
    lab_name?: string
    from_date?: string
    to_date?: string
    skip?: number
    limit?: number
  }): Promise<ICPTestSummary[]> => {
    const response = await apiClient.get<ICPTestSummary[]>('/icp-tests', { params })
    return response.data
  },

  get: async (id: string): Promise<ICPTest> => {
    const response = await apiClient.get<ICPTest>(`/icp-tests/${id}`)
    return response.data
  },

  create: async (data: ICPTestCreate): Promise<ICPTest> => {
    const response = await apiClient.post<ICPTest>('/icp-tests', data)
    return response.data
  },

  upload: async (tank_id: string, file: File): Promise<ICPTest[]> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<ICPTest[]>(
      `/icp-tests/upload?tank_id=${tank_id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  update: async (id: string, data: ICPTestUpdate): Promise<ICPTest> => {
    const response = await apiClient.put<ICPTest>(`/icp-tests/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/icp-tests/${id}`)
  },
}

// ============================================================================
// Admin API
// ============================================================================

export const adminApi = {
  listUsers: async (skip = 0, limit = 100): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users', {
      params: { skip, limit },
    })
    return response.data
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${userId}`)
    return response.data
  },

  updateUser: async (userId: string, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}`, data)
    return response.data
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`)
  },

  getSystemStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get<SystemStats>('/admin/stats')
    return response.data
  },

  getUserDataSummary: async (userId: string): Promise<UserDataSummary> => {
    const response = await apiClient.get<UserDataSummary>(`/admin/users/${userId}/data-summary`)
    return response.data
  },

  exportUserData: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/admin/export/${userId}`)
    return response.data
  },

  importUserData: async (userId: string, data: any): Promise<any> => {
    const response = await apiClient.post(`/admin/import/${userId}`, data)
    return response.data
  },

  exportDatabase: async (): Promise<any> => {
    const response = await apiClient.get('/admin/database/export')
    return response.data
  },

  importDatabase: async (data: any, replace = false): Promise<any> => {
    const response = await apiClient.post('/admin/database/import', data, {
      params: { replace },
    })
    return response.data
  },
}

// ============================================================================
// Export API Client
// ============================================================================

export default apiClient
