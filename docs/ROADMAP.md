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
