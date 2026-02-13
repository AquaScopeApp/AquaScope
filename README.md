<p align="center">
  <img src="docs/images/logo.png" alt="AquaScope" width="180" />
</p>

<h1 align="center">AquaScope</h1>

<p align="center">
  <strong>A comprehensive, self-hosted aquarium management platform — track parameters, maintenance, livestock compatibility, finances, and more.</strong>
</p>

<p align="center">
  <a href="https://github.com/AquaScopeApp/AquaScope/actions/workflows/ci.yml"><img src="https://github.com/AquaScopeApp/AquaScope/actions/workflows/ci.yml/badge.svg" alt="CI Tests" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/AquaScopeApp/AquaScope/releases"><img src="https://img.shields.io/github/v/release/AquaScopeApp/AquaScope?color=success" alt="Release" /></a>
  <a href="https://github.com/AquaScopeApp/AquaScope/issues"><img src="https://img.shields.io/github/issues/AquaScopeApp/AquaScope?color=yellow" alt="Issues" /></a>
  <a href="https://github.com/AquaScopeApp/AquaScope/pulls"><img src="https://img.shields.io/github/issues-pr/AquaScopeApp/AquaScope?color=brightgreen" alt="Pull Requests" /></a>
  <a href="https://github.com/AquaScopeApp/AquaScope/stargazers"><img src="https://img.shields.io/github/stars/AquaScopeApp/AquaScope?style=social" alt="Stars" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
</p>

> **Created by [Edi Prifti](https://github.com/eprifti)** with love for the aquarium keeping community

---

## Why AquaScope?

Aquarium keeping is incredibly rewarding — but it's also an expensive hobby. Between tanks, livestock, equipment, tests, and consumables, costs add up fast. When I looked for tools to log parameters and track long-term trends, the options were disappointing: paid subscriptions, locked "pro" features, closed ecosystems, or abandoned projects.

As a developer and aquarist, I decided to build what I couldn't find.

**The philosophy is simple:**

- **Free forever** — no subscriptions, no paid tiers
- **Fully open-source** — transparent, hackable, auditable
- **Your data stays yours** — self-hosted, no cloud dependency
- **Built by an aquarist, for aquarists** — from reef to freshwater to brackish
- **Modular & extensible** — adapt it to DIY monitoring, sensors, or research

> The hobby is already costly enough — logging and understanding your aquarium shouldn't be.

<p align="center">
  <img src="docs/images/ecosystems_banner.png" alt="Freshwater, Saltwater & Brackish — all supported" width="900" />
  <br />
  <em>Freshwater &bull; Saltwater &bull; Brackish — all ecosystems, one tool</em>
</p>

AquaScope will remain open and free. Pull requests, issues, ideas, and discussions are always welcome.

---

## Landing Page

A standalone promotional page is available in the [`landing/`](landing/) directory. Open `landing/index.html` in any browser — no build step required. It features a dark aquarium theme with animated bubbles, caustics overlays, feature showcases, and interactive screenshot tabs. Use it to present AquaScope to the community or host it on your own domain.

---

## Demo & Support

- **GitHub Repository**: [github.com/AquaScopeApp/AquaScope](https://github.com/AquaScopeApp/AquaScope)
- **Report Issues**: [GitHub Issues](https://github.com/AquaScopeApp/AquaScope/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AquaScopeApp/AquaScope/discussions)

### Support the Project

If you find AquaScope useful, consider supporting its development:

- Star the repository on GitHub
- [Sponsor on GitHub](https://github.com/sponsors/eprifti)
- [Buy me a coffee on Ko-fi](https://ko-fi.com/ediprifti)
- Report bugs and suggest features
- Contribute code and documentation

---

## Features

### Aquarium Modules

| Module | Description |
|--------|-------------|
| **Tank Management** | Individual tank pages with split-view layout, image upload, events timeline, statistics, maturity score badge, and shareable public profiles |
| **Parameters** | Log water tests (Ca, Mg, KH, NO3, PO4, salinity, temperature, pH, GH, NH3, NO2) with InfluxDB time-series storage, dashboard sparklines, and Grafana export |
| **ICP Tests** | Upload ICP-OES results from Triton, ATI, Fauna Marin, etc. with element-level tracking and cross-test comparison |
| **Livestock** | Catalog fish, corals, and invertebrates with FishBase/WoRMS/iNaturalist integration, health status, quantity tracking, and group splitting |
| **Compatibility Checker** | 60+ species knowledge base with 8-rule engine detecting aggression, reef-safety, predator-prey, and tank-size conflicts — heatmap matrix and network graph views |
| **Equipment** | Inventory with condition tracking, manufacturer/model, maintenance auto-linking, and convert-to-consumable |
| **Consumables** | Track salt mix, additives, food, and supplies with usage/dosing log, auto stock deduction, and expiration warnings |
| **Maintenance** | Reminders with frequency-based scheduling, overdue notifications, task templates, and completion history |
| **Photos** | Gallery with drag-and-drop upload, thumbnails, lightbox viewer, and tank-specific filtering |
| **Notes** | Journal with rich text, timestamps, search, and tank-specific organization |
| **Finances** | Spending analysis by category/tank, monthly charts, electricity cost tracking, budget management with alerts |
| **Dosing Calculator** | Chemistry-based corrections for Ca, KH, Mg with product-specific dosing (BRS, Tropic Marin, Red Sea, etc.) |

### Platform Features

| Feature | Description |
|---------|-------------|
| **Multi Water Type** | Saltwater, freshwater, and brackish with dynamic parameter ranges and subtypes (SPS, planted, cichlid, etc.) |
| **Dark Mode** | Full dark theme with toggle, persisted preference, and comprehensive styling across all components |
| **Tank Maturity Score** | Gamified 0-100 score based on age, parameter stability, and livestock diversity — shown as radial gauge badge |
| **Public Tank Profiles** | Shareable read-only tank pages with live stats, livestock, and parameters |
| **Multi-Language** | 6 languages: English, French, Spanish, German, Italian, Portuguese |
| **PWA / Installable** | Progressive Web App with offline support, service worker caching, and install prompt |
| **Dashboard** | Sparkline parameter trends, maturity badges, background tank images, animated banners (reef/planted/custom), CSV export |
| **Admin Panel** | User management, module toggles, database info, storage browser, orphan cleanup, species traits editor |
| **Backup & Restore** | Single-archive backup (PostgreSQL + InfluxDB + uploads) with manifest verification |
| **Multi-User** | JWT authentication, user registration, data isolation, admin/user roles |
| **Selective Export** | ZIP-based export/import with per-module selection and conflict resolution |
| **CI/CD** | GitHub Actions with backend pytest, frontend type-check + build, and Docker image validation |
| **Species Traits Database** | Shared JSON knowledge base (`data/species-traits.json`) with admin CRUD API for community-driven updates |

---

## What's New in v1.10.0

- **Grouped Calculators** — Water Change + Dosing calculators combined under a single "Calculators" page with default tank auto-selection
- **Temperature & pH auto-match** — replacement water values auto-set to tank readings (no false arrows)
- **Landing page enhancements** — Compatibility Checker science section, Calculators feature section with visual mockups
- **Bug fixes** — empty parameter data fallback, species-traits.json CI fix, demo screenshots

### Previous: v1.9.0

- **Dark mode** with system-aware toggle and full component coverage
- **Tank maturity score** — gamified 0-100 gauge rewarding age, stability, and diversity ([docs](docs/maturity-score.md))
- **Dashboard sparklines** — inline 7-day parameter trend charts on tank cards
- **CSV export** for parameter data
- **Shareable public tank profiles** — read-only links for sharing with the community
- **Dosing calculator** — chemistry-based Ca/KH/Mg corrections with product-specific dosing
- **Dashboard improvements** — tank background images, notification system, accessibility (aria-labels, skip-to-content)
- **181 new frontend tests** boosting coverage from 21% to 33%
- **Livestock Compatibility Checker** — 60+ species knowledge base, 8-rule engine, heatmap matrix, force-directed network graph ([docs](docs/compatibility-checker.md))
- **Species Traits Admin** — CRUD API + admin UI for managing the compatibility knowledge base
- **Species typeahead** — debounced WoRMS/iNaturalist/FishBase lookup on the species name field (create + edit)
- **Water type validation** — backend enforcement of water type consistency
- **Water Change Calculator** — dilution-based parameter impact prediction with salt mix presets and reverse target calculation ([docs](docs/water-change-calculator.md))

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS with dark mode support
- React Router for navigation
- Recharts for data visualization
- i18next for internationalization
- vite-plugin-pwa for Progressive Web App

### Backend
- Python 3.11+ with FastAPI
- SQLAlchemy ORM with PostgreSQL
- InfluxDB2 for time-series parameter data
- JWT authentication
- Alembic for database migrations

### Infrastructure
- Docker Compose for containerized deployment
- Nginx for serving frontend and reverse proxy
- PostgreSQL 15 for relational data
- InfluxDB2 for time-series data

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AquaScopeApp/AquaScope.git
cd AquaScope
```

### 2. Configure Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` and update the following critical values:

```env
# Change these for security
POSTGRES_PASSWORD=your-secure-password
INFLUXDB_ADMIN_PASSWORD=your-secure-password
INFLUXDB_ADMIN_TOKEN=your-secure-token
SECRET_KEY=your-secret-key-for-jwt
```

### 3. Start the Application

```bash
docker compose up -d
```

This will start all services:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- InfluxDB UI: http://localhost:8086
- PostgreSQL: localhost:5432

### 4. Access the Application

Open your browser and navigate to:
- **AquaScope UI**: http://localhost
- **API Documentation**: http://localhost:8000/docs
- **InfluxDB UI**: http://localhost:8086

### 5. Initial Setup

1. Register a new user account at http://localhost/register
2. Log in with your credentials
3. Create your first tank
4. Start logging parameters!

### 6. Load Demo Data (Optional)

Seed the database with two fully configured aquariums (saltwater SPS reef + freshwater Amazonian biotope) including livestock, equipment, maintenance schedules, notes, and months of parameter history:

```bash
bash scripts/seed_demo.sh
```

Then log in with:
- **Email**: `demo@reeflab.io`
- **Password**: `demo1234`

---

## Backup & Restore

### Create a Backup

```bash
./scripts/backup.sh [output_directory]
```

Creates a timestamped `.tar.gz` archive containing PostgreSQL dump, InfluxDB backup, and all uploaded files with a manifest.

### Restore from Backup

```bash
./scripts/restore.sh <backup_file.tar.gz>
```

Restores all data from a backup archive with interactive confirmation.

---

## Grafana Integration

### Configure Grafana Datasource

1. In Grafana, add a new InfluxDB datasource
2. Configure the connection:
   - **URL**: `http://influxdb:8086` (if Grafana is in the same Docker network) or `http://localhost:8086`
   - **Organization**: `reeflab` (or value from `INFLUXDB_ORG`)
   - **Token**: Use the value from `INFLUXDB_ADMIN_TOKEN` in your `.env`
   - **Default Bucket**: `reef_parameters` (or value from `INFLUXDB_BUCKET`)

3. Test and save the datasource

### Query Parameters

Your parameter data is stored in InfluxDB with the following structure:

- **Measurement**: `reef_parameters`
- **Tags**:
  - `user_id`: User identifier
  - `tank_id`: Tank identifier
  - `parameter_type`: Type of parameter (calcium, magnesium, alkalinity_kh, nitrate, phosphate, salinity, temperature, ph)
- **Field**: `value` (float)

Example Flux query:

```flux
from(bucket: "reef_parameters")
  |> range(start: -30d)
  |> filter(fn: (r) => r["_measurement"] == "reef_parameters")
  |> filter(fn: (r) => r["parameter_type"] == "calcium")
```

---

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000 with hot-reload enabled.

### Testing

AquaScope includes comprehensive unit and integration tests for both backend and frontend.

**Backend Tests (Pytest)**:
```bash
cd backend
pytest                    # Run all tests
pytest -m unit           # Run only unit tests
pytest -m integration    # Run only integration tests
pytest --cov=app         # Run with coverage report
```

**Frontend Tests (Vitest)**:
```bash
cd frontend
npm test                 # Run all tests
npm run test:ui         # Run with interactive UI
npm run test:coverage   # Run with coverage report
```

### Continuous Integration

AquaScope uses GitHub Actions for automated testing and quality assurance. Every push and pull request triggers:

1. **Backend Tests**: Pytest suite with PostgreSQL service container
2. **Frontend Tests**: TypeScript type checking and Vite build verification
3. **Docker Build**: Validates that both frontend and backend Docker images build successfully

The CI pipeline ensures code quality and prevents regressions. View the [workflow file](.github/workflows/ci.yml) for details.

### Database Migrations

Create a new migration:

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:

```bash
alembic upgrade head
```

---

## Project Structure

```
AquaScope/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/v1/       # REST API endpoints (18 routers)
│   │   ├── core/         # Configuration, security, dependencies
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # Business logic (InfluxDB, maturity, species traits)
│   ├── alembic/          # Database migrations
│   └── Dockerfile
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components (tanks, livestock, dashboard, admin, ...)
│   │   ├── pages/        # Page-level components (15 pages)
│   │   ├── config/       # Compatibility rules and data
│   │   ├── api/          # API client + routing layer
│   │   ├── hooks/        # Custom React hooks
│   │   └── i18n/         # Internationalization config
│   ├── public/locales/   # Translation files (6 languages x 12 namespaces)
│   └── Dockerfile
├── data/                 # Shared data files
│   └── species-traits.json  # Species compatibility knowledge base (60+ entries)
├── scripts/              # Utility scripts
│   ├── backup.sh         # Full system backup
│   ├── restore.sh        # Full system restore
│   └── seed_demo.sh      # Demo data seeder
├── landing/              # Promotional landing page
├── docs/                 # Documentation
├── docker-compose.yml    # Docker orchestration
└── README.md
```

---

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by Swagger UI.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Register new user |
| `POST /api/v1/auth/login` | Login and get JWT token |
| `GET /api/v1/dashboard/summary` | Dashboard with maturity scores and sparklines |
| `GET /api/v1/tanks` | List user's tanks |
| `POST /api/v1/parameters` | Submit water test results |
| `GET /api/v1/parameters/export/csv` | Export parameter data as CSV |
| `GET /api/v1/livestock` | List livestock inventory |
| `GET /api/v1/species-traits` | List species compatibility traits |
| `GET /api/v1/finances/summary` | Financial summary by category/tank |
| `GET /api/v1/share/{token}` | Public tank profile |
| `GET /api/v1/admin/storage/stats` | Admin storage statistics |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

---

## Troubleshooting

### Containers won't start

Check Docker logs:
```bash
docker compose logs
```

### Database connection errors

Ensure PostgreSQL is healthy:
```bash
docker compose ps
```

Wait for the health check to pass, then restart the backend:
```bash
docker compose restart backend
```

### InfluxDB token issues

Generate a new token in the InfluxDB UI and update your `.env` file.

---

## Roadmap

- [x] ~~Dosing calculator~~ (v1.9.0)
- [x] ~~Shareable public tank profiles~~ (v1.9.0)
- [x] ~~Dark mode~~ (v1.9.0)
- [x] ~~Species compatibility checker~~ (v1.9.0)
- [x] ~~Water change calculator~~ (v1.9.0)
- [x] ~~Grouped calculators~~ (v1.10.0)
- [ ] Email notifications for maintenance reminders
- [ ] Integration with reef controllers (ReefPi, Neptune)
- [ ] Native mobile app (Capacitor — in progress)
- [ ] Advanced analytics and trend prediction
- [ ] Real-time parameter monitoring with IoT integration

---

## License

MIT License - see LICENSE file for details

## Credits & Acknowledgments

**AquaScope** is created and maintained by **[Edi Prifti](https://github.com/eprifti)**.

Built with:
- Passion for aquarium keeping and open-source software
- [Claude](https://claude.ai) by Anthropic
- Inspiration from the amazing aquarium keeping community

### Technologies

Special thanks to the open-source projects that make AquaScope possible:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [InfluxDB](https://www.influxdata.com/) - Time-series database
- [Docker](https://www.docker.com/) - Containerization
- And many more amazing tools and libraries

### Support

If you find AquaScope useful:
- Star the repository
- [Sponsor on GitHub](https://github.com/sponsors/eprifti)
- [Buy me a coffee](https://ko-fi.com/ediprifti)
- Share with other aquarium keepers
- Report bugs and suggest features

---

Made with love for the aquarium keeping community
