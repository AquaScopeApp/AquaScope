/**
 * TypeScript Type Definitions for ReefLab
 *
 * These types match the backend Pydantic schemas for type-safe API communication.
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  username: string // OAuth2 standard uses 'username' for email
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

// ============================================================================
// Tank Types
// ============================================================================

export interface TankEvent {
  id: string
  tank_id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  event_type: string | null
  created_at: string
  updated_at: string
}

export interface TankEventCreate {
  title: string
  description?: string | null
  event_date: string
  event_type?: string | null
}

export interface TankEventUpdate {
  title?: string
  description?: string | null
  event_date?: string
  event_type?: string | null
}

export interface Tank {
  id: string
  user_id: string
  name: string
  display_volume_liters: number | null
  sump_volume_liters: number | null
  total_volume_liters: number
  description: string | null
  image_url: string | null
  setup_date: string | null
  created_at: string
  updated_at: string
  events: TankEvent[]
}

export interface TankCreate {
  name: string
  display_volume_liters?: number | null
  sump_volume_liters?: number | null
  description?: string | null
  image_url?: string | null
  setup_date?: string | null
}

export interface TankUpdate {
  name?: string
  display_volume_liters?: number | null
  sump_volume_liters?: number | null
  description?: string | null
  image_url?: string | null
  setup_date?: string | null
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface ParameterSubmission {
  tank_id: string
  timestamp?: string | null
  calcium?: number | null
  magnesium?: number | null
  alkalinity_kh?: number | null
  nitrate?: number | null
  phosphate?: number | null
  salinity?: number | null
  temperature?: number | null
  ph?: number | null
}

export interface ParameterReading {
  time: string
  timestamp: string  // Alias for time
  tank_id: string
  parameter_type: string
  value: number
}

export interface LatestParameters {
  [key: string]: {
    value: number
    time: string
  }
}

// ============================================================================
// Note Types
// ============================================================================

export interface Note {
  id: string
  tank_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface NoteCreate {
  tank_id: string
  content: string
}

export interface NoteUpdate {
  content: string
}

// ============================================================================
// Photo Types
// ============================================================================

export interface Photo {
  id: string
  tank_id: string
  user_id: string
  filename: string
  file_path: string
  thumbnail_path: string | null
  description: string | null
  taken_at: string
  created_at: string
}

export interface PhotoUpdate {
  description?: string | null
  taken_at?: string | null
}

// ============================================================================
// Maintenance Types
// ============================================================================

export interface MaintenanceReminder {
  id: string
  tank_id: string
  user_id: string
  title: string
  description: string | null
  reminder_type: string
  frequency_days: number
  last_completed: string | null
  next_due: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaintenanceReminderCreate {
  tank_id: string
  title: string
  description?: string | null
  reminder_type: string
  frequency_days: number
  next_due: string
}

export interface MaintenanceReminderUpdate {
  title?: string
  description?: string | null
  reminder_type?: string
  frequency_days?: number
  is_active?: boolean
}

// ============================================================================
// Livestock Types
// ============================================================================

export interface Livestock {
  id: string
  tank_id: string
  user_id: string
  species_name: string
  common_name: string | null
  type: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id: string | null
  added_date: string | null
  notes: string | null
  created_at: string
}

export interface LivestockCreate {
  tank_id: string
  species_name: string
  common_name?: string | null
  type: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id?: string | null
  added_date?: string | null
  notes?: string | null
}

export interface LivestockUpdate {
  species_name?: string
  common_name?: string | null
  type?: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id?: string | null
  added_date?: string | null
  notes?: string | null
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  detail: string | { loc: string[]; msg: string; type: string }[]
}

export interface ParameterSubmissionResponse {
  message: string
  count: number
  parameters: string[]
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface DashboardStats {
  totalTanks: number
  overdueReminders: number
  recentPhotos: number
  latestParameters?: LatestParameters
}
