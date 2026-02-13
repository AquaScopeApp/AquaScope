/**
 * Database Schema for Local SQLite Storage
 *
 * Mirrors the backend SQLAlchemy models and InfluxDB structure.
 * All IDs are TEXT (UUID). JSON fields stored as TEXT.
 * Timestamps stored as TEXT (ISO-8601).
 */

export const SCHEMA_VERSION = 1

export function getSchemaSQL(): string {
  return `
-- Metadata table (schema version, flags)
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tanks
CREATE TABLE IF NOT EXISTS tanks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  water_type TEXT NOT NULL DEFAULT 'saltwater',
  aquarium_subtype TEXT,
  display_volume_liters REAL,
  sump_volume_liters REAL,
  total_volume_liters REAL NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  setup_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tank Events (timeline milestones)
CREATE TABLE IF NOT EXISTS tank_events (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  event_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Parameter Readings (replaces InfluxDB)
CREATE TABLE IF NOT EXISTS parameter_readings (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parameter_type TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_params_tank_type_time
  ON parameter_readings(tank_id, parameter_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_params_tank_time
  ON parameter_readings(tank_id, timestamp);

-- Parameter Ranges (per-tank ideal ranges)
CREATE TABLE IF NOT EXISTS parameter_ranges (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  parameter_type TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_value REAL NOT NULL,
  max_value REAL NOT NULL,
  ideal_value REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  UNIQUE(tank_id, parameter_type)
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  description TEXT,
  taken_at TEXT NOT NULL,
  is_tank_display INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_photos_tank_date
  ON photos(tank_id, taken_at);

-- Livestock
CREATE TABLE IF NOT EXISTS livestock (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  species_name TEXT NOT NULL,
  common_name TEXT,
  type TEXT NOT NULL CHECK(type IN ('fish', 'coral', 'invertebrate')),
  fishbase_species_id TEXT,
  worms_id TEXT,
  inaturalist_id TEXT,
  cached_photo_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'alive' CHECK(status IN ('alive', 'dead', 'removed')),
  added_date TEXT,
  removed_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  specs TEXT,
  purchase_date TEXT,
  purchase_price TEXT,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Consumables
CREATE TABLE IF NOT EXISTS consumables (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  consumable_type TEXT NOT NULL,
  brand TEXT,
  product_name TEXT,
  quantity_on_hand REAL,
  quantity_unit TEXT,
  purchase_date TEXT,
  purchase_price TEXT,
  purchase_url TEXT,
  expiration_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Consumable Usage Log
CREATE TABLE IF NOT EXISTS consumable_usage (
  id TEXT PRIMARY KEY,
  consumable_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  quantity_used REAL NOT NULL,
  quantity_unit TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Maintenance Reminders
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  equipment_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL,
  frequency_days INTEGER NOT NULL,
  last_completed TEXT,
  next_due TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL
);

-- ICP Tests (stores full element analysis)
CREATE TABLE IF NOT EXISTS icp_tests (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  test_date TEXT NOT NULL,
  lab_name TEXT NOT NULL,
  test_id TEXT,
  water_type TEXT NOT NULL DEFAULT 'saltwater',
  sample_date TEXT,
  received_date TEXT,
  evaluated_date TEXT,
  score_major_elements REAL,
  score_minor_elements REAL,
  score_pollutants REAL,
  score_base_elements REAL,
  score_overall REAL,
  -- All element values stored as JSON blob for flexibility
  elements TEXT NOT NULL DEFAULT '{}',
  recommendations TEXT,
  dosing_instructions TEXT,
  pdf_filename TEXT,
  pdf_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Disease Records
CREATE TABLE IF NOT EXISTS disease_records (
  id TEXT PRIMARY KEY,
  livestock_id TEXT NOT NULL,
  tank_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  severity TEXT NOT NULL DEFAULT 'moderate',
  status TEXT NOT NULL DEFAULT 'active',
  detected_date TEXT NOT NULL,
  resolved_date TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (livestock_id) REFERENCES livestock(id) ON DELETE CASCADE,
  FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_disease_records_tank
  ON disease_records(tank_id, status);
CREATE INDEX IF NOT EXISTS idx_disease_records_livestock
  ON disease_records(livestock_id);

-- Disease Treatments
CREATE TABLE IF NOT EXISTS disease_treatments (
  id TEXT PRIMARY KEY,
  disease_record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  consumable_id TEXT,
  treatment_type TEXT NOT NULL,
  treatment_name TEXT NOT NULL,
  dosage TEXT,
  quantity_used REAL,
  quantity_unit TEXT,
  treatment_date TEXT NOT NULL,
  duration_days REAL,
  effectiveness TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (disease_record_id) REFERENCES disease_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_disease_treatments_record
  ON disease_treatments(disease_record_id);

-- Species Cache (cache external API results for offline use)
CREATE TABLE IF NOT EXISTS species_cache (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  query TEXT,
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  UNIQUE(source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_species_cache_query
  ON species_cache(source, query);
`
}
