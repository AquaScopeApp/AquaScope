# AquaScope (ReefLab)

Full-stack aquarium management system. React frontend + FastAPI backend + PostgreSQL + InfluxDB, all in Docker Compose.

## Quick Reference

- **App URL**: http://localhost (frontend on port 80, backend on port 8000)
- **DB user/password**: reeflab / changeme (from `.env`)
- **Demo user**: demo@reeflab.io / demo1234
- **Admin user**: admin@reeflab.io / admin1234

## Running

```bash
# Start all services
docker compose up -d

# Rebuild after code changes (frontend/backend)
docker compose up -d --build backend frontend

# Run database migrations
docker compose exec backend alembic upgrade head

# Seed demo data
./scripts/seed_demo.sh

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop (preserves data)
docker compose down
```

**WARNING**: NEVER use `docker compose down -v` — it destroys all database volumes.

## Port Conflicts

Other Docker projects (predomics) may occupy ports 5432 and 8000. Stop them first:
```bash
docker stop predomics-web predomics-db
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5 + Vite + Tailwind CSS |
| Backend | FastAPI + Python 3.11 + SQLAlchemy 2.0 |
| Databases | PostgreSQL 15 (relational) + InfluxDB 2.7 (time-series) |
| Testing | Backend: pytest, Frontend: vitest |
| i18n | i18next, 6 languages: en, fr, de, es, it, pt |
| Mobile | Capacitor (iOS/Android) |
| PWA | vite-plugin-pwa, offline-capable with local SQLite |

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + router registration
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── api/v1/              # Route modules (one per feature)
│   ├── services/            # Business logic
│   └── core/                # Config, security, database
├── alembic/                 # Database migrations
├── tests/                   # pytest tests
└── Dockerfile

frontend/
├── src/
│   ├── App.tsx              # Routes
│   ├── components/          # UI components (grouped by feature)
│   ├── pages/               # Page-level components
│   ├── hooks/               # Custom hooks (useAuth, useModuleSettings, useTheme)
│   ├── api/                 # Axios API clients (client.ts = web, local/ = offline)
│   ├── types/index.ts       # TypeScript interfaces (mirrors backend schemas)
│   ├── i18n/config.ts       # i18n setup
│   └── services/schema.ts   # Local SQLite schema for PWA mode
├── public/locales/          # Translation JSON files per language
└── Dockerfile

landing/                     # Standalone promotional landing page
scripts/seed_demo.sh         # Demo data seeder (13 steps)
data/species-traits.json     # Shared species compatibility database
```

## API Modules (registered in backend/app/main.py)

auth, dashboard, tanks, parameter-ranges, parameters, notes, photos, maintenance, livestock, equipment, icp-tests, admin, consumables, finances, export, share, species-traits, feeding, diseases

All endpoints are under `/api/v1/`. All are user-scoped (multi-tenant).

## Frontend Modules (toggleable in Admin)

photos, notes, livestock, equipment, consumables, maintenance, icp_tests, finances, feeding, diseases

Module visibility controlled by `useModuleSettings` hook. Defaults: all enabled.

## Key Patterns

### Adding a new feature module

1. **Backend**: model in `models/`, schema in `schemas/`, router in `api/v1/`, register in `main.py`, migration in `alembic/versions/`
2. **Frontend**: types in `types/index.ts`, API client in `api/client.ts`, local API in `api/local/`, page in `pages/`, components in `components/<module>/`
3. **i18n**: new namespace JSON in `public/locales/{en,fr,de,es,it,pt}/`, register in `i18n/config.ts`
4. **Navigation**: add to `Layout.tsx` nav items array with module guard
5. **Routing**: add to `App.tsx` routes
6. **Module settings**: add to `ModuleSettings` type + `DEFAULT_SETTINGS` in `useModuleSettings.tsx`
7. **Local SQLite**: add tables to `services/schema.ts`, implement API in `api/local/`
8. **Seed data**: add step to `scripts/seed_demo.sh`
9. **Landing**: add feature card to `landing/index.html`, screenshot to `landing/capture.mjs`

### Parent/child table pattern

Used by: feeding (schedule → logs), diseases (records → treatments), consumables (items → usage)

### Form pattern

React Hook Form + controlled components + TankSelector + datalist suggestions

### i18n namespaces

common, tanks, dashboard, parameters, maintenance, livestock, icptests, notes, photos, equipment, consumables, finances, dosing, compatibility, waterchange, feeding, diseases

## Testing

```bash
# Backend
cd backend && pytest tests/ -v --tb=short
pytest tests/ --cov=app

# Frontend
cd frontend && npm test              # watch mode
npm run test:coverage -- --run       # single run with coverage

# TypeScript check
cd frontend && npx tsc --noEmit

# Production build
cd frontend && npx vite build
```

## Database Access

```bash
# PostgreSQL shell
docker compose exec postgres psql -U reeflab

# Check tables
docker compose exec postgres psql -U reeflab -c "\dt"

# Alembic migration
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "description"
```

## Screenshot Capture (landing page)

```bash
cd landing
CAPTURE_DEMO_PASS=demo1234 CAPTURE_ADMIN_EMAIL=admin@reeflab.io CAPTURE_ADMIN_PASS=admin1234 node capture.mjs
```

## Tailwind Theme

Dark mode via `class` strategy. Custom colors: `ocean-*` (blue) and `coral-*` (red/pink). Theme stored in localStorage as `aquascope_theme`.

## Docker Services

| Service | Container | Port | Notes |
|---------|-----------|------|-------|
| postgres | aquascope-postgres | 5432 | Data in named volume |
| influxdb | aquascope-influxdb | 8086 | Time-series for parameters |
| backend | aquascope-backend | 8000 | `--reload` in dev, mounts ./backend |
| frontend | aquascope-frontend | 80 | Nginx serving built React |
| backup-cron | aquascope-backup-cron | - | Daily backups at 2 AM |

Uploads stored at `./data/uploads/` (bind mount, survives rebuilds).
