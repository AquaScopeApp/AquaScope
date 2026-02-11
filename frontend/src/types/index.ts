/**
 * TypeScript Type Definitions for AquaScope
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
  is_admin: boolean
  default_tank_id?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UserUpdate {
  username?: string
  email?: string
  password?: string
  is_admin?: boolean
}

export interface SystemStats {
  total_users: number
  total_tanks: number
  total_parameters: number
  total_photos: number
  total_notes: number
  total_livestock: number
  total_reminders: number
  total_equipment: number
  database_size_mb: number | null
  active_users_last_30_days: number
}

export interface UserWithStats extends User {
  tank_count: number
  livestock_count: number
  equipment_count: number
  photo_count: number
  note_count: number
  reminder_count: number
  total_records: number
  data_size_mb: number
}

export interface UserDataSummary {
  user_id: string
  email: string
  username: string
  tanks: number
  photos: number
  notes: number
  livestock: number
  reminders: number
  total_items: number
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
  water_type: string           // 'freshwater' | 'saltwater' | 'brackish'
  aquarium_subtype: string | null
  display_volume_liters: number | null
  sump_volume_liters: number | null
  total_volume_liters: number
  description: string | null
  image_url: string | null
  setup_date: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
  events: TankEvent[]
}

export interface TankCreate {
  name: string
  water_type?: string
  aquarium_subtype?: string | null
  display_volume_liters?: number | null
  sump_volume_liters?: number | null
  description?: string | null
  image_url?: string | null
  setup_date?: string | null
}

export interface TankUpdate {
  name?: string
  water_type?: string
  aquarium_subtype?: string | null
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
  // Freshwater parameters
  gh?: number | null
  ammonia?: number | null
  nitrite?: number | null
}

// ============================================================================
// Parameter Range Types
// ============================================================================

export interface ParameterRangeConfig {
  parameter_type: string
  name: string
  unit: string
  min_value: number
  max_value: number
  ideal_value: number | null
}

export interface ParameterRangeResponse extends ParameterRangeConfig {
  id: string
  tank_id: string
  created_at: string
  updated_at: string
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
  is_tank_display: boolean
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
  equipment_id: string | null
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
  equipment_id?: string | null
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
  equipment_id?: string | null
  is_active?: boolean
}

// ============================================================================
// Livestock Types
// ============================================================================

export type LivestockStatus = 'alive' | 'dead' | 'removed'

export interface Livestock {
  id: string
  tank_id: string
  user_id: string
  species_name: string
  common_name: string | null
  type: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id: string | null
  worms_id: string | null  // WoRMS AphiaID
  inaturalist_id: string | null  // iNaturalist taxon ID
  cached_photo_url: string | null  // Primary photo URL
  quantity: number
  status: LivestockStatus
  added_date: string | null
  removed_date: string | null
  notes: string | null
  purchase_price: string | null
  purchase_url: string | null
  is_archived: boolean
  created_at: string
}

export interface LivestockCreate {
  tank_id: string
  species_name: string
  common_name?: string | null
  type: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id?: string | null
  worms_id?: string | null  // WoRMS AphiaID
  inaturalist_id?: string | null  // iNaturalist taxon ID
  cached_photo_url?: string | null  // Primary photo URL
  quantity?: number
  status?: LivestockStatus
  added_date?: string | null
  notes?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
}

export interface LivestockUpdate {
  species_name?: string
  common_name?: string | null
  type?: 'fish' | 'coral' | 'invertebrate'
  fishbase_species_id?: string | null
  worms_id?: string | null  // WoRMS AphiaID
  inaturalist_id?: string | null  // iNaturalist taxon ID
  cached_photo_url?: string | null  // Primary photo URL
  quantity?: number
  status?: LivestockStatus
  added_date?: string | null
  removed_date?: string | null
  notes?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
}

export interface LivestockSplitRequest {
  split_quantity: number
  new_status: 'dead' | 'removed'
}

export interface LivestockSplitResponse {
  original: Livestock
  split: Livestock
}

// ============================================================================
// Equipment Types
// ============================================================================

export interface Equipment {
  id: string
  tank_id: string
  user_id: string
  name: string
  equipment_type: string
  manufacturer: string | null
  model: string | null
  specs: Record<string, any> | null
  purchase_date: string | null
  purchase_price: string | null
  purchase_url: string | null
  condition: string | null
  status: string
  notes: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentCreate {
  tank_id: string
  name: string
  equipment_type: string
  manufacturer?: string | null
  model?: string | null
  specs?: Record<string, any> | null
  purchase_date?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
  condition?: string | null
  status?: string
  notes?: string | null
}

export interface EquipmentUpdate {
  name?: string
  equipment_type?: string
  manufacturer?: string | null
  model?: string | null
  specs?: Record<string, any> | null
  purchase_date?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
  condition?: string | null
  status?: string
  notes?: string | null
}

// ============================================================================
// Consumable Types
// ============================================================================

export interface Consumable {
  id: string
  tank_id: string
  user_id: string
  name: string
  consumable_type: string
  brand: string | null
  product_name: string | null
  quantity_on_hand: number | null
  quantity_unit: string | null
  purchase_date: string | null
  purchase_price: string | null
  purchase_url: string | null
  expiration_date: string | null
  status: string
  notes: string | null
  usage_count: number
  total_used: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ConsumableCreate {
  tank_id: string
  name: string
  consumable_type: string
  brand?: string | null
  product_name?: string | null
  quantity_on_hand?: number | null
  quantity_unit?: string | null
  purchase_date?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
  expiration_date?: string | null
  status?: string
  notes?: string | null
}

export interface ConsumableUpdate {
  name?: string
  consumable_type?: string
  brand?: string | null
  product_name?: string | null
  quantity_on_hand?: number | null
  quantity_unit?: string | null
  purchase_date?: string | null
  purchase_price?: string | null
  purchase_url?: string | null
  expiration_date?: string | null
  status?: string
  notes?: string | null
}

export interface ConsumableUsage {
  id: string
  consumable_id: string
  user_id: string
  usage_date: string
  quantity_used: number
  quantity_unit: string | null
  notes: string | null
  created_at: string
}

export interface ConsumableUsageCreate {
  usage_date: string
  quantity_used: number
  quantity_unit?: string | null
  notes?: string | null
}

// ============================================================================
// ICP Test Types
// ============================================================================

export interface ICPTest {
  id: string
  tank_id: string
  user_id: string

  // Test metadata
  test_date: string
  lab_name: string
  test_id: string | null
  water_type: string  // saltwater, ro_water, fresh_water
  sample_date: string | null
  received_date: string | null
  evaluated_date: string | null

  // Quality scores
  score_major_elements: number | null
  score_minor_elements: number | null
  score_pollutants: number | null
  score_base_elements: number | null
  score_overall: number | null

  // Base elements
  salinity: number | null
  salinity_status: string | null
  kh: number | null
  kh_status: string | null

  // Major elements (mg/l)
  cl: number | null
  cl_status: string | null
  na: number | null
  na_status: string | null
  mg: number | null
  mg_status: string | null
  s: number | null
  s_status: string | null
  ca: number | null
  ca_status: string | null
  k: number | null
  k_status: string | null
  br: number | null
  br_status: string | null
  sr: number | null
  sr_status: string | null
  b: number | null
  b_status: string | null
  f: number | null
  f_status: string | null

  // Minor elements (µg/l)
  li: number | null
  li_status: string | null
  si: number | null
  si_status: string | null
  i: number | null
  i_status: string | null
  ba: number | null
  ba_status: string | null
  mo: number | null
  mo_status: string | null
  ni: number | null
  ni_status: string | null
  mn: number | null
  mn_status: string | null
  as: number | null
  as_status: string | null
  be: number | null
  be_status: string | null
  cr: number | null
  cr_status: string | null
  co: number | null
  co_status: string | null
  fe: number | null
  fe_status: string | null
  cu: number | null
  cu_status: string | null
  se: number | null
  se_status: string | null
  ag: number | null
  ag_status: string | null
  v: number | null
  v_status: string | null
  zn: number | null
  zn_status: string | null
  sn: number | null
  sn_status: string | null

  // Nutrients
  no3: number | null
  no3_status: string | null
  p: number | null
  p_status: string | null
  po4: number | null
  po4_status: string | null

  // Pollutants (µg/l)
  al: number | null
  al_status: string | null
  sb: number | null
  sb_status: string | null
  bi: number | null
  bi_status: string | null
  pb: number | null
  pb_status: string | null
  cd: number | null
  cd_status: string | null
  la: number | null
  la_status: string | null
  tl: number | null
  tl_status: string | null
  ti: number | null
  ti_status: string | null
  w: number | null
  w_status: string | null
  hg: number | null
  hg_status: string | null

  // Additional data
  recommendations: Array<Record<string, any>> | null
  dosing_instructions: Record<string, any> | null
  pdf_filename: string | null
  pdf_path: string | null
  notes: string | null
  cost: string | null

  created_at: string
  updated_at: string
}

export interface ICPTestCreate {
  tank_id: string
  test_date: string
  lab_name: string
  test_id?: string | null
  water_type?: string  // saltwater, ro_water, fresh_water
  sample_date?: string | null
  received_date?: string | null
  evaluated_date?: string | null
  score_major_elements?: number | null
  score_minor_elements?: number | null
  score_pollutants?: number | null
  score_base_elements?: number | null
  score_overall?: number | null
  salinity?: number | null
  salinity_status?: string | null
  kh?: number | null
  kh_status?: string | null
  // ... all other element fields as optional
  [key: string]: any  // Allow other element fields
}

export interface ICPTestUpdate {
  test_date?: string
  lab_name?: string
  test_id?: string | null
  water_type?: string  // saltwater, ro_water, fresh_water
  sample_date?: string | null
  received_date?: string | null
  evaluated_date?: string | null
  notes?: string | null
  [key: string]: any  // Allow other fields for partial updates
}

export interface ICPTestSummary {
  id: string
  tank_id: string
  test_date: string
  lab_name: string
  water_type: string  // saltwater, ro_water, fresh_water
  score_overall: number | null
  score_major_elements: number | null
  score_minor_elements: number | null
  score_pollutants: number | null
  created_at: string
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

// ============================================================================
// Storage Types
// ============================================================================

export interface StorageStats {
  total_size_bytes: number
  total_files: number
  files_on_disk: number
  missing_count: number
  categories: Record<string, { count: number; size_bytes: number; missing: number }>
  per_user: Array<{
    user_id: string
    email: string
    count: number
    size_bytes: number
    missing: number
  }>
  orphan_count: number
  orphan_size_bytes: number
}

// ============================================================================
// Timeline Types
// ============================================================================

export type TimelineCategory = 'event' | 'livestock' | 'equipment' | 'photo' | 'icp_test' | 'setup'

export interface TimelineEntry {
  id: string
  date: string
  category: TimelineCategory
  title: string
  subtitle: string | null
  icon: string
  color: string
  eventType: string | null
  sourceId: string
  metadata: Record<string, any>
}

// ============================================================================
// Module Settings Types
// ============================================================================

export interface ModuleSettings {
  photos: boolean
  notes: boolean
  livestock: boolean
  equipment: boolean
  consumables: boolean
  maintenance: boolean
  icp_tests: boolean
  finances: boolean
}

export interface StorageFile {
  name: string
  path: string
  size_bytes: number
  modified: string | null
  category: string
  user_id: string | null
  owner_email: string | null
  tank_name: string | null
  is_orphan: boolean
  is_missing: boolean
}

// ============================================================================
// Finance Types
// ============================================================================

export interface CategorySpending {
  category: string
  total: number
  count: number
}

export interface TankSpending {
  tank_id: string
  tank_name: string
  total: number
  equipment: number
  consumables: number
  livestock: number
  icp_tests: number
}

export interface MonthlySpending {
  year: number
  month: number
  label: string
  total: number
  equipment: number
  consumables: number
  livestock: number
  icp_tests: number
  cumulative: number
}

export interface FinanceSummary {
  total_spent: number
  total_equipment: number
  total_consumables: number
  total_livestock: number
  total_icp_tests: number
  by_category: CategorySpending[]
  by_tank: TankSpending[]
  monthly: MonthlySpending[]
}

export interface Budget {
  id: string
  user_id: string
  tank_id: string | null
  name: string
  amount: number
  currency: string
  period: string
  category: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BudgetCreate {
  name: string
  amount: number
  currency?: string
  period?: string
  category?: string | null
  tank_id?: string | null
  is_active?: boolean
  notes?: string | null
}

export interface BudgetUpdate {
  name?: string
  amount?: number
  currency?: string
  period?: string
  category?: string | null
  tank_id?: string | null
  is_active?: boolean
  notes?: string | null
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  percentage_used: number
  is_over_budget: boolean
}

export interface ExpenseDetail {
  id: string
  name: string
  category: string
  tank_id: string
  tank_name: string
  date: string | null
  price: number | null
  price_raw: string | null
  purchase_url: string | null
}

export interface ExpenseDetailList {
  items: ExpenseDetail[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
