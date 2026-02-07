# ReefLab

A comprehensive web application for managing reef aquarium parameters, maintenance schedules, and livestock tracking.

## Features

- **Parameter Tracking**: Log weekly water test results (Ca, Mg, KH, NO3, PO4, Salinity, Temperature, pH)
- **InfluxDB Integration**: Store time-series data for visualization in Grafana
- **Photo Gallery**: Upload and manage aquarium photos with descriptions
- **Notes System**: Keep detailed notes about your reef tank
- **Maintenance Reminders**: Track and schedule maintenance tasks (water changes, pump cleaning, skimmer maintenance)
- **Livestock Database**: Catalog fish, corals, and invertebrates with FishBase integration
- **Multi-User Support**: Secure authentication and user-specific data management

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for modern, responsive UI
- React Router for navigation
- Axios for API communication

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

## Prerequisites

- Docker and Docker Compose
- Git
- (Optional) Node.js 20+ and Python 3.11+ for local development

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/eprifti/reeflab.git
cd reeflab
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
docker-compose up -d
```

This will start all services:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- InfluxDB UI: http://localhost:8086
- PostgreSQL: localhost:5432

### 4. Access the Application

Open your browser and navigate to:
- **ReefLab UI**: http://localhost
- **API Documentation**: http://localhost:8000/docs
- **InfluxDB UI**: http://localhost:8086

### 5. Initial Setup

1. Register a new user account at http://localhost/register
2. Log in with your credentials
3. Create your first tank
4. Start logging parameters!

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

## Project Structure

```
reeflab/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configuration and security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # External service integrations
│   ├── alembic/          # Database migrations
│   └── Dockerfile
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API client
│   │   └── hooks/        # Custom React hooks
│   └── Dockerfile
├── docker-compose.yml    # Docker orchestration
└── README.md
```

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by Swagger UI.

### Key Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/tanks` - List user's tanks
- `POST /api/v1/parameters` - Submit water test results
- `GET /api/v1/parameters` - Query parameter history
- `POST /api/v1/photos` - Upload photos
- `POST /api/v1/maintenance/reminders` - Create maintenance reminder

## FishBase Integration

The livestock feature integrates with the FishBase API to provide species information. When adding fish or corals, you can search the FishBase database for accurate species data.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Commit Convention

This project follows conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Troubleshooting

### Containers won't start

Check Docker logs:
```bash
docker-compose logs
```

### Database connection errors

Ensure PostgreSQL is healthy:
```bash
docker-compose ps
```

Wait for the health check to pass, then restart the backend:
```bash
docker-compose restart backend
```

### InfluxDB token issues

Generate a new token in the InfluxDB UI and update your `.env` file.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/eprifti/reeflab/issues
- Discussions: https://github.com/eprifti/reeflab/discussions

## Roadmap

- [ ] Email notifications for maintenance reminders
- [ ] Mobile responsive design improvements
- [ ] Dosing calculator
- [ ] Water change calculator
- [ ] Equipment tracking
- [ ] Cost tracking
- [ ] Community features
- [ ] Integration with reef controllers (ReefPi, Neptune)
- [ ] Mobile app (React Native)

---

Made with ❤️ for the reef keeping community
