# AquaScope Roadmap

Planned features and improvements for future releases.

---

## Finances Module

**Priority**: High
**Status**: Done

AquaScope already tracks purchase prices across Equipment, Consumables, and Livestock. A dedicated Finances module would aggregate this data and provide budgeting/cost analysis.

### Done

Fully implemented in v1.8.0 with spending analysis, category/tank breakdown, monthly charts, electricity costs, and budget management.

### Scope

- **Dashboard widget**: Total cost of ownership per tank, monthly spending trend
- **Dedicated Finances page** with:
  - Spending breakdown by category (equipment, consumables, livestock, maintenance)
  - Spending breakdown by tank
  - Monthly/yearly cost charts (bar chart + line trend)
  - Cost per consumable usage (cost-per-dose tracking)
  - Budget setting and alerts (e.g., "spending over $X this month")
  - Running total / cumulative cost over time
- **Data sources**: Pull from existing `purchase_price` fields in:
  - Equipment (one-time cost)
  - Consumables (recurring cost, linked to usage frequency)
  - Livestock (one-time cost)
  - ICP tests (lab fees)
- **Export**: CSV/PDF cost reports

### Backend

- New `/api/v1/finances/` endpoints:
  - `GET /summary` — aggregated totals by category and tank
  - `GET /monthly` — monthly breakdown with chart data
  - `GET /budget` — budget status and alerts
  - `POST /budget` — set monthly/yearly budget per tank or global
- New `budgets` table (optional): tank_id, period, amount, alert_threshold

### Frontend

- New `Finances.tsx` page with Recharts visualizations
- Dashboard summary card showing monthly spend

---

## Admin Module Toggles

**Priority**: High
**Status**: Done

Allow administrators to enable/disable modules per installation. Not all users need every module — a freshwater hobbyist with one tank may only want Parameters, Notes, and Photos.

### Implementation

- `app_settings` table (key-value store) with Alembic migration
- `GET /api/v1/admin/settings/modules` — any authenticated user can read
- `PUT /api/v1/admin/settings/modules` — admin only
- Admin page: "Modules" tab with toggle switches (core modules locked on)
- `useModuleSettings()` context provides `isEnabled(module)` app-wide
- Sidebar navigation filters items based on enabled modules
- Disabled modules: hidden from UI, data preserved, API still accessible

---

## Regional & Unit Preferences

**Priority**: High
**Status**: Done

Centralize all locale-aware settings — measurement system, temperature scale, currency, and country — under a single "Regional Settings" concept. Configure during first-launch onboarding and adjustable from Admin (web) or Settings (local).

### Done

Fully implemented in v1.12.0 with `useRegionalSettings()` hook, display-only unit conversion (liters/gallons, °C/°F), post-registration onboarding wizard, Admin "General" tab, 15 country presets, and i18n in 6 languages.

### Scope

- **Unit systems**: Metric (liters, cm, kg), US Imperial (gallons, inches, lbs), UK Imperial (gallons UK, inches, stone)
- **Temperature**: °C or °F — affects parameter display, ranges, and charts
- **Currency**: Already exists (`default_currency` in `app_settings`), integrate into the same settings panel
- **Country / locale**: Optional, used for number formatting (1,000.50 vs 1.000,50), date format (DD/MM vs MM/DD), and default unit/currency presets
- **Preset profiles**: Selecting a country auto-fills sensible defaults:
  - US → US gallons, °F, USD, MM/DD
  - UK → UK gallons, °C, GBP, DD/MM
  - France/Germany/etc. → Metric, °C, EUR, DD/MM
  - Custom → pick each setting independently

### Backend

- Extend `GENERAL_SETTINGS_DEFAULTS` in `/api/v1/admin.py`:
  ```
  "unit_system": "metric",         # metric | us_imperial | uk_imperial
  "temperature_unit": "celsius",   # celsius | fahrenheit
  "default_currency": "EUR",       # existing
  "country": "",                   # ISO 3166-1 alpha-2 (optional)
  "date_format": "DD/MM/YYYY",     # DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  ```
- No new tables — uses existing `app_settings` key-value store
- CSV/parameter export respects unit preference in headers
- API continues to store/return canonical units (liters, °C) — conversion is UI-only

### Frontend

- **`useRegionalSettings()` hook** — replaces and extends `useCurrency()`:
  - Provides: `unitSystem`, `temperatureUnit`, `currency`, `country`, `dateFormat`
  - Conversion helpers: `formatVolume(liters)`, `formatTemperature(celsius)`, `formatDate(iso)`
  - Reverse helpers for form inputs: `toLiters(userValue)`, `toCelsius(userValue)`
- **Conversion constants**:
  - 1 US gallon = 3.78541 liters, 1 UK gallon = 4.54609 liters
  - °F = °C × 9/5 + 32
- **Display-only conversion** — all storage remains in liters and °C:
  - Tank forms: volume fields show unit label (L / gal), convert on save
  - Parameter forms: temperature input in user's preferred unit, convert on save
  - Parameter charts: Y-axis label and tooltip values in preferred unit
  - Dashboard sparklines: temperature values converted
  - Water Change Calculator: volumes in preferred unit
  - Dosing Calculator: volumes in preferred unit
- **Onboarding wizard** (both web and local modes):
  - After registration or first launch, show a 1-step setup screen:
    - Country selector (dropdown with flags) — auto-fills defaults
    - Unit system toggle (Metric / US / UK)
    - Temperature toggle (°C / °F)
    - Currency selector
  - "Get Started" button saves settings and continues to dashboard
  - Can be skipped (defaults to Metric / °C / EUR)
- **Admin settings panel**: new "Regional" section or tab with same controls
- **i18n**: Add `regional` namespace with unit labels, country names, onboarding text

### Migration Path

- Existing installations default to Metric / °C / EUR (no breaking change)
- All database values remain in liters and °C (canonical units)
- Conversion happens exclusively in the UI rendering layer
- Parameter ranges (min/max/ideal) stored in °C, displayed in user's preference

---

## Equipment Enhancements

**Priority**: Medium
**Status**: Partially Done

### Done

- Color-coded cards by condition (green/blue/yellow/orange/red)
- Condition filter dropdown
- Convert equipment to consumable (and vice versa)
- **Maintenance linking**: auto-create maintenance reminders when equipment condition degrades to needs_maintenance or failing; auto-deactivate when condition improves

### Planned

- **Warranty tracking**: warranty_end_date field, visual alert when expiring
- **Replacement history**: link old equipment to its replacement
- **Power consumption**: watts field per equipment, total power draw per tank

---

## Native App (Capacitor)

**Priority**: Medium
**Status**: In Progress (Phase 2)

Local-first mobile app using Capacitor + SQLite. One codebase, three deployment modes: Web (Docker), PWA, Native (App Store / Play Store).

### Remaining Work

- Complete local API implementations for all modules
- First-launch onboarding / Welcome screen
- Seed data from Excel for initial demo
- Camera integration for native photo capture
- App Store / Play Store submission
- Data export/import for portability between web and native

---

## Dashboard Improvements

**Priority**: Medium
**Status**: Done

### Done

Implemented in v1.9.0: sparklines, maturity badges, alert badges, tank images, and animated banners.

- Per-tank quick-glance cards with key parameters
- Alert badges for overdue maintenance, out-of-range parameters, low stock consumables
- Recent activity feed (photos, notes, parameter entries)
- Water change schedule calendar view

---

## Data Import/Export

**Priority**: Medium
**Status**: Partially Done

### Done

- Selective ZIP export/import
- CSV parameter export
- Excel/CSV import for historical data

### Planned

- ATI ICP PDF auto-parse (currently manual CSV)

---

## Species Database Integration

**Priority**: Low
**Status**: Partially Done

### Done

- WoRMS integration for marine species
- iNaturalist integration for photos and taxonomy
- FishBase integration for freshwater species
- Species search with cached results
- **Typeahead species lookup** — debounced search on the species name field in both create and edit modes
- Compatibility checker with 8-rule engine, heatmap matrix, and network graph
- Species traits knowledge base (data/species-traits.json) with admin CRUD API

### Planned

- Growth tracking with photo comparison

---

## Multi-User / Sharing

**Priority**: Low
**Status**: Partially Done

### Done

- Public tank profile page (shareable read-only links) — shipped in v1.9.0

### Planned

- Invite other users to view/edit a tank (read-only or collaborator)
- Community parameter benchmarks (anonymous aggregated data)

---

## Compatibility Checker Enhancements

**Priority**: Low
**Status**: Done (core), planned extensions

### Done

- 60+ species knowledge base with genus-level matching
- 8-rule compatibility engine (aggression, reef-safety, predator-prey, tank-size, etc.)
- Inline compatibility alert in livestock form (create + edit modes)
- Full tank compatibility modal with issues list
- Heatmap matrix visualization (CSS grid, color-coded, asymmetric aggressor/victim axes)
- Force-directed network graph visualization (SVG, directed edges, category-colored nodes)
- Species traits admin CRUD via API + admin UI with responsive table layout
- Shared JSON knowledge base (data/species-traits.json)
- Water type validation (frontend + backend)
- Typeahead species lookup in livestock form (debounced WoRMS/iNaturalist/FishBase search)

### Planned

- Community-contributed species traits submissions
- Per-species detailed compatibility profiles
- Compatibility score aggregation per tank

---

## Water Change Calculator — Correction Plan

**Priority**: High
**Status**: In Progress

Enhance the Water Change Calculator with a holistic correction mode that analyzes ALL parameters at once, recommends a safe multi-step schedule, and shows color-coded before/after comparisons.

### Scope

- **Color-coded Impact tab**: Current and After WC values show green/yellow/red based on parameter status
- **Correction Plan tab**: new third tab with:
  - Parameter status overview — all params with optimal/warning/critical badges
  - Smart algorithm to find the optimal WC% that improves the most parameters
  - Step-by-step schedule (e.g., "4 changes of 20% over 8 days") with configurable max % and spacing
  - Before/after comparison with status transition badges (critical → optimal)
  - Uncorrectable parameters flagged with link to Dosing Calculator
- **Stability-focused scheduling**: limits single changes to 25% (configurable), spaces them 2 days apart, caps at 6 steps (~2 weeks)

---

## Parameter Trend Predictions

**Priority**: Medium
**Status**: Planned

Using the 90-day parameter history, show simple linear trend lines on the Parameters page and dashboard. Example: "Ca dropping ~2 ppm/day, will hit 400 in 5 days". Helps aquarists anticipate problems before they happen.

### Scope

- Linear regression on the last 90 days of readings per parameter
- Trend direction indicator (rising, falling, stable) on dashboard sparklines
- Predicted value at a future date (e.g., 7 days, 14 days)
- Warning when a trend will cross min/max thresholds within the prediction window
- Visual trend line overlay on the parameter chart

---

## Parameter Alerting / Thresholds

**Priority**: Medium
**Status**: Planned

Set min/max ranges per parameter per tank and get alerts when a reading is out of range. The parameter presets infrastructure already exists — this adds the alert trigger logic and notification delivery.

### Scope

- Per-tank, per-parameter threshold configuration (min, max, warning zones)
- Dashboard badge alerts when parameters are out of range
- Push notifications (via service worker for PWA)
- Optional email notifications for critical thresholds
- Alert history log
- Snooze/acknowledge alerts to avoid repeated notifications

---

## Disease/Health Tracking

**Priority**: Medium
**Status**: Done

Track, identify, and treat fish and coral diseases with treatment timelines linked to specific livestock.

### Done

Fully implemented in v1.11.0 with disease records, treatment logging, severity/status tracking, common diseases knowledge base, and Health tab on tank detail.

### Implementation

- **Backend**: `disease_records` and `disease_treatments` tables with full CRUD API at `/api/v1/diseases/`
  - Disease records linked to livestock and tank with severity (mild/moderate/severe/critical) and status (active/monitoring/resolved/chronic)
  - Treatment types: medication, water_change, quarantine, dip, temperature, other
  - Consumable stock deduction when medication treatment is linked
  - Tank health summary endpoint with counts by status
  - Auto-set resolved_date when status changes to resolved
- **Frontend**: Diseases page with stats cards, grouped disease cards, DiseaseDetail modal with treatment timeline
  - Common diseases knowledge base (17 saltwater + 15 freshwater) for datalist suggestions
  - Health tab on tank detail page showing active disease summary
- **Local SQLite API** for offline/PWA mode
- **i18n**: Full translations in 6 languages

### Planned Extensions

- Disease identification wizard (step-by-step symptom selector with ranked diagnosis)
- Photo documentation per treatment step
- Link to external disease databases (FishBase, Coral Disease Consortium)
- Treatment protocol templates (pre-built medication/dosage/duration plans)
- Dashboard active treatment badge on tank cards

---

## Feeding Management

**Priority**: Medium
**Status**: Done

Track feeding schedules per tank with food names, quantities, frequency, and active/inactive toggles.

### Done

Fully implemented in v1.10.0 with feeding schedules and feeding logs.

### Implementation

- **Backend**: `feeding_schedules` and `feeding_logs` tables with CRUD API at `/api/v1/feeding/`
- **Frontend**: Feeding page with schedule cards, quick-log, and per-tank filtering
- **i18n**: Full translations in 6 languages

### Planned Extensions

- Visual weekly feeding calendar
- Food inventory integration with depletion estimates
- Quick-feed button on dashboard tank cards
- Species dietary requirements cross-reference
