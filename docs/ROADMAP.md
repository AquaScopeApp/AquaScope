# AquaScope Roadmap

Planned features and improvements for future releases.

---

## Finances Module

**Priority**: High
**Status**: Planned

AquaScope already tracks purchase prices across Equipment, Consumables, and Livestock. A dedicated Finances module would aggregate this data and provide budgeting/cost analysis.

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
**Status**: Planned

- Per-tank quick-glance cards with key parameters
- Alert badges for overdue maintenance, out-of-range parameters, low stock consumables
- Recent activity feed (photos, notes, parameter entries)
- Water change schedule calendar view

---

## Data Import/Export

**Priority**: Medium
**Status**: Planned

- CSV import for bulk parameter readings
- Excel import for consumables inventory
- Full JSON export/import for backup and migration
- ATI ICP PDF auto-parse (currently manual CSV)

---

## Species Database Integration

**Priority**: Low
**Status**: Partially Done

### Done

- WoRMS integration for marine species
- iNaturalist integration for photos and taxonomy
- Species search with cached results

### Planned

- FishBase integration for freshwater species care requirements
- Compatibility checker (warn about incompatible species in same tank)
- Growth tracking with photo comparison

---

## Multi-User / Sharing

**Priority**: Low
**Status**: Planned

- Invite other users to view/edit a tank (read-only or collaborator)
- Public tank profile page (share your tank with the community)
- Community parameter benchmarks (anonymous aggregated data)
