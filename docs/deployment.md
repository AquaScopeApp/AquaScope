# ReefLab Deployment Guide

## Local Development with Docker Compose

### Full Rebuild and Restart (After Code Changes)

```bash
# Stop all services
docker compose down

# Rebuild images with latest code
docker compose build --no-cache

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Quick Restart (No Code Changes)

```bash
# Restart specific service
docker compose restart backend
docker compose restart frontend

# Or restart all
docker compose restart
```

### Rebuild Only One Service

```bash
# Backend only
docker compose build backend
docker compose up -d backend

# Frontend only  
docker compose build frontend
docker compose up -d frontend
```

### Check Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last N lines
docker compose logs backend --tail 50
```

### Service URLs

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- InfluxDB: http://localhost:8086

### Troubleshooting

```bash
# Check service status
docker compose ps

# Inspect specific container
docker inspect reeflab-backend

# Execute commands in container
docker compose exec backend bash
docker compose exec frontend sh

# View resource usage
docker stats

# Clean up everything (WARNING: deletes volumes/data)
docker compose down -v
```

### Git Workflow

```bash
# 1. Make changes
# 2. Test locally

# 3. Commit
git add -A
git commit -m "Your message"

# 4. Push to remote (triggers GitHub Actions CI/CD)
git push origin main

# 5. Rebuild local containers
docker compose build
docker compose up -d
```

## Production Deployment

### Using Docker Compose (Remote Server)

```bash
# SSH to server
ssh user@server

# Pull latest code
cd /path/to/reeflab
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Check logs
docker compose logs -f
```

### Environment Variables

Create `.env` file with:
```
POSTGRES_USER=reeflab
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://reeflab:password@postgres:5432/reeflab

INFLUXDB_ADMIN_TOKEN=your-influxdb-token
INFLUXDB_ORG=reeflab
INFLUXDB_BUCKET=reef_parameters

SECRET_KEY=your-secret-key-change-in-production
VITE_API_URL=http://localhost:8000
```

## CI/CD (GitHub Actions)

Workflow automatically runs on push:
- Backend tests (pytest)
- Frontend build (TypeScript + Vite)
- Docker image builds

Check status: https://github.com/yourusername/reeflab/actions
