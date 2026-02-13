# ReefLab v1.2.0 Release Notes

**Release Date**: February 8, 2026
**Release Type**: Minor Version - New Features & Enhancements

## 🎉 Highlights

v1.2.0 transforms the Tanks page into a comprehensive management hub with detailed views, timeline tracking, and enhanced visualizations. This release also adds credits, donation support, and automated CI/CD testing.

## ✨ New Features

### Enhanced Tank Management Hub

The star feature of v1.2.0 is the completely redesigned tank management system:

- **📱 Tank Detail Pages**: Click any tank to view a comprehensive detail page
  - Split-view layout with sidebar and tabbed content
  - Real-time statistics (equipment, livestock, photos, notes, ICP tests)
  - Tank age calculation ("X days running")
  - Quick actions for common tasks

- **🖼️ Tank Image Upload**: Upload custom images for your tanks
  - Drag-and-drop modal interface
  - Image validation (JPG, PNG, GIF, WebP up to 10MB)
  - Secure blob URL serving
  - Beautiful animated fallback for tanks without images

- **🐠 Animated Aquarium**: Pure CSS animation for visual appeal
  - Swimming fish with parallax movement (3 fish at different speeds)
  - Rising bubbles with fade effect
  - Swaying seaweed and coral at the bottom
  - No external dependencies - lightweight and fast

- **📅 Tank Events Timeline**: Track your tank's history
  - Create, edit, and delete events
  - Event categories: water change, addition, removal, maintenance, observation, test
  - Chronological timeline display with date markers
  - Descriptions up to 2000 characters

- **📊 Eight Tabbed Sections**:
  1. **Overview**: Recent activity and quick stats
  2. **Events**: Full timeline of tank history
  3. **Equipment**: All equipment for this tank
  4. **Livestock**: Fish, corals, and invertebrates
  5. **Photos**: Photo gallery for this tank
  6. **Notes**: Tank-specific notes and observations
  7. **ICP Tests**: Test results and element tracking
  8. **Maintenance**: Active reminders for this tank

### Footer & Credits

- **Application Footer** on all pages featuring:
  - Credits to **Edi Prifti** (creator)
  - Built with Claude Sonnet 4.5 acknowledgment
  - Links to GitHub repository, issues, and documentation
  - **Donation Support**:
    - GitHub Sponsors: https://github.com/sponsors/eprifti
    - Ko-fi: https://ko-fi.com/ediprifti
  - Version display and copyright

- **Version Banner**: Fixed position display at bottom-right
  - Shows current version (v1.2.0)
  - Git commit hash (if available)
  - Build date (if available)
  - Non-intrusive design

### CI/CD Pipeline

- **GitHub Actions Workflow** for automated testing
  - **Backend Tests**: Pytest suite with comprehensive coverage
  - **Frontend Tests**: TypeScript type checking and build verification
  - **Docker Build**: Validates both frontend and backend Docker images
  - Runs automatically on push and pull requests to main/develop
  - CI status badge in README

### Documentation

- **Enhanced README** with professional presentation:
  - Project badges (CI status, license, TypeScript, Python versions)
  - Animated aquarium SVG placeholder (with GIF creation guide)
  - Credits section prominently featuring Edi Prifti
  - Support section with donation links
  - Comprehensive features list updated with all capabilities

- **GIF Capture Documentation**:
  - `docs/capturing-animation.md` - Comprehensive guide with 6 methods
  - `scripts/capture-tank-animation.js` - Automated Puppeteer capture
  - `scripts/quick-gif.sh` - Quick bash script for manual recordings
  - `docs/images/README.md` - Quick reference with recommended settings

## 🔄 Changes

### Dashboard Improvements

- **Maintenance Reminders**: Now shows tank name for each overdue reminder
  - Format: "🏠 Tank: {tank_name}"
  - Helps identify which tank needs attention in multi-tank setups

### Tank Cards

- **Animated Fallback**: Cards without custom images now show the beautiful animated aquarium
- **Secure Image Loading**: Uses blob URLs via API for proper security
- **Loading States**: "Loading..." indicator while images fetch
- **Memory Management**: Proper cleanup with URL.revokeObjectURL()

### Photo Display

- **Fixed Rendering**: Photos now load correctly across the application
  - TankOverview component uses blob URLs
  - TankTabs Photos section uses blob URLs
  - Proper loading states and error handling
  - Memory cleanup on component unmount

## 🐛 Bug Fixes

### Image Loading Issues

- **Root Cause Fixed**: Changed from direct file path access to API blob URL fetching
- **Pattern Applied**:
  - Photos: `photosApi.getFileBlobUrl(photoId, thumbnail)`
  - Tank images: `tanksApi.getImageBlobUrl(tankId)`
- **Memory Leaks Fixed**: Added proper cleanup in useEffect returns
- **TypeScript Errors Resolved**: Fixed imageUrl state management types

### Build Errors

- **TypeScript Compilation**: Removed unused props (tankId in TankOverview and TankTabs)
- **Updated Interfaces**: Cleaned up prop interfaces to remove unnecessary parameters
- **Clean Build**: TypeScript compilation now completes with zero errors

## 🔧 Technical Details

### Routing

- **Nested Routes**: New structure for tank details
  - `/tanks` - Tank list view
  - `/tanks/:tankId` - Individual tank detail page
  - Uses React Router `<Outlet />` for nested rendering

### API Client Enhancements

New methods added to `frontend/src/api/client.ts`:
- `tanksApi.uploadImage(tankId, file)` - FormData upload for tank images
- `tanksApi.getImageBlobUrl(tankId)` - Secure blob URL fetching
- `tanksApi.listEvents(tankId)` - Get all events for a tank
- `tanksApi.createEvent/updateEvent/deleteEvent` - Full CRUD for tank events

### Backend Endpoints

New endpoints in `backend/app/api/v1/tanks.py`:
- `POST /tanks/{id}/upload-image` - Upload tank image (max 10MB)
- `GET /tanks/{id}/image` - Serve tank image as blob

### Component Architecture

- **Split-View Pattern**: Applied from ICPTests to tanks
  - Left sidebar: Tank info, stats, quick actions
  - Right content: Tabbed sections for related data
- **Reusable Modals**: TankImageUpload follows consistent modal patterns
- **Loading States**: Consistent loading and empty states across all components

### Frontend Package Scripts

- **Type Check**: Added `npm run type-check` for CI validation
  - Runs `tsc --noEmit` to validate TypeScript without building
  - Used in GitHub Actions workflow

## 📦 Installation & Upgrade

### For New Installations

Follow the standard installation in the README:

```bash
git clone https://github.com/AquaScopeApp/AquaScope.git
cd reeflab
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

### For Existing Installations

Update to v1.2.0:

```bash
git pull origin main
git checkout v1.2.0
docker-compose build
docker-compose up -d
```

No database migrations required for this release.

## 🎯 What's Next

See our [Roadmap](https://github.com/AquaScopeApp/AquaScope#-roadmap) for upcoming features:

- Email notifications for maintenance reminders
- Mobile responsive design improvements
- Dosing calculator
- Water change calculator
- Cost tracking and equipment expenses
- Community features (share tanks publicly)
- Integration with reef controllers (ReefPi, Neptune)

## 🙏 Acknowledgments

Special thanks to:
- The reef keeping community for inspiration and feedback
- Open source projects that make ReefLab possible (FastAPI, React, PostgreSQL, InfluxDB)
- Claude Sonnet 4.5 by Anthropic for development assistance

## 📞 Support

- 🐛 **Report Bugs**: https://github.com/AquaScopeApp/AquaScope/issues
- 💬 **Discussions**: https://github.com/AquaScopeApp/AquaScope/discussions
- 💖 **Sponsor**: https://github.com/sponsors/eprifti
- ☕ **Donate**: https://ko-fi.com/ediprifti

---

**Full Changelog**: https://github.com/AquaScopeApp/AquaScope/compare/v1.0.0...v1.2.0

Made with ❤️ by [Edi Prifti](https://github.com/eprifti) for the reef keeping community
