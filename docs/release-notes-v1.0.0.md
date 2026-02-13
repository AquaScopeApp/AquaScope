# ReefLab v1.0.0 - First Stable Release 🎉

**Release Date:** February 7, 2026

We're excited to announce the first stable release of **ReefLab** - a comprehensive web application for managing reef aquariums!

## 🌟 What is ReefLab?

ReefLab is a modern, full-stack application that helps reef aquarium hobbyists track water parameters, manage maintenance schedules, document their tanks with photos and notes, and maintain a livestock inventory. All with beautiful visualizations and an intuitive interface.

## ✨ Key Features

### 📊 Parameter Tracking
- Track all critical reef parameters (Ca, Mg, KH, NO3, PO4, Salinity, Temperature, pH)
- Beautiful charts with Recharts visualization
- Color-coded ranges (ideal, acceptable, warning)
- InfluxDB integration for time-series data
- Excel/CSV bulk import for historical data
- Ratio calculations (NO3/PO4, Mg/Ca)
- Inline editing of readings

### 🐠 Tank Management
- Multi-tank support with detailed specifications
- Display and sump volume tracking
- Custom tank images with animated default SVG
- Tank events/milestones timeline
- Quick navigation to parameters and tests

### 🔧 Maintenance System
- Recurring reminder scheduling
- 9 predefined reminder types (water changes, pump cleaning, etc.)
- Automatic next-due calculation
- Visual status indicators (overdue, due soon, upcoming)
- Frequency presets from daily to yearly
- Complete task logging with history

### 📸 Photo Gallery
- Drag-and-drop photo upload
- Automatic thumbnail generation
- Lightbox viewer with keyboard navigation
- Tank filtering
- Photo metadata (description, date taken)
- Grid layout with hover effects

### 📝 Notes & Journal
- Tank-specific notes and observations
- Preserved formatting for detailed entries
- Edit history tracking
- Statistics (monthly, weekly averages)
- Search and filter by tank

### 🐟 Livestock Inventory
- Track fish, corals, and invertebrates
- FishBase API integration for species data
- Type-specific visual styling
- Addition dates and age tracking
- Species notes and care information

### 🔐 Multi-User Support
- Secure JWT authentication
- User-specific data isolation
- Password hashing with bcrypt
- Protected routes

## 🏗️ Technical Highlights

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for lightning-fast development
- **Tailwind CSS** for beautiful, responsive UI
- **Recharts** for data visualization
- **React Router v6** for navigation

### Backend
- **FastAPI** (Python 3.11+) for high-performance API
- **SQLAlchemy ORM** with PostgreSQL for relational data
- **InfluxDB2** for time-series parameter storage
- **JWT authentication** with secure password hashing
- **Alembic** for database migrations
- **Pillow** for image processing

### Infrastructure
- **Docker Compose** for easy deployment
- **Nginx** reverse proxy and static file serving
- **PostgreSQL 15** database
- **InfluxDB2** for metrics
- Persistent volumes for data

## 📚 Documentation

- **[README.md](README.md)**: Complete setup and usage guide
- **[API.md](API.md)**: Comprehensive API documentation with examples
- **[CHANGELOG.md](CHANGELOG.md)**: Full version history
- **Interactive API Docs**: Available at `/docs` when running

## 🧪 Testing

- Comprehensive integration tests for all core features
- Pytest test suite for backend
- Test coverage for critical paths
- CI/CD ready

## 🚀 Getting Started

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/eprifti/reeflab.git
cd reeflab

# Configure environment
cp .env.example .env
# Edit .env with your secure passwords

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost
# API Docs: http://localhost:8000/docs
# InfluxDB: http://localhost:8086
```

### First Steps

1. Register a new user account
2. Create your first tank
3. Log your first water parameters
4. Upload tank photos
5. Set up maintenance reminders
6. Add your livestock inventory

## 📊 Grafana Integration

ReefLab stores all parameter data in InfluxDB2, making it perfect for advanced visualization in Grafana:

1. Add InfluxDB datasource in Grafana
2. Use organization: `reeflab`, bucket: `reef_parameters`
3. Query with measurement: `reef_parameters`
4. Filter by `user_id`, `tank_id`, and `parameter_type` tags

See [README.md](README.md#grafana-integration) for detailed setup instructions.

## 🎯 What's Next?

See our [Roadmap](README.md#roadmap) for planned features including:
- Email notifications for maintenance reminders
- Mobile responsive improvements
- Dosing calculator
- Water change calculator
- Equipment tracking
- Community features
- Mobile app (React Native)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](README.md#contributing) for details.

## 🙏 Acknowledgments

Built with ❤️ for the reef keeping community.

Special thanks to:
- FishBase for species data
- The open-source community for amazing tools
- All reef hobbyists who helped shape the features

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

- **GitHub Issues**: https://github.com/eprifti/reeflab/issues
- **Discussions**: https://github.com/eprifti/reeflab/discussions

## 📦 Release Assets

- **Source Code**: Download from the [v1.0.0 tag](https://github.com/eprifti/reeflab/releases/tag/v1.0.0)
- **Docker Images**: Available via Docker Compose build
- **Documentation**: Included in repository

---

**Full Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

**Installation Guide**: See [README.md](README.md) for complete setup instructions.

**API Reference**: See [API.md](API.md) for endpoint documentation.

---

Made with ❤️ for the reef keeping community 🐠🪸🌊
