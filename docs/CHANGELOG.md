# Changelog

All notable changes to ReefLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-02-09

### Added

#### Bottom Dwellers & Rocks
- **Cleaner shrimp**: SVG with curved body, antennae, walking legs, tail fan; `crawl-bottom` keyframe animation (scuttle-pause-return with flip)
- **Turbo snail**: Purple spiral shell, soft body/foot, eye stalks; `snail-crawl` keyframe (very slow crawl with direction flip)
- **2 Gobies**: Small bottom-dwelling fish with large characteristic eyes, pectoral perching fins; `goby-hop` keyframe (mostly still, occasional quick hop)
- **Rock formations**: Large rock left (x=155), medium center-left (x=240), small right-center (x=385), cluster right (x=540), scattered pebbles
- **CSS animation classes**: `.animate-crawl-shrimp`, `.animate-snail-crawl`, `.animate-goby-hop`, `.animate-goby-hop-2`

#### Logo & Branding
- **logo.svg**: Full ReefLab logo — ocean gradient circle with clownfish, pink branching coral, green sea fan coral, and "ReefLab" text
- **favicon.svg**: Compact icon version for browser tabs — clownfish with coral accents
- Logo integrated into Login page, Register page, and Layout navbar
- Replaced default Vite favicon with ReefLab favicon in `index.html`

#### GitHub README Banner
- **banner.svg**: Animated SVG with SMIL animations for GitHub README
  - 5 swimming fish (clownfish, blue tang, yellow tang, 2 chromis) with ping-pong flip
  - 4 coral groups with swaying animations
  - Bottom dwellers (shrimp, snail, 2 gobies) with rocks
  - Rising bubbles and floating particles
  - Centered ReefLab logo with tagline
- Redesigned README header with centered layout and centered badge rows
- Updated completed features list to reflect v1.5.1

### Changed
- README header redesigned: animated banner, centered `<h1>`, centered badges in `<p align="center">` blocks
- Updated completed features: added i18n, livestock split, animations, logo entries
- Removed "Multi-language support" from roadmap (now completed)

## [1.5.0] - 2026-02-09

### Added

#### Full Internationalization (i18n)
- **6 languages**: English, French, Spanish, German, Italian, Portuguese
- **10 namespaces**: common, dashboard, tanks, parameters, maintenance, livestock, icptests, notes, photos, equipment
- **60+ locale files** in `frontend/public/locales/{en,fr,es,de,it,pt}/`
- **i18next + react-i18next** integration with `useTranslation` hook across all 9 pages
- **LanguageSelector** component in Layout navbar and Login/Register pages
- **i18n config** (`frontend/src/i18n/config.ts`): language detection, fallback to English, namespace loading
- **TypeScript types** (`frontend/src/i18n/types.ts`): type declarations for all 10 namespaces

#### Pages Wired with i18n
- Dashboard.tsx, TankList.tsx, Parameters.tsx, Maintenance.tsx, ICPTests.tsx, Notes.tsx, Photos.tsx, Equipment.tsx, Livestock.tsx
- All hardcoded strings replaced with `t()` translation calls
- Layout.tsx navigation items translated
- Common namespace for shared strings (auth, navigation, actions, footer)

#### Animated Aquarium Scene
- **AquariumScene.tsx**: SVG-based underwater scene component
  - 5 swimming fish: clownfish, blue tang, 2 chromis, yellow tang
  - 4 coral groups: pink branching, purple brain, green sea fan, yellow anemone
  - Rising bubbles (5) and floating particles (3)
  - Water caustics overlay with radial gradients
  - Sandy bottom with gradient
- **Fish ping-pong animation**: `swim-bounce` keyframe — fish swim right, turn (scaleX flip), swim left, turn back
- **Coral sway animations**: `coral-sway`, `coral-sway-alt` with different timing
- **Bubble rise animation**: `bubble-rise` with scale and opacity
- **Emoji animations**: `emoji-swim`, `emoji-sway`, `emoji-wiggle` for stats cards
- Scene placed in Layout.tsx above `<Outlet />` on all authenticated pages

#### Yellow Tang (Fish 5)
- Bright yellow disc-shaped body with tall dorsal and ventral fins
- White tail spine detail
- `animate-swim-right-medium` class (15s cycle, 3s delay)

### Fixed
- **Footer version**: Fixed hardcoded v1.3.0 → dynamic version with v1.5.0 fallback
- **VersionBanner**: Aligned fallback version to v1.5.0
- **Equipment API**: Fixed variable shadowing bug (`status` parameter vs `EquipmentStatus.status`)

## [1.4.0] - 2026-02-09

### Added

#### Livestock Split Feature
- **Split endpoint**: `POST /api/v1/livestock/{id}/split` — split a group entry (e.g., 3 Chromis → 2 alive + 1 dead)
- **LivestockSplitRequest** schema: `split_quantity` (int, ge=1), `new_status` ("dead" | "removed")
- **LivestockSplitResponse** schema: returns both `original` and `split` entries
- Reduces original quantity, creates new entry copying all species data with new status + `removed_date`
- Validates: split_quantity < current quantity, new_status is "dead" or "removed", ownership
- **Frontend**: Split button on LivestockCard (visible when quantity > 1 and status is "alive"), inline dialog with quantity input and status toggle

#### Time-in-Tank Display
- Shows how long each livestock entry has been in the tank (e.g., "3 months, 12 days")
- Calculated from `added_date` to now (or `removed_date` if dead/removed)

#### Livestock Enhancements (v1.3.0)
- **WoRMS integration**: World Register of Marine Species lookup for taxonomic data
- **iNaturalist integration**: Photo and observation data from citizen science platform
- **Status tracking**: alive, dead, removed statuses with `removed_date`
- **Quantity support**: Track groups of same species (e.g., "5x Chromis viridis")

### Testing
- **10 split test cases**: split to dead, split to removed, split >= total (422), split 0 (422), invalid status (422), not found (404), unauthorized (401), external IDs copied, both entries in listing
- **121 total backend tests**, 60% coverage

## [1.3.0] - 2026-02-09

### Added
- Livestock WoRMS/iNaturalist species integration
- Status tracking (alive, dead, removed) with removed_date
- Quantity support for group entries
- Full i18n support for livestock page

## [1.2.0] - 2026-02-08

### Added

#### Enhanced Tank Management Hub
- **Tank Detail Pages**: Comprehensive individual tank views with split-view layout
  - Left sidebar with tank info, statistics, and quick actions
  - Right content area with 8 tabbed sections (Overview, Events, Equipment, Livestock, Photos, Notes, ICP Tests, Maintenance)
  - Tank image display with fallback to animated aquarium visualization

- **Tank Image Upload**: Upload custom images for tanks
  - Drag-and-drop file upload modal in `TankImageUpload` component
  - Image validation (type: jpg/jpeg/png/gif/webp, size: max 10MB)
  - Secure image storage in `/uploads/tank-images/`
  - Blob URL serving for security
  - Backend endpoints: `POST /tanks/{id}/upload-image` and `GET /tanks/{id}/image`

- **Default Tank Animation**: Beautiful animated aquarium for tanks without custom images
  - `DefaultTankAnimation` component with pure CSS animations
  - Swimming fish with parallax movement (3 fish at different speeds)
  - Rising bubbles with fade effect (4 bubbles with staggered delays)
  - Swaying seaweed and coral at the bottom
  - No external dependencies (pure CSS keyframes)
  - Gradient ocean background (blue tones)

- **Tank Events Timeline**: Track tank history and milestones
  - `TankTimeline` component with chronological event display
  - `TankEventForm` for creating and editing events
  - Event categories: water_change, addition, removal, maintenance, observation, test
  - CRUD operations via API: `GET/POST/PUT/DELETE /tanks/{id}/events`
  - Visual timeline with date markers
  - Event descriptions up to 2000 characters

- **Tank Statistics Dashboard**: Real-time counts of tank-related data
  - Equipment, livestock, photos, notes counts
  - Active maintenance reminders count
  - ICP tests count
  - Tank age calculation (days running since setup date)
  - Displayed in sidebar `TankStats` component

#### Footer & Credits
- **Application Footer**: Added `Footer` component to all pages
  - Credits to **Edi Prifti** (creator)
  - Built with Claude Sonnet 4.5 attribution
  - Links to GitHub repository, issues, and documentation
  - Donation buttons:
    - GitHub Sponsors: `https://github.com/sponsors/eprifti`
    - Ko-fi: `https://ko-fi.com/ediprifti`
  - Version display
  - Copyright notice

- **Version Banner**: `VersionBanner` component with fixed position display
  - Current application version (from `VITE_APP_VERSION` env var)
  - Git commit hash display (if available)
  - Build date display (if available)
  - Fixed bottom-right position, doesn't obstruct content

#### CI/CD Pipeline
- **GitHub Actions Workflow**: `.github/workflows/ci.yml`
  - **Backend Tests**: Pytest suite with PostgreSQL 15 service container
    - Environment variables for test database
    - Coverage reporting
    - Runs in parallel with other jobs
  - **Frontend Tests**: TypeScript type checking and build verification
    - `npm run type-check` for TypeScript validation
    - `npm run build` to ensure production build succeeds
    - Node.js 18 with npm caching
  - **Docker Build**: Validates image builds for both services
    - Docker Buildx setup
    - Cache optimization with GitHub Actions cache
    - Tests both backend and frontend Dockerfiles
  - Runs on push and PR to `main` and `develop` branches

#### Documentation
- **Enhanced README**: Comprehensive documentation updates
  - Project badges: CI status, license, TypeScript, Python versions
  - Animated tank demo reference (placeholder for GIF)
  - Credits section with Edi Prifti attribution
  - Support section with GitHub Sponsors and Ko-fi links
  - Expanded features list with all new capabilities
  - CI/CD pipeline documentation
  - Technologies and acknowledgments section
  - Updated roadmap with completed items moved to v1.2.0

- **Documentation Images Directory**: `docs/images/`
  - `README.md` with instructions for creating animated tank GIF
  - Multiple capture methods: screen recording, browser tools, animated screenshot tools
  - Recommended settings: 800x450px, 15-20fps, optimized with gifsicle
  - Placeholder for `tank-animation.gif`

### Changed
- **Dashboard Maintenance Reminders**: Enhanced overdue reminders display
  - Now shows tank name for each reminder
  - Format: "🏠 Tank: {tank_name}"
  - Helps users identify which tank needs attention in multi-tank setups
  - Tank lookup via `tankSummaries.find()`

- **Tank Cards**: Updated `TankCard` component
  - Uses blob URLs via `tanksApi.getImageBlobUrl()` for secure image loading
  - Shows `DefaultTankAnimation` when no custom image is set
  - Improved loading states ("Loading..." while fetching)
  - Proper cleanup with `URL.revokeObjectURL()` in useEffect
  - Maintained click-to-detail navigation

- **Photo Display**: Fixed photo rendering across application
  - `TankOverview` component: Recent photos now load via `photosApi.getFileBlobUrl()`
  - `TankTabs` component: Photos tab uses blob URLs
  - Proper loading states and error handling
  - Memory cleanup with `URL.revokeObjectURL()` on unmount
  - Parallel loading of multiple photos for performance

- **Frontend Package Scripts**: Added `type-check` script
  - `npm run type-check` runs `tsc --noEmit` for CI validation
  - Allows type checking without building

### Fixed
- **Image Loading Issues**: Resolved photos and tank images not displaying
  - Root cause: Direct file path access vs. API blob URL fetching
  - Implemented blob URL pattern for all images:
    - Photos: `photosApi.getFileBlobUrl(photoId, thumbnail)`
    - Tank images: `tanksApi.getImageBlobUrl(tankId)`
  - Added proper cleanup in useEffect returns
  - Fixed TypeScript errors with imageUrl state management

- **TypeScript Build Errors**: Removed unused props
  - Fixed `tankId` unused in `TankOverview` and `TankTabs`
  - Updated prop interfaces to remove unnecessary parameters
  - Clean TypeScript compilation with no errors

### Technical
- **Routing**: Nested routes structure for tank details
  - `/tanks` - Tank list
  - `/tanks/:tankId` - Individual tank detail page
  - Uses React Router `<Outlet />` for nested rendering

- **API Client Additions**:
  - `tanksApi.uploadImage(tankId, file)` - FormData upload
  - `tanksApi.getImageBlobUrl(tankId)` - Blob URL fetch
  - `tanksApi.listEvents(tankId)` - Tank events
  - `tanksApi.createEvent/updateEvent/deleteEvent` - Event CRUD

- **Component Architecture**:
  - Split-view pattern (sidebar + tabbed content) from ICPTests
  - Reusable modal patterns for uploads and forms
  - Consistent loading and empty states across components

## [1.0.0] - 2026-02-07

### 🎉 First Stable Release

Complete ReefLab application with all core features implemented and production-ready.

### Added - Phase 5-7: Complete Frontend & Documentation

#### Photos Feature
- Photo gallery page with grid layout
- Drag-and-drop photo upload component
- Image preview before upload
- File validation (JPG, PNG, GIF, 10MB max)
- Lightbox viewer for full-size images
- Keyboard navigation (arrows, ESC)
- In-place photo metadata editing
- Tank filtering for photos
- Statistics dashboard (total photos, monthly count)
- Empty state with upload prompt

#### Notes System
- Notes/journal page for tank observations
- Note card component with formatted display
- Modal note editor with formatting tips
- Create, edit, delete functionality
- Tank-based organization
- Character counter
- Preserved whitespace formatting
- Statistics (total notes, monthly, weekly average)
- Edit history tracking

#### Tank Management Enhancements
- Split volume tracking (display + sump)
- Total volume auto-calculation
- Tank description field
- Custom tank image URLs
- Default animated tank SVG
- Tank events/milestones system
- Working navigation links to parameters
- Enhanced tank cards with visual improvements

#### Parameter Enhancements
- Recharts visualization with color-coded ranges
- Inline parameter editing
- Excel/CSV bulk import
- Ratio calculations (NO3/PO4, Mg/Ca)
- SPS-optimized parameter ranges
- Floating-point precision fixes
- Latest reading indicators

#### Maintenance System Complete
- Visual reminder categorization (overdue, due soon, upcoming)
- Statistics dashboard by status
- 9 predefined reminder types with icons
- Frequency presets (3 days to 6 months)
- Custom frequency input
- Automatic next-due calculation
- Active/inactive toggle
- Mark as complete with custom dates

#### Livestock Inventory Complete
- Type-specific styling (fish, coral, invertebrate)
- Grouped display by type
- FishBase search integration
- Auto-fill species data
- Type and tank filtering
- Statistics by type
- Species notes and observations

### Testing
- Comprehensive integration tests for Maintenance API
  - CRUD operations
  - Filtering (active, overdue, tank)
  - Complete reminder with date calculation
  - Authorization tests
- Comprehensive integration tests for Livestock API
  - CRUD for fish, corals, invertebrates
  - Type and tank filtering
  - FishBase search endpoint
- Test coverage for all critical paths
- Pytest fixtures for test data

### Documentation
- Complete API documentation (API.md)
  - All endpoints documented
  - Request/response examples
  - Error codes and responses
  - Authentication guide
- Updated README with features status
  - Completed features section
  - Updated roadmap
  - Installation guide
  - Development instructions
- CHANGELOG.md with full version history

### UI/UX Improvements
- Consistent empty states across all pages
- Loading states for async operations
- Statistics cards on all pages
- Color-coded status indicators
- Responsive grid layouts
- Modal forms for create/edit operations
- Confirmation dialogs for deletions
- Toast notifications

### Technical Improvements
- Frontend version bumped to 1.0.0
- Production-optimized builds
- Proper TypeScript types throughout
- Consistent component patterns
- Error handling improvements
- Performance optimizations

### Fixed
- Floating-point precision issues in parameter ranges
- TypeScript build errors with unused variables
- File read requirements for editing
- Frontend hot-reload issues in production
- Missing routes in App.tsx

## [Unreleased]

### Planned
- Email notifications for maintenance reminders
- Mobile responsive design improvements
- Dosing calculator
- Water change calculator
- Cost tracking and equipment expenses
- Community features (share tanks publicly)
- Integration with reef controllers (ReefPi, Neptune)
- Advanced analytics and trend prediction
- Raspberry Pi deployment guide

## [0.4.0] - 2024-02-07

### Added - Phase 4: Frontend Foundation

#### Authentication System
- Login page with email/password authentication
- Registration page with validation
  - Email format validation
  - Password strength requirements (min 8 characters)
  - Password confirmation matching
- Protected route wrapper component
- Authentication context with React hooks
- Persistent authentication state (localStorage)
- Automatic token management and injection
- Token expiration handling (auto-logout on 401)

#### Type Safety
- Complete TypeScript type definitions matching backend schemas
- User, Tank, Parameter, Note, Photo, Maintenance, Livestock types
- API response and error types
- UI state management types

#### API Client
- Axios instance with environment-aware base URL
- Type-safe API methods for all 7 modules:
  - Authentication (login, register, get current user)
  - Tanks (full CRUD)
  - Parameters (submit, query, get latest)
  - Notes (full CRUD)
  - Photos (upload, list, get file URLs)
  - Maintenance (reminders with complete action)
  - Livestock (CRUD with FishBase search)
- Request interceptor for automatic token injection
- Response interceptor for global error handling
- Automatic redirect to login on authentication failure

#### Dashboard
- Welcome header with personalized greeting
- Quick statistics cards:
  - Total tanks count
  - Overdue maintenance count
  - Quick action links
- Tank list with add functionality
- Overdue maintenance alerts with due dates
- Loading states for async data
- Empty states with call-to-action

#### Layout & Navigation
- Responsive application layout
- Sidebar navigation with 7 main sections:
  - Dashboard
  - Tanks
  - Parameters
  - Photos
  - Notes
  - Maintenance
  - Livestock
- Top navigation bar with:
  - ReefLab branding
  - User display name
  - Logout button
- Active route highlighting
- Link to API documentation
- Placeholder pages for upcoming features

#### Routing
- Public routes: `/login`, `/register`
- Protected routes with authentication check
- Nested routes under main layout
- Automatic redirect to dashboard when authenticated
- Loading state during auth verification
- Catch-all redirect for unknown routes

#### UI/UX
- Ocean/coral themed color palette from Tailwind config
- Responsive design (mobile, tablet, desktop)
- Loading spinners for async operations
- User-friendly error messages
- Form validation with inline feedback
- Hover states and smooth transitions
- Clean, modern Material-inspired interface
- Accessible form labels and inputs

### Technical
- React 18 with TypeScript
- React Router v6 for navigation
- Axios for HTTP requests
- Context API for state management
- LocalStorage for auth persistence
- Tailwind CSS for styling
- Vite for fast development

## [0.3.0] - 2024-02-07

### Added - Phase 3: Complete Backend API

#### Tank Management
- POST `/api/v1/tanks` - Create new tank
- GET `/api/v1/tanks` - List all user tanks
- GET `/api/v1/tanks/{id}` - Get tank details
- PUT `/api/v1/tanks/{id}` - Update tank information
- DELETE `/api/v1/tanks/{id}` - Delete tank (cascade delete)

#### Parameter Tracking
- POST `/api/v1/parameters` - Submit water test results (batch or individual)
- GET `/api/v1/parameters` - Query parameter history with filters
- GET `/api/v1/parameters/latest` - Get latest readings for each parameter
- Support for 8 standard ICP parameters:
  - Calcium, Magnesium, Alkalinity (KH)
  - Nitrate, Phosphate
  - Salinity, Temperature, pH
- InfluxDB integration with time-series queries
- Multi-tenant data isolation with user_id tagging

#### Notes System
- POST `/api/v1/notes` - Create note
- GET `/api/v1/notes` - List notes with tank filtering
- GET `/api/v1/notes/{id}` - Get specific note
- PUT `/api/v1/notes/{id}` - Update note content
- DELETE `/api/v1/notes/{id}` - Delete note
- Chronological sorting (newest first)
- Rich text support (up to 10,000 characters)

#### Photo Management
- POST `/api/v1/photos` - Upload photo with metadata
- GET `/api/v1/photos` - List photos with tank filtering
- GET `/api/v1/photos/{id}` - Get photo metadata
- GET `/api/v1/photos/{id}/file` - Serve image file
- PUT `/api/v1/photos/{id}` - Update photo metadata
- DELETE `/api/v1/photos/{id}` - Delete photo and files
- Automatic thumbnail generation (300x300)
- File validation (jpg, jpeg, png, gif)
- 10MB size limit per photo
- Organized storage: `uploads/{user_id}/{tank_id}/`

#### Maintenance Reminders
- POST `/api/v1/maintenance/reminders` - Create reminder
- GET `/api/v1/maintenance/reminders` - List reminders with filters
- GET `/api/v1/maintenance/reminders/{id}` - Get reminder details
- PUT `/api/v1/maintenance/reminders/{id}` - Update reminder
- POST `/api/v1/maintenance/reminders/{id}/complete` - Mark as complete
- DELETE `/api/v1/maintenance/reminders/{id}` - Delete reminder
- Automatic next_due calculation based on frequency
- Filter by active status, overdue, or specific tank
- Common reminder types: water_change, pump_cleaning, skimmer_cleaning, etc.

#### Livestock Catalog
- POST `/api/v1/livestock` - Add livestock to tank
- GET `/api/v1/livestock` - List livestock with filters
- GET `/api/v1/livestock/{id}` - Get livestock details
- PUT `/api/v1/livestock/{id}` - Update livestock information
- DELETE `/api/v1/livestock/{id}` - Remove livestock
- GET `/api/v1/livestock/fishbase/search` - Search FishBase API
- GET `/api/v1/livestock/fishbase/species/{id}` - Get species details
- Support for fish, coral, and invertebrate types
- FishBase integration for scientific species data

### Technical
- Pydantic schemas for all 7 API modules
- Complete request/response validation
- Multi-tenant security on all endpoints
- Automatic OpenAPI documentation at `/docs`
- File upload with PIL/Pillow image processing
- SQLAlchemy ORM for database operations
- Async support for external API calls
- Proper HTTP status codes and error handling

### Documentation
- API endpoint documentation in all route files
- Usage examples in docstrings
- Error response documentation

## [0.2.0] - 2024-02-07

### Added - Phase 2: Backend Foundation

#### Database Models
- `User` model with UUID primary key
  - Email authentication
  - Bcrypt password hashing
  - Timestamps for audit trail
- `Tank` model for multi-tank support
  - Volume tracking in liters
  - Setup date for maturity tracking
  - User relationship with cascade delete
- `Note` model for observations
  - Text content with timestamps
  - Tank and user relationships
- `Photo` model with file metadata
  - File path and thumbnail path
  - Separate taken_at and created_at
  - Description field
- `MaintenanceReminder` model
  - Frequency-based scheduling
  - Automatic next_due calculation
  - Reminder type categorization
- `Livestock` model
  - Species tracking (scientific and common names)
  - FishBase integration ready
  - Type categorization (fish, coral, invertebrate)

#### Authentication System
- JWT token-based authentication
  - 30-minute token expiration
  - OAuth2 password bearer flow
  - Token signature verification
- User registration endpoint
  - Email validation
  - Password strength requirements (min 8 chars)
  - Automatic password hashing
- Login endpoint
  - Email and password authentication
  - JWT token generation on success
- `/auth/me` endpoint for current user info
- Dependency injection for protected routes
- Multi-tenant data isolation

#### External Services
- **InfluxDB Service** (`services/influxdb.py`)
  - Time-series data storage for parameters
  - Batch write support for complete water tests
  - Flexible querying with time ranges
  - Tags: user_id, tank_id, parameter_type
  - Grafana-ready data structure
- **FishBase Service** (`services/fishbase.py`)
  - Species search functionality
  - Detailed species information
  - Common name lookup
  - Async HTTP client with error handling

#### Database Migrations
- Alembic configuration (`alembic/env.py`)
- Automatic model change detection
- Migration script template
- Database initialization script

#### Security
- UUID primary keys (prevents enumeration)
- Bcrypt password hashing with salt
- JWT tokens with signature verification
- CORS middleware configuration
- SQL injection prevention via ORM
- Multi-tenant query filtering

### Documentation
- `ARCHITECTURE.md` - Complete technical documentation
  - Design decision rationale
  - Technology choice explanations
  - Security best practices
  - Database model design
  - API architecture patterns
  - Future enhancement roadmap

## [0.1.0] - 2024-02-07

### Added - Phase 1: Project Infrastructure

#### Project Setup
- Git repository initialization
- GitHub repository connection
- `.gitignore` for Python and Node.js
- `.env.example` with all configuration variables

#### Docker Infrastructure
- `docker-compose.yml` with 4 services:
  - PostgreSQL 15 for relational data
  - InfluxDB2 for time-series parameters
  - FastAPI backend with hot-reload
  - React frontend with Nginx
- Health checks for all database services
- Volume mounts for data persistence
- Network configuration for inter-service communication

#### Backend Skeleton
- FastAPI application structure
  - `app/main.py` - Application entry point
  - `app/database.py` - SQLAlchemy configuration
  - `app/core/config.py` - Environment settings
  - `app/core/security.py` - JWT and password utilities
- Directory structure:
  - `models/` - Database models
  - `schemas/` - Pydantic validation
  - `api/v1/` - API endpoints
  - `services/` - External integrations
- CORS middleware configuration
- Health check endpoints (`/` and `/health`)
- Python dependencies in `requirements.txt`:
  - FastAPI, uvicorn
  - SQLAlchemy, alembic, psycopg2-binary
  - influxdb-client
  - python-jose, passlib, bcrypt
  - Pillow for image processing

#### Frontend Skeleton
- React 18 with TypeScript
- Vite for fast development and builds
- Tailwind CSS with custom ocean/coral color themes
- Project structure:
  - `components/` - Reusable components
  - `pages/` - Page components
  - `api/` - API client
  - `hooks/` - Custom React hooks
  - `types/` - TypeScript definitions
- Nginx configuration for production
  - API proxy to backend
  - Static file serving
  - Gzip compression
- Multi-stage Docker build
  - Build stage with Node.js
  - Production stage with Nginx

#### Configuration
- Environment variables for all services
- PostgreSQL, InfluxDB, JWT configuration
- File upload settings
- CORS origins configuration
- FishBase API URL

#### Documentation
- `README.md` with:
  - Feature overview
  - Technology stack explanation
  - Quick start guide
  - Docker setup instructions
  - Grafana integration guide
  - API documentation links
  - Troubleshooting section
  - Contributing guidelines
  - Future roadmap

### Technical Details
- FastAPI 0.104.1
- React 18.2.0
- PostgreSQL 15
- InfluxDB 2.7
- Python 3.11+
- Node.js 20+

---

## Release Tags

All releases are tagged in Git and available on GitHub:
- `v0.1.0` - Project Infrastructure
- `v0.2.0` - Backend Foundation
- `v0.3.0` - Complete Backend API
- `v0.4.0` - Frontend Foundation
- `v1.0.0` - First Stable Release
- `v1.2.0` - Tank Hub, CI/CD, Footer
- `v1.3.0` - Livestock WoRMS/iNaturalist, status tracking, quantity
- `v1.4.0` - Livestock split, time-in-tank, test coverage
- `v1.5.0` - Full i18n (6 languages), aquarium animation, yellow tang
- `v1.5.1` - Bottom dwellers, rocks, logo, GitHub banner

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version: Breaking API changes
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes (backward compatible)

## Development Phases

- ✅ **Phase 1** (v0.1.0): Infrastructure setup
- ✅ **Phase 2** (v0.2.0): Backend foundation
- ✅ **Phase 3** (v0.3.0): Complete API
- ✅ **Phase 4** (v0.4.0): Frontend application
- ✅ **Phase 5-7** (v1.0.0): Complete features & production release
- ✅ **Phase 8** (v1.2.0): Tank hub, CI/CD, footer & credits
- ✅ **Phase 9** (v1.3.0-v1.4.0): Livestock enhancements & split feature
- ✅ **Phase 10** (v1.5.x): i18n, animations, branding

## Contributing

When contributing, please:
1. Follow conventional commit format
2. Update CHANGELOG.md under [Unreleased]
3. Increment version numbers appropriately
4. Create release tags for significant features

## Links

- [GitHub Repository](https://github.com/eprifti/reeflab)
- [API Documentation](http://localhost:8000/docs) (when running)
- [Architecture Documentation](backend/ARCHITECTURE.md)
