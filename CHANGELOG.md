# Changelog

All notable changes to ReefLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Planned for v1.1.0+
- Email notifications for maintenance reminders
- Grafana dashboard templates
- API rate limiting
- Mobile responsive design improvements
- Dosing calculator
- Water change calculator
- Equipment tracking

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
- `v1.0.0` - First Stable Release 🎉

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
- ✅ **Phase 5-7** (v1.0.0): Complete features & production release 🎉

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
